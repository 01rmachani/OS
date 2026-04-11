/* =========================================================
   BrowserOS — Notification System (toasts + notification center)
   ========================================================= */
import { EventBus } from './eventBus.js';

const notifications = [];
let unreadCount = 0;

export const Notifications = {
  init() {
    EventBus.on('notification:add', (notif) => this.add(notif));
  },

  add({ type = 'info', title, message, icon, ttl = 4000 } = {}) {
    const id = 'notif-' + Date.now();
    const ts = Date.now();
    const notif = { id, type, title, message, icon, ts };
    notifications.unshift(notif);

    this._showToast(notif, ttl);
    this._updatePanel();
    this._bumpBadge();

    return id;
  },

  // -------------------------------------------------------
  _showToast({ id, type, title, message, icon }, ttl) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = 'toast-' + id;
    toast.innerHTML = `
      <div class="toast-icon">${icon || this._defaultIcon(type)}</div>
      <div class="toast-body">
        <div class="toast-title">${title || ''}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
    `;

    toast.addEventListener('click', () => this._removeToast(toast));
    container.appendChild(toast);

    if (ttl > 0) {
      setTimeout(() => this._removeToast(toast), ttl);
    }
  },

  _removeToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  },

  // -------------------------------------------------------
  _updatePanel() {
    const list = document.getElementById('notif-list');
    const empty = document.getElementById('notif-empty');
    if (!list) return;

    list.innerHTML = '';
    if (notifications.length === 0) {
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    notifications.slice(0, 20).forEach(n => {
      const item = document.createElement('div');
      item.className = `notif-item type-${n.type}`;
      item.innerHTML = `
        <div class="notif-item-icon">${n.icon || this._defaultIcon(n.type)}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${n.title || ''}</div>
          ${n.message ? `<div class="notif-item-message">${n.message}</div>` : ''}
          <div class="notif-item-time">${this._relTime(n.ts)}</div>
        </div>
      `;
      list.appendChild(item);
    });
  },

  _bumpBadge() {
    unreadCount++;
    const badge = document.getElementById('notification-badge');
    const btn   = document.getElementById('notifications-btn');
    if (!badge) return;
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.classList.remove('hidden');
    btn.classList.add('has-unread');
  },

  clearAll() {
    notifications.length = 0;
    unreadCount = 0;
    document.getElementById('notification-badge')?.classList.add('hidden');
    document.getElementById('notifications-btn')?.classList.remove('has-unread');
    this._updatePanel();
  },

  _defaultIcon(type) {
    return { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[type] || 'ℹ️';
  },

  _relTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    return Math.floor(diff / 3600000) + 'h ago';
  },
};

// Wire up clear-all button
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notif-clear-all')?.addEventListener('click', () => {
    Notifications.clearAll();
  });
});
