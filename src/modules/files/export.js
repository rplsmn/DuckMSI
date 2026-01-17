import { CONFIG } from '../shared/constants.js';

/**
 * Escape a cell value for CSV format (RFC 4180)
 * @param {*} cell - Cell value
 * @returns {string} - Escaped string
 */
export function escapeCSVCell(cell) {
  if (cell === null || cell === undefined) {
    return '';
  }
  const str = String(cell);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Convert query results to CSV format
 * @param {Object} data - { columns: string[], rows: any[][] }
 * @returns {string} - CSV string
 */
export function convertToCSV(data) {
  if (!data || !data.columns || !data.rows) {
    return '';
  }

  const headerRow = data.columns.join(',');
  const dataRows = data.rows.map(row =>
    row.map(cell => escapeCSVCell(cell)).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate a timestamped filename
 * @param {string} [prefix] - Filename prefix
 * @param {string} [extension='.csv'] - File extension
 * @returns {string} - Generated filename
 */
export function generateFilename(prefix = CONFIG.DEFAULT_EXPORT_FILENAME, extension = '.csv') {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return `${prefix}_${timestamp}${extension}`;
}

/**
 * Trigger a file download in the browser
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} [mimeType='text/csv'] - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Export query results to a CSV file
 * @param {Object} data - { columns: string[], rows: any[][] }
 * @param {string} [filename] - Optional filename (without extension)
 */
export function exportToCSV(data, filename) {
  const csv = convertToCSV(data);
  if (!csv) {
    throw new Error('No data to export');
  }

  let finalFilename = filename || CONFIG.DEFAULT_EXPORT_FILENAME;
  if (!finalFilename.endsWith('.csv')) {
    finalFilename += '.csv';
  }

  downloadFile(csv, finalFilename);
}
