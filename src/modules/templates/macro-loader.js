/**
 * Macro Loader
 *
 * Manages registration of macros with DuckDB.
 * Listens to table mapper changes and automatically registers/unregisters macros.
 */

import { macros, getAvailableMacros, getMacrosByDependency } from './macro-registry.js';
import { generateMacroSQL } from './macro-generator.js';

/**
 * MacroLoader class
 * Handles macro registration lifecycle with DuckDB
 */
export class MacroLoader {
    /**
     * @param {Object} connection - DuckDB connection
     * @param {TableMapper} tableMapper - TableMapper instance
     */
    constructor(connection, tableMapper) {
        this.connection = connection;
        this.tableMapper = tableMapper;
        this.registeredMacros = new Set();
        this.unsubscribe = null;

        // Subscribe to table mapping changes
        this._setupMappingListener();
    }

    /**
     * Set up listener for table mapping changes
     * @private
     */
    _setupMappingListener() {
        this.unsubscribe = this.tableMapper.subscribe(async (event, placeholder) => {
            await this._handleMappingChange(event, placeholder);
        });
    }

    /**
     * Handle table mapping changes - register or unregister affected macros
     * @private
     */
    async _handleMappingChange(event, placeholder) {
        const affectedMacros = getMacrosByDependency(placeholder);

        if (event === 'map') {
            // New table mapped - try to register macros that depend on it
            for (const macro of affectedMacros) {
                await this.registerMacro(macro.id);
            }
        } else if (event === 'unmap') {
            // Table unmapped - unregister macros that depend on it
            for (const macro of affectedMacros) {
                if (this.registeredMacros.has(macro.id)) {
                    await this.unregisterMacro(macro.id);
                }
            }
        }
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
     * @param {string} macroId - The macro ID
     * @returns {boolean} - Whether registration succeeded
     */
    async registerMacro(macroId) {
        const macro = macros[macroId];
        if (!macro) {
            console.error(`Unknown macro: ${macroId}`);
            return false;
        }

        // Check all dependencies are mapped
        const mappings = this.tableMapper.getAllMappings();
        for (const dep of macro.depends_on) {
            if (!mappings[dep]) {
                console.debug(`Cannot register ${macroId}: missing dependency "${dep}"`);
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
     * @param {string} macroId - The macro ID
     */
    async unregisterMacro(macroId) {
        try {
            // DuckDB uses DROP MACRO TABLE for table-producing macros
            await this.connection.query(`DROP MACRO TABLE IF EXISTS ${macroId}`);
            this.registeredMacros.delete(macroId);
            console.log(`Unregistered macro: ${macroId}`);
        } catch (error) {
            // Try alternate syntax
            try {
                await this.connection.query(`DROP MACRO IF EXISTS ${macroId}`);
                this.registeredMacros.delete(macroId);
                console.log(`Unregistered macro: ${macroId}`);
            } catch (error2) {
                console.error(`Failed to unregister macro ${macroId}:`, error2);
            }
        }
    }

    /**
     * Re-register a macro (useful after table rename)
     * @param {string} macroId - The macro ID
     */
    async reregisterMacro(macroId) {
        if (this.registeredMacros.has(macroId)) {
            // Unregister first, then register with new mappings
            await this.unregisterMacro(macroId);
        }
        return await this.registerMacro(macroId);
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

    /**
     * Get macros that could be registered if certain tables were uploaded
     * @returns {Object[]} - Array of {macro, missingTables}
     */
    getPendingMacros() {
        const mappedTables = this.tableMapper.getMappedPlaceholders();

        return Object.values(macros)
            .filter(macro => !this.registeredMacros.has(macro.id))
            .map(macro => ({
                macro,
                missingTables: macro.depends_on.filter(dep => !mappedTables.has(dep))
            }))
            .filter(item => item.missingTables.length > 0);
    }

    /**
     * Clean up: unsubscribe from table mapper and unregister all macros
     */
    async dispose() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        for (const macroId of this.registeredMacros) {
            await this.unregisterMacro(macroId);
        }
    }
}

// Singleton instance
let macroLoaderInstance = null;

/**
 * Get or create the MacroLoader instance
 * @param {Object} connection - DuckDB connection
 * @param {TableMapper} tableMapper - TableMapper instance
 * @returns {MacroLoader}
 */
export function getMacroLoader(connection, tableMapper) {
    if (!macroLoaderInstance) {
        macroLoaderInstance = new MacroLoader(connection, tableMapper);
    }
    return macroLoaderInstance;
}

/**
 * Reset the MacroLoader instance (for testing)
 */
export function resetMacroLoader() {
    if (macroLoaderInstance) {
        macroLoaderInstance.dispose();
        macroLoaderInstance = null;
    }
}
