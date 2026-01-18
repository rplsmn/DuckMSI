/**
 * Macro Generator
 *
 * Generates DuckDB CREATE MACRO SQL statements from templates.
 * Handles placeholder replacement and parameter management.
 */

/**
 * Generate the full CREATE MACRO SQL from a template
 * @param {Object} macro - Macro definition from registry
 * @param {Object} tableMappings - Map of placeholder -> actual table name
 * @param {Object} paramValues - Map of parameter name -> value (optional)
 * @returns {string} - Complete CREATE OR REPLACE MACRO SQL
 */
export function generateMacroSQL(macro, tableMappings, paramValues = {}) {
    let sql = macro.sqlTemplate;

    // Remove SQL comments (lines starting with --)
    sql = sql.split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();

    // 1. Replace table placeholders: {{fixe}} -> actual_table_name
    for (const [placeholder, actualTable] of Object.entries(tableMappings)) {
        const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
        sql = sql.replace(regex, actualTable);
    }

    // 2. Build parameter list for macro signature
    const params = macro.parameters || [];
    const paramSignature = params.map(p => p.name).join(', ');

    // 3. Replace parameter placeholders with macro parameter references
    // Parameters in the SQL become references to the macro parameters
    for (const param of params) {
        const regex = new RegExp(`\\{\\{${param.name}\\}\\}`, 'g');
        // In DuckDB macros, parameters are referenced directly by name
        sql = sql.replace(regex, param.name);
    }

    // 4. Wrap in CREATE MACRO
    const macroSQL = `CREATE OR REPLACE MACRO ${macro.id}(${paramSignature}) AS TABLE
${sql}`;

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

    // Use default values or placeholders for parameters
    const paramList = params.map(p => {
        if (p.default !== undefined) {
            return p.default;
        }
        // Use a placeholder that the user can replace
        return `{${p.name}}`;
    }).join(', ');

    return `SELECT * FROM ${macro.id}(${paramList})`;
}

/**
 * Extract table placeholders from a SQL template
 * @param {string} sqlTemplate - SQL template with {{placeholder}} syntax
 * @returns {string[]} - Array of placeholder names found
 */
export function extractPlaceholders(sqlTemplate) {
    const regex = /\{\{(\w+)\}\}/g;
    const placeholders = new Set();
    let match;

    while ((match = regex.exec(sqlTemplate)) !== null) {
        placeholders.add(match[1]);
    }

    return Array.from(placeholders);
}

/**
 * Validate that all required placeholders are mapped
 * @param {Object} macro - Macro definition
 * @param {Object} tableMappings - Current table mappings
 * @returns {{valid: boolean, missing: string[]}} - Validation result
 */
export function validateMacroMappings(macro, tableMappings) {
    const missing = [];

    for (const dep of macro.depends_on) {
        if (!tableMappings[dep]) {
            missing.push(dep);
        }
    }

    return {
        valid: missing.length === 0,
        missing
    };
}
