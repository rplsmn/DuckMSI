import { getApp, formatQueryResults, createResultsTable, handleFileUpload } from './app.js';

// DOM Elements
const statusEl = document.getElementById('status');
const dropZone = document.getElementById('drop-zone');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const loadedFilesEl = document.getElementById('loaded-files');
const sqlInput = document.getElementById('sql-input');
const executeBtn = document.getElementById('execute-btn');
const resultsBox = document.getElementById('results-box');

let app = null;

/**
 * Update status display
 */
function setStatus(message, type = 'loading') {
  statusEl.textContent = message;
  statusEl.className = type;
}

/**
 * Display results in the results box
 */
function displayResults(data) {
  resultsBox.innerHTML = '';

  if (data.rows.length === 0) {
    resultsBox.innerHTML = '<p class="message">Query returned no results.</p>';
    return;
  }

  const table = createResultsTable(data);
  resultsBox.appendChild(table);
}

/**
 * Display error in results box
 */
function displayError(error) {
  resultsBox.innerHTML = `<div class="error">Error: ${error.message}</div>`;
}

/**
 * Display success message
 */
function displaySuccess(message) {
  resultsBox.innerHTML = `<div class="success">${message}</div>`;
}

/**
 * Update loaded files display
 */
function updateLoadedFiles() {
  const files = app.getLoadedFiles();
  if (files.length === 0) {
    loadedFilesEl.innerHTML = '';
    return;
  }

  loadedFilesEl.innerHTML = 'Loaded files: ' +
    files.map(f => `<span class="file-tag">${f}</span>`).join('');
}

/**
 * Handle file selection/drop
 */
async function processFile(file) {
  try {
    const { name, buffer } = await handleFileUpload(file);
    await app.loadParquetFile(name, buffer);
    updateLoadedFiles();
    displaySuccess(`Successfully loaded ${name}. You can now query it with: SELECT * FROM '${name}' LIMIT 10`);
    sqlInput.value = `SELECT * FROM '${name}' LIMIT 10`;
  } catch (error) {
    displayError(error);
  }
}

/**
 * Execute SQL query
 */
async function executeQuery() {
  const sql = sqlInput.value.trim();
  if (!sql) {
    displayError(new Error('Please enter a SQL query'));
    return;
  }

  executeBtn.disabled = true;
  executeBtn.textContent = 'Executing...';

  try {
    const results = await app.executeQuery(sql);
    const formatted = formatQueryResults(results, 50);
    displayResults(formatted);
  } catch (error) {
    displayError(error);
  } finally {
    executeBtn.disabled = false;
    executeBtn.textContent = 'Execute Query';
  }
}

/**
 * Initialize the application
 */
async function init() {
  try {
    setStatus('Initializing DuckDB...', 'loading');
    app = await getApp();
    setStatus('DuckDB Ready', 'ready');
    executeBtn.disabled = false;
  } catch (error) {
    setStatus(`Failed to initialize: ${error.message}`, 'loading');
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
  const file = e.target.files[0];
  if (file) {
    processFile(file);
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
  const file = e.dataTransfer.files[0];
  if (file) {
    processFile(file);
  }
});

// Execute button click
executeBtn.addEventListener('click', executeQuery);

// Execute on Ctrl+Enter
sqlInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    executeQuery();
  }
});

// Initialize app
init();
