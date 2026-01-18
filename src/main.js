import { getApp, formatQueryResults, handleFileUpload } from './app.js';
import { DOM_IDS, MESSAGES, CONFIG } from './modules/shared/index.js';
import { exportToCSV } from './modules/files/index.js';
import {
  StatusIndicator,
  ResultsTableUI,
  FileListUI,
  DiagnosticsUI,
  SQLEditor
} from './modules/ui/index.js';

// DOM Elements
const statusEl = document.getElementById(DOM_IDS.STATUS);
const dropZone = document.getElementById(DOM_IDS.DROP_ZONE);
const uploadBtn = document.getElementById(DOM_IDS.UPLOAD_BTN);
const fileInput = document.getElementById(DOM_IDS.FILE_INPUT);
const fileListBody = document.getElementById(DOM_IDS.FILE_LIST_BODY);
const clearAllBtn = document.getElementById(DOM_IDS.CLEAR_ALL_BTN);
const diagnosticsDashboard = document.getElementById(DOM_IDS.DIAGNOSTICS_DASHBOARD);
const diagnosticsBody = document.getElementById(DOM_IDS.DIAGNOSTICS_BODY);
const sqlInput = document.getElementById(DOM_IDS.SQL_INPUT);
const executeBtn = document.getElementById(DOM_IDS.EXECUTE_BTN);
const resultsBox = document.getElementById(DOM_IDS.RESULTS_BOX);
const exportBtn = document.getElementById(DOM_IDS.EXPORT_BTN);
const sqlSection = document.getElementById(DOM_IDS.SQL_SECTION);
const resultsSection = document.getElementById(DOM_IDS.RESULTS_SECTION);

// App instance
let app = null;

// UI Components
const status = new StatusIndicator(statusEl);
const resultsUI = new ResultsTableUI(resultsBox, exportBtn);
const fileListUI = new FileListUI(fileListBody, clearAllBtn);
const diagnosticsUI = new DiagnosticsUI(diagnosticsDashboard, diagnosticsBody);
const sqlEditor = new SQLEditor(sqlInput, executeBtn);

/**
 * Update all UI components after file changes
 */
function updateUI() {
  const files = app.getAllTablesMetadata();

  // Show/hide SQL and results sections based on file upload
  if (files.length === 0) {
    if (sqlSection) sqlSection.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'none';
  } else {
    if (sqlSection) sqlSection.style.display = '';
    if (resultsSection) resultsSection.style.display = '';
  }

  // Update UI components
  fileListUI.render(files);
  diagnosticsUI.render(files);
  sqlEditor.updateExampleQuery(files);
}

/**
 * Handle multiple file uploads
 */
async function processFiles(files) {
  const fileArray = Array.from(files);
  let successCount = 0;
  let errorCount = 0;

  for (const file of fileArray) {
    try {
      const { name, buffer } = await handleFileUpload(file);
      await app.loadParquetFile(name, buffer);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`Failed to load ${file.name}:`, error);
    }
  }

  // Update UI after all files processed
  updateUI();

  if (successCount > 0) {
    const tables = app.getAllTablesMetadata();
    const tableNames = tables.slice(-successCount).map(t => t.tableName).join(', ');
    const message = `Successfully loaded ${successCount} file${successCount > 1 ? 's' : ''}: ${tableNames}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`;
    resultsUI.showSuccess(message);
  } else {
    resultsUI.showError('Failed to load any files');
  }
}

/**
 * Handle renaming a table
 */
async function handleRename(tableName) {
  const newName = prompt(`Rename table "${tableName}" to:`, tableName);
  if (!newName || newName === tableName) return;

  try {
    const sanitizedName = await app.renameTable(tableName, newName);
    resultsUI.showSuccess(`Renamed "${tableName}" to "${sanitizedName}"`);
    updateUI();
  } catch (error) {
    resultsUI.showError(error.message);
  }
}

/**
 * Remove a file
 */
async function removeFile(tableName) {
  if (!confirm(`Remove table "${tableName}"?`)) return;

  try {
    await app.removeTable(tableName);
    resultsUI.showSuccess(`Removed table "${tableName}"`);
    updateUI();
  } catch (error) {
    resultsUI.showError(error.message);
  }
}

/**
 * Clear all files
 */
async function clearAllFiles() {
  if (!confirm('Remove all loaded files?')) return;

  try {
    await app.clearAllTables();
    resultsUI.showSuccess('All files cleared');
    updateUI();
    resultsUI.showPlaceholder();
  } catch (error) {
    resultsUI.showError(error.message);
  }
}

/**
 * Execute SQL query
 */
async function executeQuery() {
  const sql = sqlEditor.getValue();
  if (!sql) {
    resultsUI.showError('Please enter a SQL query');
    return;
  }

  sqlEditor.setExecuting();

  try {
    const results = await app.executeQuery(sql);
    const formatted = formatQueryResults(results, CONFIG.MAX_RESULT_ROWS);
    resultsUI.render(formatted);
  } catch (error) {
    resultsUI.showError(error.message);
  } finally {
    sqlEditor.enableExecute();
  }
}

/**
 * Handle export button click
 */
function handleExport() {
  const results = resultsUI.getLastResults();
  if (!results || !results.columns || results.rows.length === 0) return;

  let defaultName = CONFIG.DEFAULT_EXPORT_FILENAME;
  let filename = prompt('Export results as CSV. Enter filename:', defaultName);
  if (!filename) filename = defaultName;

  try {
    exportToCSV(results, filename);
  } catch (error) {
    resultsUI.showError(error.message);
  }
}

/**
 * Initialize the application
 */
async function init() {
  try {
    status.setLoading(MESSAGES.INITIALIZING);
    app = await getApp();
    status.setReady(MESSAGES.READY);
    sqlEditor.enableExecute();

    // Set up UI component callbacks
    fileListUI.onRename(handleRename);
    fileListUI.onRemove(removeFile);
    sqlEditor.onExecute(executeQuery);

  } catch (error) {
    status.setLoading(`Failed: ${error.message}`);
    console.error('Failed to initialize DuckDB:', error);
  }
}

// Event Listeners

// File upload button click
uploadBtn.addEventListener('click', () => {
  fileInput.click();
});

// File input change
fileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    processFiles(files);
  }
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    processFiles(files);
  }
});

// Clear all button
clearAllBtn.addEventListener('click', clearAllFiles);

// Execute button click
executeBtn.addEventListener('click', executeQuery);

// Export button click
exportBtn.addEventListener('click', handleExport);

// Initialize app
init();
