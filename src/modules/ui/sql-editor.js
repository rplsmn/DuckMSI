/**
 * SQL Editor UI component
 */
export class SQLEditor {
  /**
   * @param {HTMLTextAreaElement} textarea - SQL input element
   * @param {HTMLButtonElement} executeBtn - Execute button element
   */
  constructor(textarea, executeBtn) {
    this.textarea = textarea;
    this.executeBtn = executeBtn;
    this.onExecuteCallback = null;

    this.setupKeyboardShortcuts();
  }

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    this.textarea.addEventListener('keydown', (e) => {
      // Ctrl+Enter to execute
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (this.onExecuteCallback) {
          this.onExecuteCallback();
        }
      }
    });
  }

  /**
   * Set execute callback
   * @param {Function} callback - () => void
   */
  onExecute(callback) {
    this.onExecuteCallback = callback;
  }

  /**
   * Get current SQL value
   * @returns {string}
   */
  getValue() {
    return this.textarea.value.trim();
  }

  /**
   * Set SQL value
   * @param {string} sql - SQL string
   */
  setValue(sql) {
    this.textarea.value = sql;
  }

  /**
   * Set placeholder text
   * @param {string} text - Placeholder text
   */
  setPlaceholder(text) {
    this.textarea.placeholder = text;
  }

  /**
   * Enable execute button
   */
  enableExecute() {
    this.executeBtn.disabled = false;
    this.executeBtn.textContent = 'Execute Query';
  }

  /**
   * Disable execute button
   */
  disableExecute() {
    this.executeBtn.disabled = true;
  }

  /**
   * Set executing state
   */
  setExecuting() {
    this.executeBtn.disabled = true;
    this.executeBtn.textContent = 'Executing...';
  }

  /**
   * Update example query based on loaded tables
   * @param {Array<Object>} files - Array of file metadata
   */
  updateExampleQuery(files) {
    if (!files || files.length === 0) {
      this.setPlaceholder("SELECT * FROM 'your_file.parquet' LIMIT 10");
      return;
    }

    if (files.length === 1) {
      this.setValue(`SELECT * FROM ${files[0].tableName} LIMIT 10`);
    } else {
      const tableNames = files.map(f => f.tableName).join(', ');
      this.setValue(`-- Available tables: ${tableNames}\nSELECT * FROM ${files[0].tableName} LIMIT 10`);
    }
  }
}
