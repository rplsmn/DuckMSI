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
   */
  async loadParquetFile(fileName, buffer) {
    if (!this.initialized) {
      throw new Error('DuckDB not initialized');
    }

    await this.db.registerFileBuffer(fileName, new Uint8Array(buffer));
    this.loadedFiles.push(fileName);
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
   * Get list of loaded files
   * @returns {string[]}
   */
  getLoadedFiles() {
    return [...this.loadedFiles];
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
