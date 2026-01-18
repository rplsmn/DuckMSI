import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { escapeCSVCell, convertToCSV, generateFilename, downloadFile } from './export.js';

describe('escapeCSVCell', () => {
  it('should return empty string for null', () => {
    expect(escapeCSVCell(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(escapeCSVCell(undefined)).toBe('');
  });

  it('should return string as-is for simple values', () => {
    expect(escapeCSVCell('hello')).toBe('hello');
    expect(escapeCSVCell(123)).toBe('123');
  });

  it('should wrap values with commas in quotes', () => {
    expect(escapeCSVCell('hello, world')).toBe('"hello, world"');
  });

  it('should wrap values with quotes and escape internal quotes', () => {
    expect(escapeCSVCell('say "hello"')).toBe('"say ""hello"""');
  });

  it('should wrap values with newlines in quotes', () => {
    expect(escapeCSVCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('should handle values with multiple special characters', () => {
    expect(escapeCSVCell('test, with "quotes" and\nnewline'))
      .toBe('"test, with ""quotes"" and\nnewline"');
  });
});

describe('convertToCSV', () => {
  it('should return empty string for null/undefined data', () => {
    expect(convertToCSV(null)).toBe('');
    expect(convertToCSV(undefined)).toBe('');
  });

  it('should return empty string for data without columns', () => {
    expect(convertToCSV({})).toBe('');
    expect(convertToCSV({ columns: null })).toBe('');
  });

  it('should convert simple data to CSV', () => {
    const data = {
      columns: ['id', 'name'],
      rows: [[1, 'Alice'], [2, 'Bob']]
    };

    const csv = convertToCSV(data);
    expect(csv).toBe('id,name\n1,Alice\n2,Bob');
  });

  it('should handle empty rows', () => {
    const data = {
      columns: ['id', 'name'],
      rows: []
    };

    const csv = convertToCSV(data);
    expect(csv).toBe('id,name');
  });

  it('should escape special characters in cells', () => {
    const data = {
      columns: ['text'],
      rows: [['hello, world'], ['say "hi"']]
    };

    const csv = convertToCSV(data);
    expect(csv).toBe('text\n"hello, world"\n"say ""hi"""');
  });

  it('should handle null values in rows', () => {
    const data = {
      columns: ['id', 'name'],
      rows: [[1, null], [2, 'Bob']]
    };

    const csv = convertToCSV(data);
    expect(csv).toBe('id,name\n1,\n2,Bob');
  });
});

describe('generateFilename', () => {
  it('should generate filename with timestamp', () => {
    const filename = generateFilename('test');
    expect(filename).toMatch(/^test_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
  });

  it('should use default prefix if not provided', () => {
    const filename = generateFilename();
    expect(filename).toMatch(/^DuckPMSI-results_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
  });

  it('should use custom extension', () => {
    const filename = generateFilename('test', '.txt');
    expect(filename).toMatch(/^test_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.txt$/);
  });
});

describe('downloadFile', () => {
  let createObjectURLMock;
  let revokeObjectURLMock;
  let appendChildMock;
  let removeChildMock;
  let clickMock;

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue('blob:test');
    revokeObjectURLMock = vi.fn();
    appendChildMock = vi.fn();
    removeChildMock = vi.fn();
    clickMock = vi.fn();

    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;
    global.Blob = vi.fn().mockImplementation((content, options) => ({
      content,
      type: options?.type
    }));

    vi.spyOn(document.body, 'appendChild').mockImplementation(appendChildMock);
    vi.spyOn(document.body, 'removeChild').mockImplementation(removeChildMock);
    vi.spyOn(document, 'createElement').mockImplementation(() => ({
      href: '',
      download: '',
      click: clickMock
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create blob and trigger download', () => {
    downloadFile('test content', 'test.csv');

    expect(global.Blob).toHaveBeenCalledWith(['test content'], { type: 'text/csv' });
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(appendChildMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
  });

  it('should use custom mime type', () => {
    downloadFile('test content', 'test.txt', 'text/plain');

    expect(global.Blob).toHaveBeenCalledWith(['test content'], { type: 'text/plain' });
  });
});
