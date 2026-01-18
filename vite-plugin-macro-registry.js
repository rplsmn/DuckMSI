/**
 * Vite Plugin: Macro Registry Generator
 *
 * Reads macros.toml and SQL files at build time,
 * generates a JavaScript module with all macro definitions.
 */

import fs from 'fs';
import path from 'path';
import TOML from '@iarna/toml';

const TEMPLATES_DIR = 'src/modules/templates';
const TOML_PATH = path.join(TEMPLATES_DIR, 'macros.toml');
const SQL_DIR = path.join(TEMPLATES_DIR, 'sql');
const OUTPUT_PATH = path.join(TEMPLATES_DIR, 'macro-registry.js');

/**
 * Generate the macro registry JavaScript module
 */
function generateRegistry() {
    // Check if TOML file exists
    if (!fs.existsSync(TOML_PATH)) {
        console.warn('[macro-registry] macros.toml not found, skipping generation');
        return false;
    }

    try {
        // 1. Parse TOML
        const tomlContent = fs.readFileSync(TOML_PATH, 'utf-8');
        const config = TOML.parse(tomlContent);

        // 2. Read SQL files and attach to macros
        const macros = {};
        const macroEntries = config.macros || {};

        for (const [macroId, macroDef] of Object.entries(macroEntries)) {
            const sqlPath = path.join(SQL_DIR, macroDef.sql_file);

            if (!fs.existsSync(sqlPath)) {
                console.warn(`[macro-registry] SQL file not found: ${sqlPath}`);
                continue;
            }

            const sqlTemplate = fs.readFileSync(sqlPath, 'utf-8');

            macros[macroId] = {
                ...macroDef,
                id: macroId,
                sqlTemplate: sqlTemplate.trim()
            };
        }

        // 3. Generate JS module
        const output = `// AUTO-GENERATED FILE - DO NOT EDIT
// Generated from macros.toml + sql/*.sql files
// Regenerate by modifying source files (Vite will auto-rebuild)

export const tables = ${JSON.stringify(config.tables || {}, null, 2)};

export const macros = ${JSON.stringify(macros, null, 2)};

/**
 * Get macros that are available given the currently mapped tables
 * @param {Set<string>|Array<string>} mappedTables - Set or array of table placeholder names that are mapped
 * @returns {Object[]} - Array of available macro definitions
 */
export function getAvailableMacros(mappedTables) {
    const tableSet = mappedTables instanceof Set ? mappedTables : new Set(mappedTables);
    return Object.values(macros).filter(macro =>
        macro.depends_on.every(dep => tableSet.has(dep))
    );
}

/**
 * Get macros that depend on a specific table
 * @param {string} tablePlaceholder - The table placeholder name (e.g., 'fixe')
 * @returns {Object[]} - Array of macro definitions that depend on this table
 */
export function getMacrosByDependency(tablePlaceholder) {
    return Object.values(macros).filter(macro =>
        macro.depends_on.includes(tablePlaceholder)
    );
}

/**
 * Get all table definitions
 * @returns {Object} - All table definitions keyed by placeholder
 */
export function getTableDefinitions() {
    return tables;
}

/**
 * Get a specific macro by ID
 * @param {string} macroId - The macro ID
 * @returns {Object|undefined} - The macro definition or undefined
 */
export function getMacroById(macroId) {
    return macros[macroId];
}

/**
 * Get count of macros that depend on each table
 * @returns {Object} - Map of table placeholder -> count of dependent macros
 */
export function getMacroCountByTable() {
    const counts = {};
    for (const tableName of Object.keys(tables)) {
        counts[tableName] = getMacrosByDependency(tableName).length;
    }
    return counts;
}
`;

        fs.writeFileSync(OUTPUT_PATH, output);
        console.log(`[macro-registry] Generated ${OUTPUT_PATH} with ${Object.keys(macros).length} macros`);
        return true;

    } catch (error) {
        console.error('[macro-registry] Failed to generate registry:', error);
        return false;
    }
}

/**
 * Vite plugin export
 */
export function macroRegistryPlugin() {
    return {
        name: 'macro-registry',

        // Generate on build start
        buildStart() {
            generateRegistry();
        },

        // Watch for changes and regenerate
        handleHotUpdate({ file, server }) {
            const relativePath = path.relative(process.cwd(), file);

            // Check if the changed file is in our templates directory
            if (relativePath.startsWith(TEMPLATES_DIR)) {
                if (file.endsWith('.toml') || file.endsWith('.sql')) {
                    console.log(`[macro-registry] Detected change in ${relativePath}`);
                    if (generateRegistry()) {
                        // Trigger HMR for the generated file
                        const mod = server.moduleGraph.getModuleById(
                            path.resolve(OUTPUT_PATH)
                        );
                        if (mod) {
                            server.moduleGraph.invalidateModule(mod);
                            return [mod];
                        }
                    }
                }
            }
        },

        // Also generate on config resolution (for dev server start)
        configResolved() {
            generateRegistry();
        }
    };
}

export default macroRegistryPlugin;
