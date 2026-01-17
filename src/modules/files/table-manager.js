import { CONFIG } from '../shared/constants.js';

/**
 * Sanitize filename to create SQL-safe table name
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized table name
 */
export function sanitizeTableName(filename) {
  // Remove .parquet extension if present
  let name = filename.replace(/\.parquet$/i, '');

  // Convert to lowercase
  name = name.toLowerCase();

  // Replace non-alphanumeric characters (except underscores) with underscores
  name = name.replace(/[^a-z0-9_]/g, '_');

  // Remove multiple consecutive underscores
  name = name.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  name = name.replace(/^_+|_+$/g, '');

  // If empty or only special chars, use fallback name
  if (name.length === 0) {
    name = CONFIG.TABLE_FALLBACK_NAME;
  }

  return name;
}

/**
 * Generate unique table name by appending suffix if needed
 * @param {string} baseName - Base table name
 * @param {string[]} existingNames - Array of existing table names
 * @returns {string} - Unique table name
 */
export function generateUniqueTableName(baseName, existingNames) {
  // If base name doesn't exist, use it
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  // Find next available suffix
  let suffix = 2;
  let candidate = `${baseName}_${suffix}`;

  while (existingNames.includes(candidate)) {
    suffix++;
    candidate = `${baseName}_${suffix}`;
  }

  return candidate;
}

/**
 * Handle file upload and validate parquet file
 * @param {File} file - File object
 * @returns {Promise<{name: string, buffer: ArrayBuffer}>}
 */
export async function handleFileUpload(file) {
  if (!file.name.endsWith('.parquet')) {
    throw new Error('Only .parquet files are supported');
  }

  const buffer = await file.arrayBuffer();
  return { name: file.name, buffer };
}
