/**
 * Main module exports
 *
 * This file provides a unified entry point for all modules.
 * Import from here for convenience, or from specific modules for smaller bundles.
 */

// Shared utilities
export {
  CONFIG,
  MESSAGES,
  CSS_CLASSES,
  DOM_IDS,
  EVENTS,
  EventBus,
  events
} from './shared/index.js';

// Database operations
export {
  validateSQL,
  formatQueryResults,
  createResultsTable
} from './database/index.js';

// File operations
export {
  sanitizeTableName,
  generateUniqueTableName,
  handleFileUpload,
  escapeCSVCell,
  convertToCSV,
  generateFilename,
  downloadFile,
  exportToCSV
} from './files/index.js';

// UI components
export {
  StatusIndicator,
  ResultsTableUI,
  FileListUI,
  DiagnosticsUI,
  SQLEditor
} from './ui/index.js';
