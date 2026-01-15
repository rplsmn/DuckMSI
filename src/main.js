import { getApp, formatQueryResults, createResultsTable, handleFileUpload } from './app.js';

// DOM Elements
const statusEl = document.getElementById('status');
const dropZone = document.getElementById('drop-zone');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const fileListBody = document.getElementById('file-list-body');
const clearAllBtn = document.getElementById('clear-all-btn');
const diagnosticsDashboard = document.getElementById('diagnostics-dashboard');
const diagnosticsBody = document.getElementById('diagnostics-body');
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
 * Update file list display
 */
function updateFileListDisplay() {
  const files = app.getAllTablesMetadata();

  if (files.length === 0) {
    fileListBody.innerHTML = '<tr><td colspan="5" class="empty-message">No files loaded</td></tr>';
    clearAllBtn.classList.remove('visible');
    diagnosticsDashboard.classList.remove('visible');
    return;
  }

  fileListBody.innerHTML = files.map(file => {
    // Defensive checks for undefined values
    const rowCount = file.rowCount || 0;
    const columnCount = file.columnCount || 0;

    return `
      <tr>
        <td class="table-name">${file.tableName}</td>
        <td>${file.originalName}</td>
        <td>${rowCount.toLocaleString()}</td>
        <td>${columnCount}</td>
        <td>
          <button class="btn-small btn-rename" data-table="${file.tableName}">Rename</button>
          <button class="btn-small btn-danger" data-table="${file.tableName}">Remove</button>
        </td>
      </tr>
    `;
  }).join('');

  clearAllBtn.classList.add('visible');

  // Attach event handlers
  document.querySelectorAll('.btn-rename').forEach(btn => {
    btn.addEventListener('click', () => handleRename(btn.dataset.table));
  });

  document.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', () => removeFile(btn.dataset.table));
  });

  // Update example query
  updateExampleQuery();

  // Update diagnostics table with all files
  displayAllFileStatistics();
}

/**
 * Display statistics for all loaded files in diagnostics table
 */
function displayAllFileStatistics() {
  const files = app.getAllTablesMetadata();

  console.log('displayAllFileStatistics called, files:', files.length);

  if (files.length === 0) {
    diagnosticsBody.innerHTML = '<tr><td colspan="5" class="empty-message">Upload files to see statistics</td></tr>';
    diagnosticsDashboard.classList.remove('visible');
    return;
  }

  console.log('Showing diagnostics for', files.length, 'files');

  diagnosticsBody.innerHTML = files.map(file => {
    // Defensive checks for undefined values
    const rowCount = file.rowCount || 0;
    const columnCount = file.columnCount || 0;
    const uniqueRowCount = file.uniqueRowCount || 0;

    const duplicatePercent = rowCount > 0
      ? ((rowCount - uniqueRowCount) / rowCount * 100).toFixed(1)
      : 0;

    // Color code duplicate percentage
    let duplicateClass = 'duplicate-low';
    if (duplicatePercent > 20) duplicateClass = 'duplicate-high';
    else if (duplicatePercent > 5) duplicateClass = 'duplicate-medium';

    return `
      <tr>
        <td class="table-name-col">${file.tableName}</td>
        <td class="number-col">${rowCount.toLocaleString()}</td>
        <td class="number-col">${columnCount}</td>
        <td class="number-col">${uniqueRowCount.toLocaleString()}</td>
        <td class="number-col ${duplicateClass}">${duplicatePercent}%</td>
      </tr>
    `;
  }).join('');

  diagnosticsDashboard.classList.add('visible');
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
      console.log('Loading file:', name);
      const tableName = await app.loadParquetFile(name, buffer);
      console.log('Loaded as table:', tableName);

      // Verify metadata was stored
      const metadata = app.getTableMetadata(tableName);
      console.log('Metadata for', tableName, ':', metadata);

      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`Failed to load ${file.name}:`, error);
    }
  }

  // Update UI after all files processed
  updateFileListDisplay();

  if (successCount > 0) {
    const tables = app.getAllTablesMetadata();
    const tableNames = tables.slice(-successCount).map(t => t.tableName).join(', ');
    displaySuccess(`Successfully loaded ${successCount} file${successCount > 1 ? 's' : ''}: ${tableNames}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
  } else {
    displayError(new Error('Failed to load any files'));
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
    displaySuccess(`Renamed "${tableName}" to "${sanitizedName}"`);
    updateFileListDisplay();
  } catch (error) {
    displayError(error);
  }
}

/**
 * Remove a file
 */
async function removeFile(tableName) {
  if (!confirm(`Remove table "${tableName}"?`)) return;

  try {
    await app.removeTable(tableName);
    displaySuccess(`Removed table "${tableName}"`);
    updateFileListDisplay();
  } catch (error) {
    displayError(error);
  }
}

/**
 * Clear all files
 */
async function clearAllFiles() {
  if (!confirm('Remove all loaded files?')) return;

  try {
    await app.clearAllTables();
    displaySuccess('All files cleared');
    updateFileListDisplay();
    resultsBox.innerHTML = '<p class="message">Results will appear here after executing a query.</p>';
  } catch (error) {
    displayError(error);
  }
}

/**
 * Update example query based on loaded files
 */
function updateExampleQuery() {
  const files = app.getAllTablesMetadata();

  if (files.length === 0) {
    sqlInput.placeholder = "SELECT * FROM 'your_file.parquet' LIMIT 10";
    return;
  }

  if (files.length === 1) {
    sqlInput.value = `SELECT * FROM ${files[0].tableName} LIMIT 10`;
  } else {
    // Show example with available tables listed
    sqlInput.value = `-- Available tables: ${files.map(f => f.tableName).join(', ')}\nSELECT * FROM ${files[0].tableName} LIMIT 10`;
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
    setStatus('Initializing...', 'loading');
    app = await getApp();
    setStatus('DuckDB Ready', 'ready');
    executeBtn.disabled = false;
  } catch (error) {
    setStatus(`Failed: ${error.message}`, 'loading');
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

// Execute on Ctrl+Enter
sqlInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    executeQuery();
  }
});

// Initialize app
init();
