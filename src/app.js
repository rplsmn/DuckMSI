import * as duckdb from '@duckdb/duckdb-wasm';

/**
 * Format query results into a structured format
 * @param {Array} data - Array of row objects
 * @param {number} limit - Maximum number of rows to return
 * @returns {Object} - { columns: string[], rows: any[][] }
 */
export function formatQueryResults(data, limit = 50) {
  if (!data || data.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = Object.keys(data[0]);
  const rows = data.slice(0, limit).map(row => columns.map(col => row[col]));

  return { columns, rows };
}

/**
 * Validate SQL query string
 * @param {string} sql - SQL query string
 * @returns {boolean} - Whether the SQL is valid
 */
export function validateSQL(sql) {
  if (sql === null || sql === undefined) {
    return false;
  }
  const trimmed = String(sql).trim();
  return trimmed.length > 0;
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
    name = 'table';
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
 * DuckDB Application class for managing database operations
 */
export class DuckDBApp {
  constructor() {
    this.db = null;
    this.conn = null;
    this.initialized = false;
    this.loadedFiles = [];
  }

  /**
   * Initialize DuckDB WASM
   */
  async initialize() {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
    );

    // Instantiate the asynchronous version of DuckDB-wasm
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    this.db = new duckdb.AsyncDuckDB(logger, worker);

    await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);

    this.conn = await this.db.connect();
    this.initialized = true;

    return this;
  }

  /**
   * Execute a SQL query
   * @param {string} sql - SQL query string
   * @returns {Promise<Array>} - Query results as array of objects
   */
  async executeQuery(sql) {
    if (!this.initialized) {
      throw new Error('DuckDB not initialized');
    }

    if (!validateSQL(sql)) {
      throw new Error('Invalid SQL query');
    }

    const result = await this.conn.query(sql);
    return result.toArray();
  }

  /**
   * Load a parquet file into DuckDB
   * @param {string} fileName - Name of the file
   * @param {ArrayBuffer} buffer - File content
   * @returns {Promise<string>} - The sanitized table name
   */
  async loadParquetFile(fileName, buffer) {
    if (!this.initialized) {
      throw new Error('DuckDB not initialized');
    }

    // Sanitize table name
    const baseName = sanitizeTableName(fileName);
    const existingNames = this.loadedFiles.map(f => f.tableName);
    const tableName = generateUniqueTableName(baseName, existingNames);

    // Register file buffer
    await this.db.registerFileBuffer(fileName, new Uint8Array(buffer));

    // Create view with sanitized name
    await this.conn.query(`CREATE VIEW ${tableName} AS SELECT * FROM '${fileName}'`);

    // Get statistics
    const stats = await this.getFileStatistics(fileName);

    // Store metadata
    this.loadedFiles.push({
      tableName,
      originalName: fileName,
      rowCount: stats.rowCount,
      columnCount: stats.columnCount,
      uploadedAt: Date.now()
    });

    return tableName;
  }

  /**
   * Get table information for a parquet file
   * @param {string} fileName - Name of the parquet file
   * @returns {Promise<Array>} - Column information
   */
  async getTableInfo(fileName) {
    const result = await this.conn.query(`DESCRIBE SELECT * FROM '${fileName}'`);
    return result.toArray();
  }

  /**
   * Get file statistics (row count, column count, unique row count)
   * @param {string} fileName - Name of the parquet file
   * @returns {Promise<{rowCount: number, columnCount: number, uniqueRowCount: number}>}
   */
  async getFileStatistics(fileName) {
    if (!this.initialized) {
      throw new Error('DuckDB not initialized');
    }

    // Get row count
    const countResult = await this.conn.query(`SELECT COUNT(*) as count FROM '${fileName}'`);
    const rowCount = countResult.toArray()[0].count;

    // Get column information
    const tableInfo = await this.getTableInfo(fileName);
    const columnCount = tableInfo.length;

    // Get unique row count (distinct observations)
    // We need to get all column names first to build the DISTINCT query
    const columns = tableInfo.map(col => col.column_name).join(', ');
    const uniqueResult = await this.conn.query(`SELECT COUNT(*) as count FROM (SELECT DISTINCT ${columns} FROM '${fileName}')`);
    const uniqueRowCount = uniqueResult.toArray()[0].count;

    return {
      rowCount: Number(rowCount),
      columnCount,
      uniqueRowCount: Number(uniqueRowCount)
    };
  }

  /**
   * Get list of loaded files (legacy compatibility)
   * @returns {string[]}
   */
  getLoadedFiles() {
    return this.loadedFiles.map(f => f.tableName);
  }

  /**
   * Get metadata for all loaded tables
   * @returns {Array<Object>}
   */
  getAllTablesMetadata() {
    return [...this.loadedFiles];
  }

  /**
   * Get metadata for a specific table
   * @param {string} tableName - Name of the table
   * @returns {Object|undefined}
   */
  getTableMetadata(tableName) {
    return this.loadedFiles.find(f => f.tableName === tableName);
  }

  /**
   * Rename a table
   * @param {string} oldName - Current table name
   * @param {string} newName - New table name (will be sanitized)
   * @returns {Promise<string>} - The sanitized new name
   */
  async renameTable(oldName, newName) {
    // Validate old name exists
    const fileIndex = this.loadedFiles.findIndex(f => f.tableName === oldName);
    if (fileIndex === -1) {
      throw new Error(`Table '${oldName}' not found`);
    }

    // Sanitize new name
    const sanitizedNewName = sanitizeTableName(newName + '.parquet');

    // Check for conflicts (excluding current table)
    const existingNames = this.loadedFiles
      .filter((_, i) => i !== fileIndex)
      .map(f => f.tableName);

    if (existingNames.includes(sanitizedNewName)) {
      throw new Error(`Table name '${sanitizedNewName}' already exists`);
    }

    // Get original filename
    const originalName = this.loadedFiles[fileIndex].originalName;

    // Drop old view and create new view
    await this.conn.query(`DROP VIEW IF EXISTS ${oldName}`);
    await this.conn.query(`CREATE VIEW ${sanitizedNewName} AS SELECT * FROM '${originalName}'`);

    // Update metadata
    this.loadedFiles[fileIndex].tableName = sanitizedNewName;

    return sanitizedNewName;
  }

  /**
   * Remove a table
   * @param {string} tableName - Name of the table to remove
   */
  async removeTable(tableName) {
    const fileIndex = this.loadedFiles.findIndex(f => f.tableName === tableName);
    if (fileIndex === -1) {
      throw new Error(`Table '${tableName}' not found`);
    }

    // Drop view
    await this.conn.query(`DROP VIEW IF EXISTS ${tableName}`);

    // Remove from metadata
    this.loadedFiles.splice(fileIndex, 1);
  }

  /**
   * Clear all loaded tables
   */
  async clearAllTables() {
    // Drop all views
    for (const file of this.loadedFiles) {
      await this.conn.query(`DROP VIEW IF EXISTS ${file.tableName}`);
    }

    // Clear metadata
    this.loadedFiles = [];
  }

  /**
   * Terminate the database connection
   */
  async terminate() {
    if (this.conn) {
      await this.conn.close();
    }
    if (this.db) {
      await this.db.terminate();
    }
    this.initialized = false;
  }
}

// Export a singleton instance for the UI
let appInstance = null;

export async function getApp() {
  if (!appInstance) {
    appInstance = new DuckDBApp();
    await appInstance.initialize();
  }
  return appInstance;
}
