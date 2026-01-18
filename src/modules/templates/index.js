/**
 * Templates Module Index
 *
 * Main entry point for the template system.
 */

// Registry (auto-generated)
export {
    tables,
    macros,
    getAvailableMacros,
    getMacrosByDependency,
    getTableDefinitions,
    getMacroById,
    getMacroCountByTable
} from './macro-registry.js';

// Macro generation
export {
    generateMacroSQL,
    generateMacroInvocation,
    extractPlaceholders,
    validateMacroMappings
} from './macro-generator.js';

// Table mapping
export {
    TableMapper,
    getTableMapper
} from './table-mapper.js';

// Macro loading
export {
    MacroLoader,
    getMacroLoader,
    resetMacroLoader
} from './macro-loader.js';

// Template utilities
export {
    CATEGORIES,
    getTemplatesForPalette,
    getAllTemplatesWithStatus,
    getTemplatesByCategory,
    searchTemplates,
    getExpectedTablesWithCounts,
    getAvailabilitySummary
} from './templates.js';
