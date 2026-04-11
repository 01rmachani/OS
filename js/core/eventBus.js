/* =========================================================
   BrowserOS — Event Bus (Pub/Sub)
   Central communication hub for all OS modules.
   ========================================================= */

const _handlers = new Map();

export const EventBus = {
  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!_handlers.has(event)) {
      _handlers.set(event, new Set());
    }
    _handlers.get(event).add(handler);
  },

  /**
   * Unsubscribe from an event.
   */
  off(event, handler) {
    if (_handlers.has(event)) {
      _handlers.get(event).delete(handler);
    }
  },

  /**
   * Emit an event with optional data.
   */
  emit(event, data) {
    if (_handlers.has(event)) {
      _handlers.get(event).forEach(h => {
        try { h(data); } catch (e) { console.error(`EventBus error [${event}]:`, e); }
      });
    }
  },

  /**
   * Subscribe once, auto-removes after first call.
   */
  once(event, handler) {
    const wrap = (data) => {
      handler(data);
      this.off(event, wrap);
    };
    this.on(event, wrap);
  }
};
