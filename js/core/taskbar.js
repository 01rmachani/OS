/* =========================================================
   BrowserOS — Taskbar (running apps, clock, start menu toggle)
   ========================================================= */
import { EventBus } from './eventBus.js';

let _WM, _appRegistry;

export const Taskbar = {
  init(WindowManager, appRegistry) {
    _WM = WindowManager;
    _appRegistry = appRegistry;
    this._startClock();
    this._bindStartMenu();
    this._bindNotificationsBtn();
    this._bindWorkspaces();
    this._listenWindowEvents();
    this._populateStartMenu();
  },

  // -------------------------------------------------------
  _startClock() {
    const timeEl   = document.getElementById('clock-time');
    const periodEl = document.getElementById('clock-period');
    const clockEl  = document.getElementById('clock');

    const update = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const pm = h >= 12;
      h = h % 12 || 12;
      timeEl.textContent = `${h}:${m}`;
      periodEl.textContent = pm ? 'PM' : 'AM';
    };

    update();
    setInterval(update, 1000);

    // Full date tooltip on hover
    clockEl.title = '';
    clockEl.addEventListener('mouseenter', () => {
      const now = new Date();
      clockEl.title = now.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    });
  },

  // -------------------------------------------------------
  _bindStartMenu() {
    const btn = document.getElementById('start-btn');
    const menu = document.getElementById('start-menu');
    const searchInput = menu.querySelector('.start-search');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !menu.classList.contains('hidden');
      if (open) {
        this._closeStartMenu();
      } else {
        menu.classList.remove('hidden');
        menu.classList.add('opening');
        menu.addEventListener('animationend', () => menu.classList.remove('opening'), { once: true });
        btn.classList.add('active');
        searchInput.focus();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        this._closeStartMenu();
      }
    });

    // Search filtering
    searchInput.addEventListener('input', (e) => {
      this._filterStartMenu(e.target.value);
    });

    // Settings shortcut
    document.getElementById('start-settings')?.addEventListener('click', () => {
      _WM.open('settings', {});
      this._closeStartMenu();
    });

    // Power button
    document.getElementById('start-shutdown')?.addEventListener('click', () => {
      if (confirm('Shut down BrowserOS?\n\nAll unsaved changes will be lost.')) {
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0f;color:rgba(255,255,255,0.3);font-family:Inter,sans-serif;font-size:14px;flex-direction:column;gap:12px;">
            <div style="font-size:32px">💤</div>
            <div>BrowserOS has shut down.</div>
            <div style="font-size:12px">Refresh the page to restart.</div>
          </div>`;
      }
    });
  },

  _closeStartMenu() {
    const menu = document.getElementById('start-menu');
    menu.classList.add('hidden');
    document.getElementById('start-btn').classList.remove('active');
  },

  _populateStartMenu() {
    const grid = document.getElementById('start-menu-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (const [id, app] of Object.entries(_appRegistry)) {
      const item = document.createElement('div');
      item.className = 'start-app-item';
      item.dataset.appId = id;
      item.innerHTML = `
        <div class="start-app-icon">${app.emoji || '📄'}</div>
        <div class="start-app-label">${app.name}</div>
      `;
      item.addEventListener('click', () => {
        _WM.open(id, {});
        this._closeStartMenu();
      });
      grid.appendChild(item);
    }
  },

  _filterStartMenu(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.start-app-item').forEach(item => {
      const label = item.querySelector('.start-app-label').textContent.toLowerCase();
      const appId = item.dataset.appId;
      const app = _appRegistry[appId];
      const match = !q || label.includes(q) || (app?.keywords || []).some(k => k.includes(q));
      item.style.display = match ? '' : 'none';
    });
  },

  // -------------------------------------------------------
  _bindNotificationsBtn() {
    const btn   = document.getElementById('notifications-btn');
    const panel = document.getElementById('notification-panel');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
      btn.classList.toggle('has-unread', false);
      document.getElementById('notification-badge').classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove('open');
      }
    });
  },

  // -------------------------------------------------------
  _bindWorkspaces() {
    const tray = document.getElementById('system-tray');
    const dotsEl = document.createElement('div');
    dotsEl.className = 'workspace-dots';
    dotsEl.id = 'workspace-dots';
    dotsEl.innerHTML = [1,2,3].map(i =>
      `<div class="workspace-dot ${i===1?'active':''}" data-ws="${i}" title="Workspace ${i}"></div>`
    ).join('');
    tray.insertBefore(dotsEl, tray.firstChild);

    dotsEl.addEventListener('click', (e) => {
      const ws = parseInt(e.target.dataset.ws);
      if (ws) EventBus.emit('workspace:switch', { workspace: ws });
    });

    EventBus.on('workspace:switched', ({ workspace }) => {
      dotsEl.querySelectorAll('.workspace-dot').forEach(d => {
        d.classList.toggle('active', parseInt(d.dataset.ws) === workspace);
      });
    });
  },

  // -------------------------------------------------------
  _listenWindowEvents() {
    EventBus.on('window:opened', ({ id, appId, title }) => {
      this._addTaskbarBtn(id, appId, title);
    });

    EventBus.on('window:closed', ({ id }) => {
      this._removeTaskbarBtn(id);
    });

    EventBus.on('window:focused', ({ id, appId }) => {
      document.querySelectorAll('.taskbar-app-btn').forEach(b => {
        b.classList.toggle('is-active', b.dataset.winId === id);
        b.classList.remove('is-minimized');
      });
    });

    EventBus.on('window:minimized', ({ id }) => {
      const btn = document.querySelector(`[data-win-id="${id}"]`);
      if (btn) { btn.classList.add('is-minimized'); btn.classList.remove('is-active'); }
    });

    EventBus.on('window:restored', ({ id }) => {
      const btn = document.querySelector(`[data-win-id="${id}"]`);
      if (btn) btn.classList.remove('is-minimized');
    });
  },

  _addTaskbarBtn(id, appId, title) {
    const app = _appRegistry[appId];
    const container = document.getElementById('running-apps');
    const btn = document.createElement('button');
    btn.className = 'taskbar-app-btn';
    btn.dataset.winId = id;
    btn.innerHTML = `
      <span class="app-icon">${app?.emoji || '📄'}</span>
      <span class="app-label">${title}</span>
    `;
    btn.addEventListener('click', () => {
      const win = _WM.getById(id);
      if (!win) return;
      if (win.state === 'minimized') {
        _WM.restore(id);
      } else if (win.el.classList.contains('is-active')) {
        _WM.minimize(id);
      } else {
        _WM.focus(id);
      }
    });

    // Right-click context menu on taskbar button
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      EventBus.emit('contextmenu:show', {
        x: e.clientX, y: e.clientY,
        items: [
          { label: 'Restore',  icon: '⬆️', action: () => _WM.restore(id) },
          { label: 'Minimize', icon: '⬇️', action: () => _WM.minimize(id) },
          { label: 'Maximize', icon: '⬛', action: () => _WM.maximize(id) },
          { separator: true },
          { label: 'Close',    icon: '✕',  action: () => _WM.close(id), danger: true },
        ]
      });
    });

    container.appendChild(btn);
  },

  _removeTaskbarBtn(id) {
    document.querySelector(`[data-win-id="${id}"]`)?.remove();
  },

  updateAppTitle(id, title) {
    const btn = document.querySelector(`[data-win-id="${id}"] .app-label`);
    if (btn) btn.textContent = title;
  },
};
