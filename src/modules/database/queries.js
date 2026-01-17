import { CONFIG } from '../shared/constants.js';

/**
 * Validate SQL query string
 * @param {string} sql - SQL query string
 * @returns {boolean} - Whether the SQL is valid (non-empty)
 */
export function validateSQL(sql) {
  if (sql === null || sql === undefined) {
    return false;
  }
  const trimmed = String(sql).trim();
  return trimmed.length > 0;
}

/**
 * Format query results into a structured format
 * @param {Array} data - Array of row objects from DuckDB
 * @param {number} [limit] - Maximum number of rows to return
 * @returns {Object} - { columns: string[], rows: any[][] }
 */
export function formatQueryResults(data, limit = CONFIG.MAX_RESULT_ROWS) {
  if (!data || data.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = Object.keys(data[0]);
  const rows = data.slice(0, limit).map(row => columns.map(col => row[col]));

  return { columns, rows };
}

/**
 * Create an HTML table element from query results
 * @param {Object} data - { columns: string[], rows: any[][] }
 * @returns {HTMLTableElement}
 */
export function createResultsTable(data) {
  const table = document.createElement('table');
  table.className = 'results-table';

  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of data.columns) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');
  for (const row of data.rows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      td.textContent = cell !== null && cell !== undefined ? String(cell) : 'NULL';
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  return table;
}
