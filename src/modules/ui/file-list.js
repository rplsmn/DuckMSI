import { CSS_CLASSES, MESSAGES } from '../shared/constants.js';

/**
 * File list UI component for displaying loaded tables
 */
export class FileListUI {
  /**
   * @param {HTMLElement} tbody - Table body element
   * @param {HTMLElement} clearAllBtn - Clear all button element
   */
  constructor(tbody, clearAllBtn) {
    this.tbody = tbody;
    this.clearAllBtn = clearAllBtn;
    this.onRenameCallback = null;
    this.onRemoveCallback = null;
  }

  /**
   * Set rename callback
   * @param {Function} callback - (tableName) => void
   */
  onRename(callback) {
    this.onRenameCallback = callback;
  }

  /**
   * Set remove callback
   * @param {Function} callback - (tableName) => void
   */
  onRemove(callback) {
    this.onRemoveCallback = callback;
  }

  /**
   * Render file list
   * @param {Array<Object>} files - Array of file metadata
   */
  render(files) {
    if (!files || files.length === 0) {
      this.tbody.innerHTML = `<tr><td colspan="5" class="${CSS_CLASSES.EMPTY_MESSAGE}">${MESSAGES.NO_FILES}</td></tr>`;
      this.clearAllBtn.classList.remove(CSS_CLASSES.VISIBLE);
      return;
    }

    this.tbody.innerHTML = files.map(file => {
      const rowCount = file.rowCount || 0;
      const columnCount = file.columnCount || 0;

      return `
        <tr>
          <td class="${CSS_CLASSES.TABLE_NAME}">${file.tableName}</td>
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

    this.clearAllBtn.classList.add(CSS_CLASSES.VISIBLE);
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to buttons
   */
  attachEventListeners() {
    // Rename buttons
    this.tbody.querySelectorAll('.btn-rename').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.onRenameCallback) {
          this.onRenameCallback(btn.dataset.table);
        }
      });
    });

    // Remove buttons
    this.tbody.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.onRemoveCallback) {
          this.onRemoveCallback(btn.dataset.table);
        }
      });
    });
  }
}
