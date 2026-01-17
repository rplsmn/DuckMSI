import { CSS_CLASSES } from '../shared/constants.js';

/**
 * Status indicator UI component
 */
export class StatusIndicator {
  /**
   * @param {HTMLElement} element - Status element
   */
  constructor(element) {
    this.element = element;
  }

  /**
   * Set loading status
   * @param {string} message - Status message
   */
  setLoading(message) {
    this.element.textContent = message;
    this.element.className = CSS_CLASSES.LOADING;
  }

  /**
   * Set ready status
   * @param {string} message - Status message
   */
  setReady(message) {
    this.element.textContent = message;
    this.element.className = CSS_CLASSES.READY;
  }

  /**
   * Set error status
   * @param {string} message - Error message
   */
  setError(message) {
    this.element.textContent = message;
    this.element.className = CSS_CLASSES.ERROR;
  }
}
