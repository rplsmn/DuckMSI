// AUTO-GENERATED FILE - DO NOT EDIT
// Generated from macros.toml + sql/*.sql files
// Regenerate by modifying source files (Vite will auto-rebuild)

export const tables = {
  "fixe": {
    "description": "Table des sejours MCO (fichier FIX)",
    "expected_columns": [
      "ghm",
      "ghm2",
      "dp",
      "dr",
      "das",
      "sejour_id",
      "date_entree",
      "date_sortie"
    ],
    "category": "mco"
  },
  "rss": {
    "description": "Resume de sortie standardise",
    "expected_columns": [
      "sejour_id",
      "rum_id",
      "dp",
      "dr"
    ],
    "category": "mco"
  },
  "rum": {
    "description": "Resume d'unite medicale",
    "expected_columns": [
      "rum_id",
      "sejour_id",
      "um",
      "date_entree",
      "date_sortie"
    ],
    "category": "mco"
  },
  "diag": {
    "description": "Diagnostics associes",
    "expected_columns": [
      "sejour_id",
      "diag_code",
      "diag_type"
    ],
    "category": "mco"
  },
  "acte": {
    "description": "Actes CCAM",
    "expected_columns": [
      "sejour_id",
      "acte_code",
      "date_acte",
      "activite"
    ],
    "category": "mco"
  }
};

export const macros = {
  "get_casemix": {
    "name": "Casemix (GHM Distribution)",
    "description": "Count GHM codes excluding CMD 90 (error codes)",
    "category": "casemix",
    "sql_file": "casemix.sql",
    "depends_on": [
      "fixe"
    ],
    "id": "get_casemix",
    "sqlTemplate": "-- Macro: get_casemix\n-- Dependencies: fixe\n-- Description: Count GHM codes excluding CMD 90 (error codes)\n\nSELECT\n    ghm2,\n    COUNT(*) AS effectif\nFROM {{fixe}}\nWHERE SUBSTR(ghm2, 1, 2) != '90'\nGROUP BY ghm2\nORDER BY ghm2 ASC"
  }
};

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
