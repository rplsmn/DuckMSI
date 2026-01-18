# SQL Templates & Macros Architecture v2

This document describes the redesigned template system for DuckMSI with:
- **Separation of concerns**: Pure SQL files + TOML metadata registry
- **Global table definitions**: Centralized schema for ~20 expected PMSI tables
- **Dynamic macro regeneration**: Table name remapping at runtime
- **Dependency tracking**: Templates only available when required tables exist

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SOURCE OF TRUTH (Development Time)                                          │
│                                                                             │
│   macros.toml                    +    *.sql files                           │
│   ├── [tables.*] definitions          └── Pure SELECT statements            │
│   └── [macros.*] metadata                 with {{placeholder}} syntax       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          Vite Build Plugin
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMPILED OUTPUT (Build Time)                                                │
│                                                                             │
│   macro-registry.js              →    Importable ES module with:            │
│                                       - Table definitions                   │
│                                       - Macro metadata + SQL templates      │
│                                       - Helper functions                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                              App Startup
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ RUNTIME (DuckDB)                                                            │
│                                                                             │
│   1. Load registry into DuckDB metadata tables                              │
│   2. User uploads "fixe.parquet" → map to placeholder "fixe"                │
│   3. Generate macro SQL: CREATE OR REPLACE MACRO get_casemix() AS TABLE ... │
│   4. Register macro with DuckDB                                             │
│   5. User renames table → regenerate affected macros                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/modules/templates/
├── macros.toml                 # Central registry (tables + macros metadata)
├── sql/                        # Pure SQL files (SELECT only, no CREATE MACRO)
│   ├── casemix.sql
│   ├── top_ghm.sql
│   ├── activity_monthly.sql
│   └── ...
│
├── macro-registry.js           # Generated at build time (DO NOT EDIT)
├── macro-loader.js             # Runtime: registers macros with DuckDB
├── macro-generator.js          # Runtime: constructs CREATE MACRO SQL
├── table-mapper.js             # Runtime: manages user table mappings
│
├── templates.js                # Template registry for command palette
├── categories.js               # Category definitions
└── data/                       # Template UI metadata
    └── ...
```

---

## 1. TOML Registry Format

### `macros.toml`

```toml
# =============================================================================
# TABLE DEFINITIONS
# =============================================================================
# Define all expected PMSI tables with their metadata.
# Users will map their uploaded files to these logical table names.

[tables.fixe]
description = "Table des sejours MCO (fichier FIX)"
expected_columns = ["ghm", "ghm2", "dp", "dr", "das", "sejour_id", "date_entree", "date_sortie"]
category = "mco"

[tables.rss]
description = "Resume de sortie standardise"
expected_columns = ["sejour_id", "rum_id", "dp", "dr"]
category = "mco"

[tables.rum]
description = "Resume d'unite medicale"
expected_columns = ["rum_id", "sejour_id", "um", "date_entree", "date_sortie"]
category = "mco"

[tables.diag]
description = "Diagnostics associes"
expected_columns = ["sejour_id", "diag_code", "diag_type"]
category = "mco"

[tables.acte]
description = "Actes CCAM"
expected_columns = ["sejour_id", "acte_code", "date_acte", "activite"]
category = "mco"

# ... more table definitions (up to ~20)

# =============================================================================
# MACRO DEFINITIONS
# =============================================================================
# Each macro references a SQL file and declares its table dependencies.
# The SQL file contains only the SELECT statement with {{placeholder}} syntax.

[macros.get_casemix]
name = "Casemix (GHM Distribution)"
description = "Count GHM codes excluding CMD 90 (error codes)"
category = "casemix"
sql_file = "casemix.sql"
depends_on = ["fixe"]
# No parameters - this macro takes no arguments

[macros.get_top_ghm]
name = "Top N GHM Codes"
description = "Most frequent GHM codes by count"
category = "casemix"
sql_file = "top_ghm.sql"
depends_on = ["fixe"]
parameters = [
    { name = "n", type = "integer", default = 10, description = "Number of results" }
]

[macros.get_activity_monthly]
name = "Monthly Activity"
description = "Activity breakdown by month across stays and procedures"
category = "activity"
sql_file = "activity_monthly.sql"
depends_on = ["fixe", "acte"]  # Multiple dependencies
parameters = [
    { name = "year", type = "integer", description = "Year to filter" }
]

[macros.get_sejour_details]
name = "Stay Details with Diagnoses"
description = "Full stay information joined with diagnoses"
category = "exploration"
sql_file = "sejour_details.sql"
depends_on = ["fixe", "diag", "acte"]  # Three table dependencies
```

---

## 2. SQL Files with Placeholders

SQL files contain **only the SELECT statement**, not the `CREATE MACRO` wrapper. Table names use `{{placeholder}}` syntax for dynamic replacement.

### `sql/casemix.sql`

```sql
-- Macro: get_casemix
-- Dependencies: fixe

SELECT
    ghm2,
    COUNT(*) AS effectif
FROM {{fixe}}
WHERE SUBSTR(ghm2, 1, 2) != '90'
GROUP BY ghm2
ORDER BY ghm2 ASC
```

### `sql/top_ghm.sql`

```sql
-- Macro: get_top_ghm
-- Dependencies: fixe
-- Parameters: n (integer)

SELECT
    ghm2,
    COUNT(*) AS effectif
FROM {{fixe}}
GROUP BY ghm2
ORDER BY effectif DESC
LIMIT {{n}}
```

### `sql/activity_monthly.sql`

```sql
-- Macro: get_activity_monthly
-- Dependencies: fixe, acte
-- Parameters: year (integer)

SELECT
    EXTRACT(MONTH FROM f.date_entree) AS mois,
    COUNT(DISTINCT f.sejour_id) AS nb_sejours,
    COUNT(DISTINCT a.acte_code) AS nb_actes_distincts,
    COUNT(a.acte_code) AS nb_actes_total
FROM {{fixe}} f
LEFT JOIN {{acte}} a ON f.sejour_id = a.sejour_id
WHERE EXTRACT(YEAR FROM f.date_entree) = {{year}}
GROUP BY 1
ORDER BY 1
```

---

## 3. Build-Time Compilation

A Vite plugin reads `macros.toml` and SQL files, then generates `macro-registry.js`.

### `vite-plugin-macro-registry.js`

```javascript
import fs from 'fs';
import path from 'path';
import TOML from '@iarna/toml';

export function macroRegistryPlugin() {
    const TEMPLATES_DIR = 'src/modules/templates';
    const TOML_PATH = path.join(TEMPLATES_DIR, 'macros.toml');
    const SQL_DIR = path.join(TEMPLATES_DIR, 'sql');
    const OUTPUT_PATH = path.join(TEMPLATES_DIR, 'macro-registry.js');

    return {
        name: 'macro-registry',
        buildStart() {
            generateRegistry();
        },
        handleHotUpdate({ file }) {
            if (file.endsWith('.toml') || file.endsWith('.sql')) {
                generateRegistry();
            }
        }
    };

    function generateRegistry() {
        // 1. Parse TOML
        const tomlContent = fs.readFileSync(TOML_PATH, 'utf-8');
        const config = TOML.parse(tomlContent);

        // 2. Read SQL files and attach to macros
        const macros = {};
        for (const [macroId, macroDef] of Object.entries(config.macros)) {
            const sqlPath = path.join(SQL_DIR, macroDef.sql_file);
            const sqlTemplate = fs.readFileSync(sqlPath, 'utf-8');

            macros[macroId] = {
                ...macroDef,
                id: macroId,
                sqlTemplate: sqlTemplate.trim()
            };
        }

        // 3. Generate JS module
        const output = `
// AUTO-GENERATED FILE - DO NOT EDIT
// Generated from macros.toml + sql/*.sql files
// Regenerate with: npm run build

export const tables = ${JSON.stringify(config.tables, null, 2)};

export const macros = ${JSON.stringify(macros, null, 2)};

/**
 * Get macros that are available given the currently loaded tables
 * @param {Set<string>} loadedTables - Set of table placeholder names that are mapped
 * @returns {Object[]} - Array of available macro definitions
 */
export function getAvailableMacros(loadedTables) {
    return Object.values(macros).filter(macro =>
        macro.depends_on.every(dep => loadedTables.has(dep))
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
`;

        fs.writeFileSync(OUTPUT_PATH, output);
        console.log('[macro-registry] Generated macro-registry.js');
    }
}
```

### Register in `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import { macroRegistryPlugin } from './vite-plugin-macro-registry.js';

export default defineConfig({
    plugins: [
        macroRegistryPlugin()
    ]
});
```

---

## 4. Runtime: Macro Generation

### `macro-generator.js`

```javascript
/**
 * Generate the full CREATE MACRO SQL from a template
 * @param {Object} macro - Macro definition from registry
 * @param {Object} tableMappings - Map of placeholder -> actual table name
 * @param {Object} paramValues - Map of parameter name -> value (optional)
 * @returns {string} - Complete CREATE OR REPLACE MACRO SQL
 */
export function generateMacroSQL(macro, tableMappings, paramValues = {}) {
    let sql = macro.sqlTemplate;

    // 1. Replace table placeholders: {{fixe}} -> actual_table_name
    for (const [placeholder, actualTable] of Object.entries(tableMappings)) {
        const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
        sql = sql.replace(regex, actualTable);
    }

    // 2. Build parameter list for macro signature
    const params = macro.parameters || [];
    const paramSignature = params.map(p => p.name).join(', ');

    // 3. Replace parameter placeholders if default values exist
    for (const param of params) {
        if (param.default !== undefined && paramValues[param.name] === undefined) {
            const regex = new RegExp(`\\{\\{${param.name}\\}\\}`, 'g');
            sql = sql.replace(regex, param.default);
        }
    }

    // 4. Wrap in CREATE MACRO
    const macroSQL = `
CREATE OR REPLACE MACRO ${macro.id}(${paramSignature}) AS TABLE
${sql}
    `.trim();

    return macroSQL;
}

/**
 * Generate invocation SQL for the command palette
 * @param {Object} macro - Macro definition
 * @returns {string} - SQL to call the macro, e.g., "SELECT * FROM get_casemix()"
 */
export function generateMacroInvocation(macro) {
    const params = macro.parameters || [];

    if (params.length === 0) {
        return `SELECT * FROM ${macro.id}()`;
    }

    // Use placeholders for parameters that need user input
    const paramList = params.map(p => {
        if (p.default !== undefined) {
            return p.default;
        }
        return `{${p.name}}`; // Placeholder for user to fill
    }).join(', ');

    return `SELECT * FROM ${macro.id}(${paramList})`;
}
```

---

## 5. Runtime: Table Mapping

### `table-mapper.js`

```javascript
import { tables, getMacrosByDependency } from './macro-registry.js';
import { generateMacroSQL } from './macro-generator.js';

/**
 * Manages the mapping between expected table placeholders and actual uploaded tables
 */
export class TableMapper {
    constructor() {
        // Map of placeholder -> actual table name
        this.mappings = new Map();

        // Callbacks for when mappings change
        this.listeners = new Set();
    }

    /**
     * Get all expected table definitions
     */
    getExpectedTables() {
        return tables;
    }

    /**
     * Map an uploaded table to an expected placeholder
     * @param {string} placeholder - Expected table name (e.g., 'fixe')
     * @param {string} actualTable - Actual uploaded table name (e.g., 'pmsi_fixe_2024')
     */
    mapTable(placeholder, actualTable) {
        this.mappings.set(placeholder, actualTable);
        this._notifyListeners('map', placeholder, actualTable);
    }

    /**
     * Remove a mapping (when table is unloaded)
     * @param {string} placeholder - The placeholder to unmap
     */
    unmapTable(placeholder) {
        this.mappings.delete(placeholder);
        this._notifyListeners('unmap', placeholder);
    }

    /**
     * Get the actual table name for a placeholder
     * @param {string} placeholder
     * @returns {string|undefined}
     */
    getActualTable(placeholder) {
        return this.mappings.get(placeholder);
    }

    /**
     * Get all current mappings as a plain object
     * @returns {Object}
     */
    getAllMappings() {
        return Object.fromEntries(this.mappings);
    }

    /**
     * Get the set of mapped placeholder names
     * @returns {Set<string>}
     */
    getMappedPlaceholders() {
        return new Set(this.mappings.keys());
    }

    /**
     * Check if a placeholder is mapped
     * @param {string} placeholder
     * @returns {boolean}
     */
    isMapped(placeholder) {
        return this.mappings.has(placeholder);
    }

    /**
     * Auto-detect mapping based on uploaded table name
     * If user uploads "fixe.parquet", automatically map to "fixe" placeholder
     * @param {string} uploadedTableName
     * @returns {string|null} - The placeholder it was mapped to, or null
     */
    autoMap(uploadedTableName) {
        const normalized = uploadedTableName.toLowerCase();

        for (const placeholder of Object.keys(tables)) {
            if (normalized === placeholder ||
                normalized.includes(placeholder) ||
                placeholder.includes(normalized)) {
                this.mapTable(placeholder, uploadedTableName);
                return placeholder;
            }
        }

        return null;
    }

    /**
     * Subscribe to mapping changes
     * @param {Function} callback - Called with (event, placeholder, actualTable?)
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _notifyListeners(event, placeholder, actualTable) {
        for (const listener of this.listeners) {
            listener(event, placeholder, actualTable);
        }
    }
}
```

---

## 6. Runtime: Macro Registration

### `macro-loader.js`

```javascript
import { macros, getAvailableMacros, getMacrosByDependency } from './macro-registry.js';
import { generateMacroSQL } from './macro-generator.js';
import { TableMapper } from './table-mapper.js';

/**
 * Manages macro registration with DuckDB
 */
export class MacroLoader {
    constructor(connection, tableMapper) {
        this.connection = connection;
        this.tableMapper = tableMapper;
        this.registeredMacros = new Set();

        // Re-register affected macros when table mappings change
        this.tableMapper.subscribe((event, placeholder) => {
            this._handleMappingChange(event, placeholder);
        });
    }

    /**
     * Register all macros that have their dependencies satisfied
     */
    async registerAvailableMacros() {
        const mappedTables = this.tableMapper.getMappedPlaceholders();
        const available = getAvailableMacros(mappedTables);

        for (const macro of available) {
            await this.registerMacro(macro.id);
        }
    }

    /**
     * Register a specific macro with DuckDB
     * @param {string} macroId
     */
    async registerMacro(macroId) {
        const macro = macros[macroId];
        if (!macro) {
            throw new Error(`Unknown macro: ${macroId}`);
        }

        // Check all dependencies are mapped
        const mappings = this.tableMapper.getAllMappings();
        for (const dep of macro.depends_on) {
            if (!mappings[dep]) {
                console.warn(`Cannot register ${macroId}: missing dependency "${dep}"`);
                return false;
            }
        }

        // Generate and execute CREATE MACRO SQL
        const sql = generateMacroSQL(macro, mappings);

        try {
            await this.connection.query(sql);
            this.registeredMacros.add(macroId);
            console.log(`Registered macro: ${macroId}`);
            return true;
        } catch (error) {
            console.error(`Failed to register macro ${macroId}:`, error);
            return false;
        }
    }

    /**
     * Unregister a macro from DuckDB
     * @param {string} macroId
     */
    async unregisterMacro(macroId) {
        try {
            await this.connection.query(`DROP MACRO IF EXISTS ${macroId}`);
            this.registeredMacros.delete(macroId);
            console.log(`Unregistered macro: ${macroId}`);
        } catch (error) {
            console.error(`Failed to unregister macro ${macroId}:`, error);
        }
    }

    /**
     * Handle table mapping changes - re-register affected macros
     */
    async _handleMappingChange(event, placeholder) {
        const affectedMacros = getMacrosByDependency(placeholder);

        if (event === 'map') {
            // New table mapped - register macros that now have all dependencies
            for (const macro of affectedMacros) {
                await this.registerMacro(macro.id);
            }
        } else if (event === 'unmap') {
            // Table unmapped - unregister macros that lost a dependency
            for (const macro of affectedMacros) {
                if (this.registeredMacros.has(macro.id)) {
                    await this.unregisterMacro(macro.id);
                }
            }
        }
    }

    /**
     * Get list of currently registered macro IDs
     * @returns {string[]}
     */
    getRegisteredMacros() {
        return Array.from(this.registeredMacros);
    }

    /**
     * Check if a macro is currently registered
     * @param {string} macroId
     * @returns {boolean}
     */
    isRegistered(macroId) {
        return this.registeredMacros.has(macroId);
    }
}
```

---

## 7. Integration with App

### App Startup Flow

```javascript
// src/main.js

import { TableMapper } from './modules/templates/table-mapper.js';
import { MacroLoader } from './modules/templates/macro-loader.js';
import { tables } from './modules/templates/macro-registry.js';

let tableMapper;
let macroLoader;

async function initializeApp() {
    // 1. Initialize DuckDB
    const db = await initDuckDB();
    const connection = await db.connect();

    // 2. Initialize table mapper
    tableMapper = new TableMapper();

    // 3. Initialize macro loader (subscribes to table mapper)
    macroLoader = new MacroLoader(connection, tableMapper);

    // 4. Show user expected tables for upload
    displayExpectedTables(tables);

    // 5. Continue with rest of app initialization
    // ...
}

// When user uploads a file
async function handleFileUpload(file, tableName) {
    // ... existing upload logic ...

    // Auto-map if table name matches an expected table
    const mappedTo = tableMapper.autoMap(tableName);

    if (mappedTo) {
        console.log(`Auto-mapped "${tableName}" to expected table "${mappedTo}"`);
        // Macros depending on this table are now automatically registered
    } else {
        // Show UI to let user manually map this table
        showTableMappingDialog(tableName, tables);
    }
}

// When user renames a table
async function handleTableRename(oldName, newName) {
    // ... existing rename logic ...

    // Find which placeholder this table was mapped to
    for (const [placeholder, actualTable] of tableMapper.getAllMappings()) {
        if (actualTable === oldName) {
            // Update the mapping - macros are automatically re-registered
            tableMapper.mapTable(placeholder, newName);
            break;
        }
    }
}
```

---

## 8. Template Palette Integration

The command palette queries available macros based on current table mappings.

```javascript
// src/modules/templates/templates.js

import { macros, getAvailableMacros } from './macro-registry.js';
import { generateMacroInvocation } from './macro-generator.js';

/**
 * Get templates for the command palette
 * Only returns templates whose macros have all dependencies satisfied
 * @param {Set<string>} mappedTables - Currently mapped table placeholders
 * @returns {Object[]} - Array of template objects for the palette
 */
export function getTemplatesForPalette(mappedTables) {
    const available = getAvailableMacros(mappedTables);

    return available.map(macro => ({
        id: macro.id,
        title: macro.name,
        description: macro.description,
        category: macro.category,
        sql: generateMacroInvocation(macro),
        parameters: macro.parameters || [],
        depends_on: macro.depends_on
    }));
}

/**
 * Get all templates (including unavailable) with availability status
 * Useful for showing "upload X to unlock this template"
 * @param {Set<string>} mappedTables
 * @returns {Object[]}
 */
export function getAllTemplatesWithStatus(mappedTables) {
    return Object.values(macros).map(macro => {
        const missingDeps = macro.depends_on.filter(dep => !mappedTables.has(dep));

        return {
            id: macro.id,
            title: macro.name,
            description: macro.description,
            category: macro.category,
            sql: generateMacroInvocation(macro),
            parameters: macro.parameters || [],
            depends_on: macro.depends_on,
            available: missingDeps.length === 0,
            missingDependencies: missingDeps
        };
    });
}
```

---

## 9. Adding New Macros (Developer Workflow)

### Quick Reference

| Task | File to Edit |
|------|--------------|
| Define new expected table | `macros.toml` → `[tables.xxx]` |
| Add new macro | `macros.toml` → `[macros.xxx]` + create `sql/xxx.sql` |
| Modify macro SQL | Edit `sql/xxx.sql` |
| Change macro metadata | Edit `macros.toml` |

### Step-by-Step: Adding a New Macro

1. **Create the SQL file** (`sql/sejour_by_cmd.sql`)
   ```sql
   -- Macro: get_sejour_by_cmd
   -- Dependencies: fixe
   -- Parameters: cmd (string)

   SELECT *
   FROM {{fixe}}
   WHERE SUBSTR(ghm2, 1, 2) = {{cmd}}
   ORDER BY date_entree DESC
   ```

2. **Add to TOML registry** (`macros.toml`)
   ```toml
   [macros.get_sejour_by_cmd]
   name = "Stays by CMD"
   description = "Filter stays by CMD code (first 2 chars of GHM)"
   category = "exploration"
   sql_file = "sejour_by_cmd.sql"
   depends_on = ["fixe"]
   parameters = [
       { name = "cmd", type = "string", description = "CMD code (e.g., '01', '05')" }
   ]
   ```

3. **Rebuild** - The Vite plugin automatically regenerates `macro-registry.js`

4. **Test** - Upload a file mapped to "fixe" and verify the template appears

---

## 10. User Table Mapping UI

When a user uploads a file that doesn't auto-map, show a dialog:

```
┌─────────────────────────────────────────────────────────────────┐
│ Map Uploaded Table                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ You uploaded: pmsi_data_2024.parquet                            │
│                                                                 │
│ Which PMSI table does this represent?                           │
│                                                                 │
│   ○ fixe  - Table des sejours MCO (fichier FIX)                 │
│   ○ rss   - Resume de sortie standardise                        │
│   ○ rum   - Resume d'unite medicale                             │
│   ○ diag  - Diagnostics associes                                │
│   ○ acte  - Actes CCAM                                          │
│   ○ (none) - Don't map to a template table                      │
│                                                                 │
│                              [Cancel]  [Map Table]              │
└─────────────────────────────────────────────────────────────────┘
```

This unlocks templates that depend on the mapped table.

---

## 11. Expected Tables Overview UI

Show users what tables are expected and how many templates each unlocks:

```
┌─────────────────────────────────────────────────────────────────┐
│ Expected PMSI Tables                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Upload these tables to unlock analysis templates:               │
│                                                                 │
│   ☑ fixe  - Table des sejours MCO           (45 templates)      │
│   ☐ rss   - Resume de sortie standardise    (12 templates)      │
│   ☐ rum   - Resume d'unite medicale         (8 templates)       │
│   ☐ diag  - Diagnostics associes            (15 templates)      │
│   ☐ acte  - Actes CCAM                      (20 templates)      │
│                                                                 │
│ ☑ = mapped, ☐ = not yet uploaded                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| `macros.toml` | Source of truth: table definitions + macro metadata |
| `sql/*.sql` | Pure SELECT statements with `{{placeholder}}` syntax |
| `macro-registry.js` | Build-time generated ES module |
| `macro-generator.js` | Constructs `CREATE MACRO` SQL at runtime |
| `table-mapper.js` | Maps uploaded tables to expected placeholders |
| `macro-loader.js` | Registers/unregisters macros with DuckDB |
| `templates.js` | Provides templates to command palette |

**Key Features:**
- Same SQL can be reused with different table names
- Macros auto-register when dependencies are satisfied
- Macros auto-update when tables are renamed
- Users see which tables to upload for which templates
- TOML is human-readable and supports arrays naturally
