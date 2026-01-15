import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatQueryResults,
  validateSQL,
  createResultsTable,
  handleFileUpload,
  sanitizeTableName,
  generateUniqueTableName,
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

describe('sanitizeTableName', () => {
  it('should remove .parquet extension', () => {
    expect(sanitizeTableName('fixe.parquet')).toBe('fixe');
  });

  it('should convert to lowercase', () => {
    expect(sanitizeTableName('MyFile.parquet')).toBe('myfile');
  });

  it('should replace spaces with underscores', () => {
    expect(sanitizeTableName('my file.parquet')).toBe('my_file');
  });

  it('should replace special characters with underscores', () => {
    expect(sanitizeTableName('file@2024.parquet')).toBe('file_2024');
  });

  it('should handle multiple consecutive special chars', () => {
    expect(sanitizeTableName('file@@##.parquet')).toBe('file');
  });

  it('should preserve numbers and underscores', () => {
    expect(sanitizeTableName('data_123.parquet')).toBe('data_123');
  });

  it('should handle hyphens', () => {
    expect(sanitizeTableName('acte-2024.parquet')).toBe('acte_2024');
  });

  it('should handle all special characters', () => {
    expect(sanitizeTableName('@#$%.parquet')).toBe('table');
  });

  it('should handle empty result with fallback', () => {
    expect(sanitizeTableName('.parquet')).toBe('table');
  });

  it('should handle names without extension', () => {
    expect(sanitizeTableName('fixe')).toBe('fixe');
  });
});

describe('generateUniqueTableName', () => {
  it('should return base name if no conflicts', () => {
    expect(generateUniqueTableName('fixe', [])).toBe('fixe');
  });

  it('should append _2 for first duplicate', () => {
    expect(generateUniqueTableName('fixe', ['fixe'])).toBe('fixe_2');
  });

  it('should append _3 for second duplicate', () => {
    expect(generateUniqueTableName('fixe', ['fixe', 'fixe_2'])).toBe('fixe_3');
  });

  it('should handle non-sequential existing names', () => {
    expect(generateUniqueTableName('test', ['test', 'test_3'])).toBe('test_2');
  });

  it('should find next available number', () => {
    expect(generateUniqueTableName('file', ['file', 'file_2', 'file_3', 'file_4'])).toBe('file_5');
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
      // Mock for CREATE VIEW (1st call)
      // Then mock for getFileStatistics: COUNT, DESCRIBE, COUNT DISTINCT
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 100 }]) }) // COUNT
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ]) }) // DESCRIBE
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 85 }]) }); // COUNT DISTINCT

      const buffer = new ArrayBuffer(8);
      await app.loadParquetFile('test.parquet', buffer);

      expect(mockDb.registerFileBuffer).toHaveBeenCalledWith(
        'test.parquet',
        expect.any(Uint8Array)
      );
    });

    it('should create view with sanitized table name', async () => {
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 100 }]) }) // COUNT
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ]) }) // DESCRIBE
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 85 }]) }); // COUNT DISTINCT

      const buffer = new ArrayBuffer(8);
      const tableName = await app.loadParquetFile('my file.parquet', buffer);

      expect(tableName).toBe('my_file');
      expect(mockConn.query).toHaveBeenCalledWith(
        expect.stringContaining("CREATE VIEW my_file")
      );
    });

    it('should store file metadata', async () => {
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 100 }]) }) // COUNT
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' },
          { column_name: 'name', column_type: 'VARCHAR' }
        ]) }) // DESCRIBE
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 85 }]) }); // COUNT DISTINCT

      await app.loadParquetFile('test.parquet', new ArrayBuffer(8));
      const metadata = app.getAllTablesMetadata();

      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        tableName: 'test',
        originalName: 'test.parquet',
        rowCount: expect.any(Number),
        columnCount: expect.any(Number),
        uploadedAt: expect.any(Number)
      });
    });

    it('should handle duplicate filenames', async () => {
      // First file
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 100 }]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 85 }]) });

      await app.loadParquetFile('test.parquet', new ArrayBuffer(8));

      // Second file with same name
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 50 }]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 40 }]) });

      await app.loadParquetFile('test.parquet', new ArrayBuffer(8));

      const tables = app.getAllTablesMetadata();
      expect(tables[0].tableName).toBe('test');
      expect(tables[1].tableName).toBe('test_2');
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

  describe('getFileStatistics', () => {
    it('should return row count, column count, and unique row count', async () => {
      // Mock the responses for different queries
      const mockCountResult = {
        toArray: vi.fn().mockReturnValue([{ count: 100 }])
      };
      const mockTableInfo = {
        toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' },
          { column_name: 'name', column_type: 'VARCHAR' }
        ])
      };
      const mockUniqueResult = {
        toArray: vi.fn().mockReturnValue([{ count: 85 }])
      };

      mockConn.query
        .mockResolvedValueOnce(mockCountResult) // First call: row count
        .mockResolvedValueOnce(mockTableInfo)    // Second call: table info (DESCRIBE)
        .mockResolvedValueOnce(mockUniqueResult); // Third call: unique count

      const stats = await app.getFileStatistics('test.parquet');

      expect(stats).toEqual({
        rowCount: 100,
        columnCount: 2,
        uniqueRowCount: 85
      });
      expect(mockConn.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error if not initialized', async () => {
      app.initialized = false;
      await expect(app.getFileStatistics('test.parquet'))
        .rejects.toThrow('DuckDB not initialized');
    });

    it('should handle files with all unique rows', async () => {
      const mockCountResult = {
        toArray: vi.fn().mockReturnValue([{ count: 50 }])
      };
      const mockTableInfo = {
        toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ])
      };
      const mockUniqueResult = {
        toArray: vi.fn().mockReturnValue([{ count: 50 }])
      };

      mockConn.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockTableInfo)
        .mockResolvedValueOnce(mockUniqueResult);

      const stats = await app.getFileStatistics('test.parquet');

      expect(stats.rowCount).toBe(stats.uniqueRowCount);
    });
  });

  describe('renameTable', () => {
    beforeEach(async () => {
      // Mock file loading
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 100 }]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 85 }]) });

      await app.loadParquetFile('test.parquet', new ArrayBuffer(8));
      mockConn.query.mockClear();
    });

    it('should rename table and update metadata', async () => {
      await app.renameTable('test', 'renamed');
      const metadata = app.getTableMetadata('renamed');

      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('renamed');
    });

    it('should sanitize new name', async () => {
      await app.renameTable('test', 'New Name!');
      const metadata = app.getAllTablesMetadata()[0];

      expect(metadata.tableName).toBe('new_name');
    });

    it('should throw error for non-existent table', async () => {
      await expect(app.renameTable('nonexistent', 'new'))
        .rejects.toThrow("Table 'nonexistent' not found");
    });

    it('should throw error for duplicate name', async () => {
      // Load another file
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 50 }]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 40 }]) });

      await app.loadParquetFile('other.parquet', new ArrayBuffer(8));
      mockConn.query.mockClear();

      await expect(app.renameTable('test', 'other'))
        .rejects.toThrow("already exists");
    });
  });

  describe('removeTable', () => {
    beforeEach(async () => {
      // Load two test files
      // First file
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 100 }]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 85 }]) });
      await app.loadParquetFile('test.parquet', new ArrayBuffer(8));

      // Second file
      mockConn.query
        .mockResolvedValueOnce({}) // CREATE VIEW
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 100 }]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
          { column_name: 'id', column_type: 'INTEGER' }
        ]) })
        .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 85 }]) });
      await app.loadParquetFile('test2.parquet', new ArrayBuffer(8));

      mockConn.query.mockClear();
    });

    it('should remove table from metadata', async () => {
      await app.removeTable('test');
      const tables = app.getAllTablesMetadata();

      expect(tables).toHaveLength(1);
      expect(tables[0].tableName).toBe('test2');
    });

    it('should drop view in DuckDB', async () => {
      await app.removeTable('test');

      expect(mockConn.query).toHaveBeenCalledWith(
        expect.stringContaining("DROP VIEW IF EXISTS test")
      );
    });

    it('should throw error for non-existent table', async () => {
      await expect(app.removeTable('nonexistent'))
        .rejects.toThrow("not found");
    });
  });

  describe('clearAllTables', () => {
    beforeEach(async () => {
      // Load three test files
      for (let i = 1; i <= 3; i++) {
        mockConn.query
          .mockResolvedValueOnce({}) // CREATE VIEW
          .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 100 }]) })
          .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([
            { column_name: 'id', column_type: 'INTEGER' }
          ]) })
          .mockResolvedValueOnce({ toArray: vi.fn().mockReturnValue([{ count: 85 }]) });
        await app.loadParquetFile(`test${i}.parquet`, new ArrayBuffer(8));
      }

      mockConn.query.mockClear();
    });

    it('should clear all tables', async () => {
      await app.clearAllTables();
      const tables = app.getAllTablesMetadata();

      expect(tables).toHaveLength(0);
    });

    it('should drop all views', async () => {
      await app.clearAllTables();

      expect(mockConn.query).toHaveBeenCalledWith(
        expect.stringContaining("DROP VIEW IF EXISTS test1")
      );
      expect(mockConn.query).toHaveBeenCalledWith(
        expect.stringContaining("DROP VIEW IF EXISTS test2")
      );
      expect(mockConn.query).toHaveBeenCalledWith(
        expect.stringContaining("DROP VIEW IF EXISTS test3")
      );
    });
  });
});
