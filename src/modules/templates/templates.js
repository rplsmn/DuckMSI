/**
 * Templates Module
 *
 * Provides templates to the command palette UI.
 * Handles availability checking based on current table mappings.
 */

import { macros, tables, getAvailableMacros, getMacroCountByTable } from './macro-registry.js';
import { generateMacroInvocation } from './macro-generator.js';

/**
 * Template categories for organizing the command palette
 */
export const CATEGORIES = [
    { id: 'casemix', label: 'Casemix', description: 'GHM/GHS analysis' },
    { id: 'activity', label: 'Activity', description: 'Volume and activity metrics' },
    { id: 'exploration', label: 'Exploration', description: 'Data exploration queries' },
    { id: 'quality', label: 'Quality', description: 'Data quality checks' }
];

/**
 * Get templates for the command palette
 * Only returns templates whose macros have all dependencies satisfied
 * @param {Set<string>|Array<string>} mappedTables - Currently mapped table placeholders
 * @returns {Object[]} - Array of template objects for the palette
 */
export function getTemplatesForPalette(mappedTables) {
    const tableSet = mappedTables instanceof Set ? mappedTables : new Set(mappedTables);
    const available = getAvailableMacros(tableSet);

    return available.map(macro => ({
        id: macro.id,
        title: macro.name,
        description: macro.description,
        category: macro.category,
        sql: generateMacroInvocation(macro),
        parameters: macro.parameters || [],
        depends_on: macro.depends_on,
        available: true
    }));
}

/**
 * Get all templates with availability status
 * Useful for showing "upload X to unlock this template"
 * @param {Set<string>|Array<string>} mappedTables - Currently mapped table placeholders
 * @returns {Object[]}
 */
export function getAllTemplatesWithStatus(mappedTables) {
    const tableSet = mappedTables instanceof Set ? mappedTables : new Set(mappedTables);

    return Object.values(macros).map(macro => {
        const missingDeps = macro.depends_on.filter(dep => !tableSet.has(dep));

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

/**
 * Get templates grouped by category
 * @param {Set<string>|Array<string>} mappedTables - Currently mapped table placeholders
 * @param {boolean} includeUnavailable - Whether to include unavailable templates
 * @returns {Object} - Templates grouped by category ID
 */
export function getTemplatesByCategory(mappedTables, includeUnavailable = false) {
    const templates = includeUnavailable
        ? getAllTemplatesWithStatus(mappedTables)
        : getTemplatesForPalette(mappedTables);

    const grouped = {};

    for (const category of CATEGORIES) {
        grouped[category.id] = {
            ...category,
            templates: templates.filter(t => t.category === category.id)
        };
    }

    // Add uncategorized templates
    const uncategorized = templates.filter(t =>
        !CATEGORIES.some(c => c.id === t.category)
    );

    if (uncategorized.length > 0) {
        grouped['other'] = {
            id: 'other',
            label: 'Other',
            description: 'Miscellaneous templates',
            templates: uncategorized
        };
    }

    return grouped;
}

/**
 * Search templates by query string
 * @param {string} query - Search query
 * @param {Set<string>|Array<string>} mappedTables - Currently mapped table placeholders
 * @param {boolean} includeUnavailable - Whether to include unavailable templates
 * @returns {Object[]} - Matching templates
 */
export function searchTemplates(query, mappedTables, includeUnavailable = false) {
    const templates = includeUnavailable
        ? getAllTemplatesWithStatus(mappedTables)
        : getTemplatesForPalette(mappedTables);

    if (!query || query.trim() === '') {
        return templates;
    }

    const lowerQuery = query.toLowerCase();

    return templates.filter(t =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery) ||
        t.id.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get expected tables with template counts
 * Shows users what tables to upload to unlock templates
 * @param {Set<string>|Array<string>} mappedTables - Currently mapped table placeholders
 * @returns {Object[]} - Array of table info with template counts
 */
export function getExpectedTablesWithCounts(mappedTables) {
    const tableSet = mappedTables instanceof Set ? mappedTables : new Set(mappedTables);
    const counts = getMacroCountByTable();

    return Object.entries(tables).map(([placeholder, definition]) => ({
        placeholder,
        description: definition.description,
        category: definition.category,
        expected_columns: definition.expected_columns,
        isMapped: tableSet.has(placeholder),
        templateCount: counts[placeholder] || 0
    }));
}

/**
 * Get a summary of template availability
 * @param {Set<string>|Array<string>} mappedTables - Currently mapped table placeholders
 * @returns {{available: number, total: number, percentage: number}}
 */
export function getAvailabilitySummary(mappedTables) {
    const tableSet = mappedTables instanceof Set ? mappedTables : new Set(mappedTables);
    const total = Object.keys(macros).length;
    const available = getAvailableMacros(tableSet).length;

    return {
        available,
        total,
        percentage: total > 0 ? Math.round((available / total) * 100) : 0
    };
}
