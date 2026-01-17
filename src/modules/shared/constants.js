/**
 * Application configuration constants
 */
export const CONFIG = {
  MAX_RESULT_ROWS: 50,
  DEFAULT_EXPORT_FILENAME: 'DuckPMSI-results',
  TABLE_FALLBACK_NAME: 'table'
};

/**
 * UI messages
 */
export const MESSAGES = {
  INITIALIZING: 'Initializing DuckDB...',
  READY: 'DuckDB Ready',
  NO_RESULTS: 'Query returned no results.',
  NO_FILES: 'No files loaded',
  RESULTS_PLACEHOLDER: 'Results will appear here after executing a query.',
  UPLOAD_FILES_HINT: 'Upload files to see statistics'
};

/**
 * CSS class names
 */
export const CSS_CLASSES = {
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  SUCCESS: 'success',
  VISIBLE: 'visible',
  DRAGOVER: 'dragover',
  MESSAGE: 'message',
  RESULTS_TABLE: 'results-table',
  TABLE_NAME: 'table-name',
  TABLE_NAME_COL: 'table-name-col',
  NUMBER_COL: 'number-col',
  EMPTY_MESSAGE: 'empty-message',
  DUPLICATE_LOW: 'duplicate-low',
  DUPLICATE_MEDIUM: 'duplicate-medium',
  DUPLICATE_HIGH: 'duplicate-high'
};

/**
 * DOM element IDs
 */
export const DOM_IDS = {
  STATUS: 'status',
  DROP_ZONE: 'drop-zone',
  UPLOAD_BTN: 'upload-btn',
  FILE_INPUT: 'file-input',
  FILE_LIST_BODY: 'file-list-body',
  CLEAR_ALL_BTN: 'clear-all-btn',
  DIAGNOSTICS_DASHBOARD: 'diagnostics-dashboard',
  DIAGNOSTICS_BODY: 'diagnostics-body',
  SQL_INPUT: 'sql-input',
  EXECUTE_BTN: 'execute-btn',
  RESULTS_BOX: 'results-box',
  EXPORT_BTN: 'export-btn',
  SQL_SECTION: 'sql-section',
  RESULTS_SECTION: 'results-section'
};
