/**
 * Table Mapper
 *
 * Manages the mapping between expected table placeholders (e.g., 'fixe')
 * and actual uploaded table names (e.g., 'pmsi_fixe_2024').
 *
 * Provides auto-mapping, manual mapping, and change notifications.
 */

import { tables } from './macro-registry.js';

/**
 * TableMapper class
 * Manages table mappings with observer pattern for change notifications
 */
export class TableMapper {
    constructor() {
        // Map of placeholder -> actual table name
        this.mappings = new Map();

        // Callbacks for when mappings change
        this.listeners = new Set();
    }

    /**
     * Get all expected table definitions from the registry
     * @returns {Object} - All table definitions keyed by placeholder
     */
    getExpectedTables() {
        return tables;
    }

    /**
     * Map an uploaded table to an expected placeholder
     * @param {string} placeholder - Expected table name (e.g., 'fixe')
     * @param {string} actualTable - Actual uploaded table name
     */
    mapTable(placeholder, actualTable) {
        const previousValue = this.mappings.get(placeholder);
        this.mappings.set(placeholder, actualTable);
        this._notifyListeners('map', placeholder, actualTable, previousValue);
    }

    /**
     * Remove a mapping (when table is unloaded or remapped)
     * @param {string} placeholder - The placeholder to unmap
     */
    unmapTable(placeholder) {
        const previousValue = this.mappings.get(placeholder);
        if (this.mappings.has(placeholder)) {
            this.mappings.delete(placeholder);
            this._notifyListeners('unmap', placeholder, null, previousValue);
        }
    }

    /**
     * Remove mapping by actual table name (useful when table is deleted)
     * @param {string} actualTable - The actual table name to find and unmap
     * @returns {string|null} - The placeholder that was unmapped, or null
     */
    unmapByActualTable(actualTable) {
        for (const [placeholder, mapped] of this.mappings.entries()) {
            if (mapped === actualTable) {
                this.unmapTable(placeholder);
                return placeholder;
            }
        }
        return null;
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
     * Get the placeholder for an actual table name
     * @param {string} actualTable
     * @returns {string|undefined}
     */
    getPlaceholderForTable(actualTable) {
        for (const [placeholder, mapped] of this.mappings.entries()) {
            if (mapped === actualTable) {
                return placeholder;
            }
        }
        return undefined;
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
     * Check if a table is mapped to any placeholder
     * @param {string} actualTable
     * @returns {boolean}
     */
    isTableMapped(actualTable) {
        return Array.from(this.mappings.values()).includes(actualTable);
    }

    /**
     * Auto-detect mapping based on uploaded table name
     * If user uploads "fixe.parquet", automatically map to "fixe" placeholder
     * @param {string} uploadedTableName - The table name (usually sanitized filename)
     * @returns {string|null} - The placeholder it was mapped to, or null if no match
     */
    autoMap(uploadedTableName) {
        const normalized = uploadedTableName.toLowerCase();

        // Try exact match first
        for (const placeholder of Object.keys(tables)) {
            if (normalized === placeholder) {
                this.mapTable(placeholder, uploadedTableName);
                return placeholder;
            }
        }

        // Try partial match (e.g., 'fixe_2024' contains 'fixe')
        for (const placeholder of Object.keys(tables)) {
            if (normalized.includes(placeholder) || placeholder.includes(normalized)) {
                // Only auto-map if not already mapped
                if (!this.isMapped(placeholder)) {
                    this.mapTable(placeholder, uploadedTableName);
                    return placeholder;
                }
            }
        }

        return null;
    }

    /**
     * Update mapping when a table is renamed
     * @param {string} oldName - Previous table name
     * @param {string} newName - New table name
     * @returns {string|null} - The placeholder that was updated, or null
     */
    handleTableRename(oldName, newName) {
        for (const [placeholder, actualTable] of this.mappings.entries()) {
            if (actualTable === oldName) {
                this.mapTable(placeholder, newName);
                return placeholder;
            }
        }
        return null;
    }

    /**
     * Subscribe to mapping changes
     * @param {Function} callback - Called with (event, placeholder, newValue, previousValue)
     * @returns {Function} - Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of a mapping change
     * @private
     */
    _notifyListeners(event, placeholder, newValue, previousValue) {
        for (const listener of this.listeners) {
            try {
                listener(event, placeholder, newValue, previousValue);
            } catch (error) {
                console.error('TableMapper listener error:', error);
            }
        }
    }

    /**
     * Get unmapped expected tables (tables that templates need but aren't mapped yet)
     * @returns {Object[]} - Array of {placeholder, definition} for unmapped tables
     */
    getUnmappedTables() {
        return Object.entries(tables)
            .filter(([placeholder]) => !this.isMapped(placeholder))
            .map(([placeholder, definition]) => ({
                placeholder,
                ...definition
            }));
    }

    /**
     * Clear all mappings
     */
    clearAll() {
        const previousMappings = this.getAllMappings();
        this.mappings.clear();

        // Notify for each unmapped table
        for (const [placeholder, actualTable] of Object.entries(previousMappings)) {
            this._notifyListeners('unmap', placeholder, null, actualTable);
        }
    }
}

// Export singleton instance
let tableMapperInstance = null;

export function getTableMapper() {
    if (!tableMapperInstance) {
        tableMapperInstance = new TableMapper();
    }
    return tableMapperInstance;
}
