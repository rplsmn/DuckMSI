import * as duckdb from '@duckdb/duckdb-wasm';

// Import from modules
import {
  validateSQL,
  formatQueryResults,
  createResultsTable
} from './modules/database/index.js';

import {
  sanitizeTableName,
  generateUniqueTableName,
  handleFileUpload
} from './modules/files/index.js';

// Re-export for backwards compatibility
export {
  validateSQL,
  formatQueryResults,
  createResultsTable,
  sanitizeTableName,
  generateUniqueTableName,
  handleFileUpload
};

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
