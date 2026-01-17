import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { StatusIndicator } from './status.js';
import { FileListUI } from './file-list.js';
import { DiagnosticsUI } from './diagnostics.js';
import { SQLEditor } from './sql-editor.js';
import { ResultsTableUI } from './results-table.js';

describe('StatusIndicator', () => {
  let element;
  let status;

  beforeEach(() => {
    const dom = new JSDOM('<div id="status"></div>');
    element = dom.window.document.getElementById('status');
    status = new StatusIndicator(element);
  });

  it('should set loading state', () => {
    status.setLoading('Loading...');
    expect(element.textContent).toBe('Loading...');
    expect(element.className).toBe('loading');
  });

  it('should set ready state', () => {
    status.setReady('Ready');
    expect(element.textContent).toBe('Ready');
    expect(element.className).toBe('ready');
  });

  it('should set error state', () => {
    status.setError('Error occurred');
    expect(element.textContent).toBe('Error occurred');
    expect(element.className).toBe('error');
  });
});

describe('FileListUI', () => {
  let tbody;
  let clearAllBtn;
  let fileListUI;
  let dom;

  beforeEach(() => {
    dom = new JSDOM(`
      <table>
        <tbody id="file-list-body"></tbody>
      </table>
      <button id="clear-all-btn"></button>
    `);
    global.document = dom.window.document;
    tbody = dom.window.document.getElementById('file-list-body');
    clearAllBtn = dom.window.document.getElementById('clear-all-btn');
    fileListUI = new FileListUI(tbody, clearAllBtn);
  });

  it('should render empty message when no files', () => {
    fileListUI.render([]);
    expect(tbody.innerHTML).toContain('No files loaded');
    expect(clearAllBtn.classList.contains('visible')).toBe(false);
  });

  it('should render file list', () => {
    const files = [
      { tableName: 'test', originalName: 'test.parquet', rowCount: 100, columnCount: 5 }
    ];
    fileListUI.render(files);
    expect(tbody.innerHTML).toContain('test');
    expect(tbody.innerHTML).toContain('test.parquet');
    expect(tbody.innerHTML).toContain('100');
    expect(clearAllBtn.classList.contains('visible')).toBe(true);
  });

  it('should call rename callback', () => {
    const callback = vi.fn();
    fileListUI.onRename(callback);

    const files = [{ tableName: 'test', originalName: 'test.parquet', rowCount: 100, columnCount: 5 }];
    fileListUI.render(files);

    const renameBtn = tbody.querySelector('.btn-rename');
    renameBtn.click();

    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should call remove callback', () => {
    const callback = vi.fn();
    fileListUI.onRemove(callback);

    const files = [{ tableName: 'test', originalName: 'test.parquet', rowCount: 100, columnCount: 5 }];
    fileListUI.render(files);

    const removeBtn = tbody.querySelector('.btn-danger');
    removeBtn.click();

    expect(callback).toHaveBeenCalledWith('test');
  });
});

describe('DiagnosticsUI', () => {
  let dashboard;
  let tbody;
  let diagnosticsUI;
  let dom;

  beforeEach(() => {
    dom = new JSDOM(`
      <div id="dashboard" class="diagnostics-dashboard">
        <table>
          <tbody id="diagnostics-body"></tbody>
        </table>
      </div>
    `);
    global.document = dom.window.document;
    dashboard = dom.window.document.getElementById('dashboard');
    tbody = dom.window.document.getElementById('diagnostics-body');
    diagnosticsUI = new DiagnosticsUI(dashboard, tbody);
  });

  it('should hide when no files', () => {
    diagnosticsUI.render([]);
    expect(dashboard.classList.contains('visible')).toBe(false);
    expect(tbody.innerHTML).toContain('Upload files');
  });

  it('should show diagnostics for files', () => {
    const files = [
      { tableName: 'test', rowCount: 100, columnCount: 5, uniqueRowCount: 90 }
    ];
    diagnosticsUI.render(files);
    expect(dashboard.classList.contains('visible')).toBe(true);
    expect(tbody.innerHTML).toContain('test');
    expect(tbody.innerHTML).toContain('100');
    expect(tbody.innerHTML).toContain('90');
  });

  it('should calculate duplicate percentage', () => {
    const files = [
      { tableName: 'test', rowCount: 100, columnCount: 5, uniqueRowCount: 80 }
    ];
    diagnosticsUI.render(files);
    // 20% duplicates
    expect(tbody.innerHTML).toContain('20.0%');
  });

  it('should apply correct CSS class for duplicate levels', () => {
    // Low duplicates (< 5%)
    diagnosticsUI.render([{ tableName: 'low', rowCount: 100, columnCount: 1, uniqueRowCount: 98 }]);
    expect(tbody.innerHTML).toContain('duplicate-low');

    // Medium duplicates (5-20%)
    diagnosticsUI.render([{ tableName: 'medium', rowCount: 100, columnCount: 1, uniqueRowCount: 85 }]);
    expect(tbody.innerHTML).toContain('duplicate-medium');

    // High duplicates (> 20%)
    diagnosticsUI.render([{ tableName: 'high', rowCount: 100, columnCount: 1, uniqueRowCount: 70 }]);
    expect(tbody.innerHTML).toContain('duplicate-high');
  });
});

describe('SQLEditor', () => {
  let textarea;
  let executeBtn;
  let sqlEditor;
  let dom;

  beforeEach(() => {
    dom = new JSDOM(`
      <textarea id="sql-input"></textarea>
      <button id="execute-btn">Execute</button>
    `);
    global.document = dom.window.document;
    textarea = dom.window.document.getElementById('sql-input');
    executeBtn = dom.window.document.getElementById('execute-btn');
    sqlEditor = new SQLEditor(textarea, executeBtn);
  });

  it('should get/set value', () => {
    sqlEditor.setValue('SELECT * FROM test');
    expect(sqlEditor.getValue()).toBe('SELECT * FROM test');
  });

  it('should trim value on get', () => {
    sqlEditor.setValue('  SELECT * FROM test  ');
    expect(sqlEditor.getValue()).toBe('SELECT * FROM test');
  });

  it('should set placeholder', () => {
    sqlEditor.setPlaceholder('Enter SQL here');
    expect(textarea.placeholder).toBe('Enter SQL here');
  });

  it('should enable/disable execute button', () => {
    sqlEditor.disableExecute();
    expect(executeBtn.disabled).toBe(true);

    sqlEditor.enableExecute();
    expect(executeBtn.disabled).toBe(false);
  });

  it('should set executing state', () => {
    sqlEditor.setExecuting();
    expect(executeBtn.disabled).toBe(true);
    expect(executeBtn.textContent).toBe('Executing...');
  });

  it('should update example query for single file', () => {
    const files = [{ tableName: 'test' }];
    sqlEditor.updateExampleQuery(files);
    expect(textarea.value).toContain('SELECT * FROM test');
  });

  it('should update example query for multiple files', () => {
    const files = [{ tableName: 'test1' }, { tableName: 'test2' }];
    sqlEditor.updateExampleQuery(files);
    expect(textarea.value).toContain('Available tables: test1, test2');
  });

  it('should call onExecute callback on Ctrl+Enter', () => {
    const callback = vi.fn();
    sqlEditor.onExecute(callback);

    const event = new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true
    });
    textarea.dispatchEvent(event);

    expect(callback).toHaveBeenCalled();
  });
});

describe('ResultsTableUI', () => {
  let container;
  let exportBtn;
  let resultsUI;
  let dom;

  beforeEach(() => {
    dom = new JSDOM(`
      <div id="results-box"></div>
      <button id="export-btn">Export</button>
    `);
    global.document = dom.window.document;
    container = dom.window.document.getElementById('results-box');
    exportBtn = dom.window.document.getElementById('export-btn');
    resultsUI = new ResultsTableUI(container, exportBtn);
  });

  it('should show no results message for empty data', () => {
    resultsUI.render({ columns: [], rows: [] });
    expect(container.innerHTML).toContain('Query returned no results');
    expect(exportBtn.style.display).toBe('none');
  });

  it('should render results table', () => {
    const data = {
      columns: ['id', 'name'],
      rows: [[1, 'Alice']]
    };
    resultsUI.render(data);
    expect(container.querySelector('table')).not.toBeNull();
    expect(exportBtn.style.display).toBe('');
  });

  it('should show error message', () => {
    resultsUI.showError('Test error');
    expect(container.innerHTML).toContain('Error: Test error');
  });

  it('should show success message', () => {
    resultsUI.showSuccess('Success!');
    expect(container.innerHTML).toContain('Success!');
  });

  it('should store last results', () => {
    const data = { columns: ['id'], rows: [[1]] };
    resultsUI.render(data);
    expect(resultsUI.getLastResults()).toEqual(data);
  });
});
