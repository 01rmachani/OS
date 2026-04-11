/* =========================================================
   BrowserOS — Window Manager
   Handles create, drag, resize, minimize, maximize, snap, z-order
   ========================================================= */
import { EventBus } from './eventBus.js';

let zCounter = 100;
const windows = new Map(); // id → { el, state }
let appRegistry = {};

const container = () => document.getElementById('window-container');
const snapPreview = () => document.getElementById('snap-preview');

let activeId = null;

export const WindowManager = {
  init(registry) {
    appRegistry = registry;

    // Click outside to deactivate
    document.getElementById('desktop').addEventListener('mousedown', (e) => {
      if (!e.target.closest('.window')) {
        deactivateAll();
      }
    });
  },

  /**
   * Open a new app window.
   * @param {string} appId
   * @param {object} args  - passed to app.mount()
   * @param {object} opts  - { title, width, height, x, y, minWidth, minHeight }
   * @returns {string} window id
   */
  open(appId, args = {}, opts = {}) {
    const app = appRegistry[appId];
    if (!app) { console.error('Unknown app:', appId); return null; }

    // If singleton app is already open, focus it
    if (app.singleton) {
      for (const [id, win] of windows) {
        if (win.appId === appId) { this.focus(id); return id; }
      }
    }

    const id = 'win-' + Date.now();
    const vw = window.innerWidth;
    const vh = window.innerHeight - 48; // minus taskbar

    const w = opts.width  || app.defaultWidth  || 800;
    const h = opts.height || app.defaultHeight || 560;
    const x = opts.x !== undefined ? opts.x : Math.max(40, (vw - w) / 2 + (windows.size * 24));
    const y = opts.y !== undefined ? opts.y : Math.max(40, (vh - h) / 2 + (windows.size * 24));

    const el = this._buildWindow(id, appId, app, { w, h, x: Math.min(x, vw - 100), y: Math.min(y, vh - 60) });
    container().appendChild(el);

    const state = {
      id, appId, el,
      x, y, w, h,
      minW: opts.minWidth  || app.minWidth  || 320,
      minH: opts.minHeight || app.minHeight || 200,
      state: 'normal', // normal | minimized | maximized | snapped-l | snapped-r
      workspace: window._OS?.currentWorkspace || 1,
    };
    windows.set(id, state);

    // Mount the app content
    const body = el.querySelector('.window-body');
    try {
      app.mount(body, args, id);
    } catch (e) { console.error(`App mount error (${appId}):`, e); }

    // Animate open
    el.classList.add('opening');
    el.addEventListener('animationend', () => el.classList.remove('opening'), { once: true });

    this.focus(id);
    EventBus.emit('window:opened', { id, appId, title: app.name });
    return id;
  },

  close(id) {
    const win = windows.get(id);
    if (!win) return;
    const el = win.el;

    el.classList.add('closing');
    el.addEventListener('animationend', () => {
      el.remove();
    }, { once: true });

    windows.delete(id);
    EventBus.emit('window:closed', { id, appId: win.appId });

    if (activeId === id) {
      activeId = null;
      // Focus next available window
      const remaining = [...windows.keys()];
      if (remaining.length) this.focus(remaining[remaining.length - 1]);
    }
  },

  minimize(id) {
    const win = windows.get(id);
    if (!win) return;
    if (win.state === 'minimized') { this.restore(id); return; }

    win.state = 'minimized';
    win.el.classList.add('minimizing');
    win.el.addEventListener('animationend', () => {
      win.el.classList.remove('minimizing');
      win.el.style.display = 'none';
    }, { once: true });

    EventBus.emit('window:minimized', { id });
  },

  restore(id) {
    const win = windows.get(id);
    if (!win) return;
    win.state = 'normal';
    win.el.style.display = 'flex';
    win.el.classList.remove('is-maximized', 'is-snapped-left', 'is-snapped-right');
    this._applyRect(win, win.x, win.y, win.w, win.h);
    this.focus(id);
    EventBus.emit('window:restored', { id });
  },

  maximize(id) {
    const win = windows.get(id);
    if (!win) return;

    if (win.state === 'maximized') {
      win.state = 'normal';
      win.el.classList.remove('is-maximized');
      this._applyRect(win, win.x, win.y, win.w, win.h);
    } else {
      win.state = 'maximized';
      win.el.classList.add('is-maximized');
      const el = win.el;
      el.style.left = '0';
      el.style.top = '0';
      el.style.width = '100vw';
      el.style.height = `calc(100vh - 48px)`;
    }
    EventBus.emit('window:maximized', { id, state: win.state });
  },

  focus(id) {
    const win = windows.get(id);
    if (!win) return;

    // Show if minimized
    if (win.state === 'minimized') {
      this.restore(id);
      return;
    }

    windows.forEach((w, wid) => {
      w.el.classList.toggle('is-active', wid === id);
    });
    win.el.style.zIndex = ++zCounter;
    activeId = id;
    EventBus.emit('window:focused', { id, appId: win.appId });
  },

  setTitle(id, title) {
    const win = windows.get(id);
    if (!win) return;
    const titleEl = win.el.querySelector('.window-title');
    if (titleEl) titleEl.textContent = title;
  },

  setUnsaved(id, unsaved) {
    const win = windows.get(id);
    if (!win) return;
    let dot = win.el.querySelector('.window-unsaved');
    if (unsaved) {
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'window-unsaved';
        dot.title = 'Unsaved changes';
        win.el.querySelector('.window-title').after(dot);
      }
    } else {
      dot?.remove();
    }
  },

  getAll() {
    return [...windows.values()];
  },

  getById(id) {
    return windows.get(id);
  },

  // -------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------
  _buildWindow(id, appId, app, { w, h, x, y }) {
    const el = document.createElement('div');
    el.className = 'window';
    el.id = id;
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++zCounter};display:flex;`;

    el.innerHTML = `
      <div class="window-titlebar" data-win-id="${id}">
        <div class="window-controls">
          <button class="win-btn win-btn-close"    data-action="close"    title="Close"   ></button>
          <button class="win-btn win-btn-minimize" data-action="minimize" title="Minimize"></button>
          <button class="win-btn win-btn-maximize" data-action="maximize" title="Maximize"></button>
        </div>
        <div class="window-icon">${app.iconSvg || '📄'}</div>
        <div class="window-title">${app.name}</div>
      </div>
      <div class="window-body"></div>
      ${this._buildResizeHandles()}
    `;

    // Title bar buttons
    el.querySelector('[data-action="close"]').addEventListener('click', () => this.close(id));
    el.querySelector('[data-action="minimize"]').addEventListener('click', () => this.minimize(id));
    el.querySelector('[data-action="maximize"]').addEventListener('click', () => this.maximize(id));

    // Focus on click
    el.addEventListener('mousedown', (e) => {
      this.focus(id);
    }, true);

    // Drag
    this._attachDrag(el, id);

    // Resize
    this._attachResize(el, id);

    return el;
  },

  _buildResizeHandles() {
    const dirs = ['n','s','e','w','ne','nw','se','sw'];
    return dirs.map(d => `<div class="resize-handle resize-${d}" data-dir="${d}"></div>`).join('');
  },

  _attachDrag(el, id) {
    const titlebar = el.querySelector('.window-titlebar');
    let dragging = false, ox, oy, startX, startY;

    titlebar.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.win-btn')) return;

      const win = windows.get(id);
      if (!win || win.state === 'maximized') return;

      dragging = true;
      const rect = el.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      startX = rect.left; startY = rect.top;
      el.style.transition = 'none';
      document.body.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const win = windows.get(id);
      if (!win) { dragging = false; return; }

      let nx = e.clientX - ox;
      let ny = e.clientY - oy;

      // Clamp
      const maxX = window.innerWidth - 100;
      const maxY = window.innerHeight - 48 - 30;
      nx = Math.max(-win.w + 100, Math.min(maxX, nx));
      ny = Math.max(0, Math.min(maxY, ny));

      el.style.left = nx + 'px';
      el.style.top  = ny + 'px';
      win.x = nx; win.y = ny;

      // Snap preview
      this._updateSnapPreview(e.clientX, e.clientY, id);
    });

    document.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      dragging = false;
      document.body.style.cursor = '';

      const snapEl = snapPreview();
      if (!snapEl.classList.contains('hidden')) {
        snapEl.classList.add('hidden');
        // Apply snap
        const win = windows.get(id);
        if (win) {
          const zone = this._getSnapZone(e.clientX, e.clientY);
          if (zone) this._applySnap(id, zone);
        }
      }
    });

    // Double-click titlebar = maximize
    titlebar.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.win-btn')) this.maximize(id);
    });
  },

  _attachResize(el, id) {
    el.querySelectorAll('.resize-handle').forEach(handle => {
      const dir = handle.dataset.dir;
      let resizing = false, startX, startY, startW, startH, startL, startT;

      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const win = windows.get(id);
        if (!win || win.state !== 'normal') return;

        resizing = true;
        startX = e.clientX; startY = e.clientY;
        const rect = el.getBoundingClientRect();
        startW = rect.width; startH = rect.height;
        startL = rect.left;  startT = rect.top;
        el.style.transition = 'none';
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', (e) => {
        if (!resizing) return;
        const win = windows.get(id);
        if (!win) { resizing = false; return; }

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let { w, h, x, y } = { w: startW, h: startH, x: startL, y: startT };

        if (dir.includes('e'))  w = Math.max(win.minW, startW + dx);
        if (dir.includes('s'))  h = Math.max(win.minH, startH + dy);
        if (dir.includes('w')) { w = Math.max(win.minW, startW - dx); x = startL + startW - w; }
        if (dir.includes('n')) { h = Math.max(win.minH, startH - dy); y = startT + startH - h; }

        this._applyRect(win, x, y, w, h);
      });

      document.addEventListener('mouseup', () => {
        if (resizing) {
          resizing = false;
          document.body.style.userSelect = '';
        }
      });
    });
  },

  _applyRect(win, x, y, w, h) {
    const el = win.el;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.style.width  = w + 'px';
    el.style.height = h + 'px';
    win.x = x; win.y = y; win.w = w; win.h = h;
    EventBus.emit('window:resized', { id: win.id });
  },

  _updateSnapPreview(cx, cy, id) {
    const sp = snapPreview();
    const zone = this._getSnapZone(cx, cy);
    if (!zone) { sp.classList.add('hidden'); return; }

    const vh = window.innerHeight - 48;
    const vw = window.innerWidth;
    let rect;
    if (zone === 'left')  rect = { left: 0, top: 0, width: vw/2, height: vh };
    if (zone === 'right') rect = { left: vw/2, top: 0, width: vw/2, height: vh };
    if (zone === 'top')   rect = { left: 0, top: 0, width: vw, height: vh };

    sp.classList.remove('hidden');
    sp.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
  },

  _getSnapZone(cx, cy) {
    const threshold = 8;
    const vw = window.innerWidth;
    if (cy <= threshold) return 'top';
    if (cx <= threshold) return 'left';
    if (cx >= vw - threshold) return 'right';
    return null;
  },

  _applySnap(id, zone) {
    const win = windows.get(id);
    if (!win) return;
    const el = win.el;
    const vh = window.innerHeight - 48;
    const vw = window.innerWidth;

    el.classList.remove('is-snapped-left', 'is-snapped-right', 'is-maximized');

    if (zone === 'left') {
      win.state = 'snapped-l';
      el.classList.add('is-snapped-left');
      this._applyRect(win, 0, 0, Math.floor(vw/2), vh);
    } else if (zone === 'right') {
      win.state = 'snapped-r';
      el.classList.add('is-snapped-right');
      this._applyRect(win, Math.ceil(vw/2), 0, Math.floor(vw/2), vh);
    } else if (zone === 'top') {
      this.maximize(id);
    }
  },
};

function deactivateAll() {
  windows.forEach(w => w.el.classList.remove('is-active'));
  activeId = null;
}
