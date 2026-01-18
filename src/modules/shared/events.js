/**
 * Event types for cross-module communication
 */
export const EVENTS = {
  // File events
  FILE_UPLOADED: 'file:uploaded',
  FILE_REMOVED: 'file:removed',
  FILES_CLEARED: 'files:cleared',

  // Table events
  TABLE_RENAMED: 'table:renamed',
  TABLES_UPDATED: 'tables:updated',

  // Query events
  QUERY_REQUESTED: 'query:requested',
  QUERY_EXECUTED: 'query:executed',
  RESULTS_READY: 'results:ready',

  // Export events
  EXPORT_REQUESTED: 'export:requested',

  // Status events
  STATUS_CHANGED: 'status:changed',
  ERROR: 'error',
  SUCCESS: 'success'
};

/**
 * Simple event bus for decoupled communication between modules
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event for a single invocation
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    const wrappedCallback = (data) => {
      this.off(event, wrappedCallback);
      callback(data);
    };
    this.on(event, wrappedCallback);
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} [event] - Optional event name
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Singleton event bus instance
export const events = new EventBus();
