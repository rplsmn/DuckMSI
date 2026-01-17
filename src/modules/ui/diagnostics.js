import { CSS_CLASSES, MESSAGES } from '../shared/constants.js';

/**
 * Diagnostics dashboard UI component
 */
export class DiagnosticsUI {
  /**
   * @param {HTMLElement} dashboard - Dashboard container element
   * @param {HTMLElement} tbody - Table body element
   */
  constructor(dashboard, tbody) {
    this.dashboard = dashboard;
    this.tbody = tbody;
  }

  /**
   * Render diagnostics for all files
   * @param {Array<Object>} files - Array of file metadata
   */
  render(files) {
    if (!files || files.length === 0) {
      this.tbody.innerHTML = `<tr><td colspan="5" class="${CSS_CLASSES.EMPTY_MESSAGE}">${MESSAGES.UPLOAD_FILES_HINT}</td></tr>`;
      this.hide();
      return;
    }

    this.tbody.innerHTML = files.map(file => {
      const rowCount = file.rowCount || 0;
      const columnCount = file.columnCount || 0;
      const uniqueRowCount = file.uniqueRowCount !== undefined ? file.uniqueRowCount : rowCount;

      const duplicatePercent = rowCount > 0
        ? ((rowCount - uniqueRowCount) / rowCount * 100).toFixed(1)
        : 0;

      // Color code duplicate percentage
      let duplicateClass = CSS_CLASSES.DUPLICATE_LOW;
      if (duplicatePercent > 20) {
        duplicateClass = CSS_CLASSES.DUPLICATE_HIGH;
      } else if (duplicatePercent > 5) {
        duplicateClass = CSS_CLASSES.DUPLICATE_MEDIUM;
      }

      return `
        <tr>
          <td class="${CSS_CLASSES.TABLE_NAME_COL}">${file.tableName}</td>
          <td class="${CSS_CLASSES.NUMBER_COL}">${rowCount.toLocaleString()}</td>
          <td class="${CSS_CLASSES.NUMBER_COL}">${columnCount}</td>
          <td class="${CSS_CLASSES.NUMBER_COL}">${uniqueRowCount.toLocaleString()}</td>
          <td class="${CSS_CLASSES.NUMBER_COL} ${duplicateClass}">${duplicatePercent}%</td>
        </tr>
      `;
    }).join('');

    this.show();
  }

  /**
   * Show the diagnostics dashboard
   */
  show() {
    this.dashboard.classList.add(CSS_CLASSES.VISIBLE);
  }

  /**
   * Hide the diagnostics dashboard
   */
  hide() {
    this.dashboard.classList.remove(CSS_CLASSES.VISIBLE);
  }
}
