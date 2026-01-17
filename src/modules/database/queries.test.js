import { describe, it, expect } from 'vitest';
import { validateSQL, formatQueryResults, createResultsTable } from './queries.js';

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

  it('should return false for whitespace-only string', () => {
    expect(validateSQL('   ')).toBe(false);
  });
});

describe('formatQueryResults', () => {
  it('should format empty results', () => {
    const result = formatQueryResults([]);
    expect(result).toEqual({ columns: [], rows: [] });
  });

  it('should format null/undefined results', () => {
    expect(formatQueryResults(null)).toEqual({ columns: [], rows: [] });
    expect(formatQueryResults(undefined)).toEqual({ columns: [], rows: [] });
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

  it('should use default limit of 50', () => {
    const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const result = formatQueryResults(data);
    expect(result.rows).toHaveLength(50);
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

  it('should display NULL for null/undefined cells', () => {
    const data = {
      columns: ['value'],
      rows: [[null], [undefined]]
    };
    const table = createResultsTable(data);
    const cells = table.querySelectorAll('td');
    expect(cells[0].textContent).toBe('NULL');
    expect(cells[1].textContent).toBe('NULL');
  });

  it('should have results-table class', () => {
    const data = { columns: ['id'], rows: [[1]] };
    const table = createResultsTable(data);
    expect(table.className).toBe('results-table');
  });
});
