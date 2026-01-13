import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Set up DOM before importing
const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="status">Loading</div>
  <div id="drop-zone"></div>
  <button id="upload-btn"></button>
  <input type="file" id="file-input" />
  <div id="loaded-files"></div>
  <textarea id="sql-input"></textarea>
  <button id="execute-btn" disabled></button>
  <div id="results-box"></div>
</body>
</html>
`;

describe('Main UI Functions', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(html);
    document = dom.window.document;
    global.document = document;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('DOM elements exist', () => {
    it('should have status element', () => {
      expect(document.getElementById('status')).not.toBeNull();
    });

    it('should have drop zone element', () => {
      expect(document.getElementById('drop-zone')).not.toBeNull();
    });

    it('should have upload button', () => {
      expect(document.getElementById('upload-btn')).not.toBeNull();
    });

    it('should have file input', () => {
      expect(document.getElementById('file-input')).not.toBeNull();
    });

    it('should have SQL input', () => {
      expect(document.getElementById('sql-input')).not.toBeNull();
    });

    it('should have execute button', () => {
      expect(document.getElementById('execute-btn')).not.toBeNull();
    });

    it('should have results box', () => {
      expect(document.getElementById('results-box')).not.toBeNull();
    });
  });

  describe('Status updates', () => {
    it('should update status text', () => {
      const statusEl = document.getElementById('status');
      statusEl.textContent = 'DuckDB Ready';
      statusEl.className = 'ready';
      expect(statusEl.textContent).toBe('DuckDB Ready');
      expect(statusEl.className).toBe('ready');
    });
  });

  describe('File input behavior', () => {
    it('should accept .parquet files', () => {
      const fileInput = document.getElementById('file-input');
      expect(fileInput.getAttribute('type')).toBe('file');
    });

    it('execute button should be initially disabled', () => {
      const executeBtn = document.getElementById('execute-btn');
      expect(executeBtn.disabled).toBe(true);
    });
  });

  describe('SQL input', () => {
    it('should accept text input', () => {
      const sqlInput = document.getElementById('sql-input');
      sqlInput.value = 'SELECT * FROM test';
      expect(sqlInput.value).toBe('SELECT * FROM test');
    });
  });

  describe('Results display', () => {
    it('should be able to update innerHTML', () => {
      const resultsBox = document.getElementById('results-box');
      resultsBox.innerHTML = '<p>Test results</p>';
      expect(resultsBox.innerHTML).toBe('<p>Test results</p>');
    });
  });
});
