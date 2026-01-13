import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatQueryResults,
  validateSQL,
  createResultsTable,
  handleFileUpload,
  DuckDBApp
} from './app.js';

describe('formatQueryResults', () => {
  it('should format empty results', () => {
    const result = formatQueryResults([]);
    expect(result).toEqual({ columns: [], rows: [] });
  });

  it('should format results with data', () => {
    const data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    const result = formatQueryResults(data);
    expect(result.columns).toEqual(['id', 'name']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual([1, 'Alice']);
  });

  it('should limit results to first N rows', () => {
    const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const result = formatQueryResults(data, 10);
    expect(result.rows).toHaveLength(10);
  });
});

describe('validateSQL', () => {
  it('should return true for valid SELECT statement', () => {
    expect(validateSQL('SELECT * FROM test')).toBe(true);
  });

  it('should return true for SELECT with WHERE clause', () => {
    expect(validateSQL('SELECT id, name FROM users WHERE id > 5')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(validateSQL('')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(validateSQL(null)).toBe(false);
    expect(validateSQL(undefined)).toBe(false);
  });

  it('should trim whitespace', () => {
    expect(validateSQL('  SELECT * FROM test  ')).toBe(true);
  });
});

describe('createResultsTable', () => {
  it('should create a table element with headers', () => {
    const data = {
      columns: ['id', 'name'],
      rows: [[1, 'Alice'], [2, 'Bob']]
    };
    const table = createResultsTable(data);
    expect(table.tagName).toBe('TABLE');
    expect(table.querySelectorAll('th')).toHaveLength(2);
  });

  it('should create correct number of rows', () => {
    const data = {
      columns: ['id'],
      rows: [[1], [2], [3]]
    };
    const table = createResultsTable(data);
    const tbody = table.querySelector('tbody');
    expect(tbody.querySelectorAll('tr')).toHaveLength(3);
  });

  it('should handle empty data', () => {
    const data = { columns: [], rows: [] };
    const table = createResultsTable(data);
    expect(table.querySelector('tbody').innerHTML).toBe('');
  });
});

describe('handleFileUpload', () => {
  it('should reject non-parquet files', async () => {
    const file = {
      name: 'test.csv',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    };
    await expect(handleFileUpload(file)).rejects.toThrow('Only .parquet files are supported');
  });

  it('should accept parquet files', async () => {
    const mockBuffer = new ArrayBuffer(8);
    const file = {
      name: 'test.parquet',
      arrayBuffer: vi.fn().mockResolvedValue(mockBuffer)
    };
    const result = await handleFileUpload(file);
    expect(result.name).toBe('test.parquet');
    expect(result.buffer).toBe(mockBuffer);
  });
});

describe('DuckDBApp', () => {
  let app;
  let mockDb;
  let mockConn;

  beforeEach(() => {
    // Mock DuckDB connection
    mockConn = {
      query: vi.fn(),
      close: vi.fn()
    };
    mockDb = {
      connect: vi.fn().mockResolvedValue(mockConn),
      registerFileBuffer: vi.fn().mockResolvedValue(undefined),
      terminate: vi.fn()
    };

    app = new DuckDBApp();
    app.db = mockDb;
    app.conn = mockConn;
    app.initialized = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeQuery', () => {
    it('should execute a SQL query and return results', async () => {
      const mockResult = {
        toArray: vi.fn().mockReturnValue([
          { id: 1, name: 'Test' }
        ])
      };
      mockConn.query.mockResolvedValue(mockResult);

      const results = await app.executeQuery('SELECT * FROM test');

      expect(mockConn.query).toHaveBeenCalledWith('SELECT * FROM test');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ id: 1, name: 'Test' });
    });

    it('should throw error if not initialized', async () => {
      app.initialized = false;
      await expect(app.executeQuery('SELECT 1')).rejects.toThrow('DuckDB not initialized');
    });

    it('should throw error for invalid SQL', async () => {
      await expect(app.executeQuery('')).rejects.toThrow('Invalid SQL query');
    });
  });

  describe('loadParquetFile', () => {
    it('should register parquet file in DuckDB', async () => {
      const buffer = new ArrayBuffer(8);
      await app.loadParquetFile('test.parquet', buffer);

      expect(mockDb.registerFileBuffer).toHaveBeenCalledWith(
        'test.parquet',
        expect.any(Uint8Array)
      );
    });

    it('should throw error if not initialized', async () => {
      app.initialized = false;
      await expect(app.loadParquetFile('test.parquet', new ArrayBuffer(8)))
        .rejects.toThrow('DuckDB not initialized');
    });
  });

  describe('getTableInfo', () => {
    it('should return table information after loading parquet', async () => {
      const mockResult = {
        toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' },
          { column_name: 'name', column_type: 'VARCHAR' }
        ])
      };
      mockConn.query.mockResolvedValue(mockResult);

      const info = await app.getTableInfo('test.parquet');

      expect(info).toHaveLength(2);
      expect(info[0].column_name).toBe('id');
    });
  });
});
