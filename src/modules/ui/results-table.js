import { CSS_CLASSES, MESSAGES } from '../shared/constants.js';
import { createResultsTable } from '../database/queries.js';

/**
 * Results table UI component
 */
export class ResultsTableUI {
  /**
   * @param {HTMLElement} container - Results container element
   * @param {HTMLElement} exportBtn - Export button element
   */
  constructor(container, exportBtn) {
    this.container = container;
    this.exportBtn = exportBtn;
    this.lastResults = null;
  }

  /**
   * Render query results
   * @param {Object} data - { columns: string[], rows: any[][] }
   */
  render(data) {
    this.container.innerHTML = '';
    this.lastResults = data;

    if (!data || data.rows.length === 0) {
      this.container.innerHTML = `<p class="${CSS_CLASSES.MESSAGE}">${MESSAGES.NO_RESULTS}</p>`;
      this.hideExportButton();
      return;
    }

    const table = createResultsTable(data);
    this.container.appendChild(table);
    this.showExportButton();
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.container.innerHTML = `<div class="${CSS_CLASSES.ERROR}">Error: ${message}</div>`;
    this.hideExportButton();
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.container.innerHTML = `<div class="${CSS_CLASSES.SUCCESS}">${message}</div>`;
  }

  /**
   * Show placeholder message
   */
  showPlaceholder() {
    this.container.innerHTML = `<p class="${CSS_CLASSES.MESSAGE}">${MESSAGES.RESULTS_PLACEHOLDER}</p>`;
    this.hideExportButton();
  }

  /**
   * Show export button
   */
  showExportButton() {
    if (this.exportBtn) {
      this.exportBtn.style.display = '';
      this.exportBtn.disabled = false;
    }
  }

  /**
   * Hide export button
   */
  hideExportButton() {
    if (this.exportBtn) {
      this.exportBtn.style.display = 'none';
      this.exportBtn.disabled = true;
    }
  }

  /**
   * Get last query results
   * @returns {Object|null}
   */
  getLastResults() {
    return this.lastResults;
  }
}
