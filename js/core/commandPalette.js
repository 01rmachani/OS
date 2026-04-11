/* =========================================================
   BrowserOS — Command Palette (Ctrl+K)
   ========================================================= */
import { EventBus } from './eventBus.js';
import { FS } from './fileSystem.js';

let _WM, _appRegistry;
let _results = [];
let _selectedIdx = 0;

export const CommandPalette = {
  init(WindowManager, appRegistry) {
    _WM = WindowManager;
    _appRegistry = appRegistry;

    EventBus.on('commandpalette:open', () => this.open());

    const overlay = document.getElementById('command-palette');
    const input   = document.getElementById('cp-input');
    const backdrop = overlay.querySelector('.cp-backdrop');

    // Close on backdrop click
    backdrop.addEventListener('click', () => this.close());

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        this.close();
      }
      if (e.key === 'ArrowDown' && !overlay.classList.contains('hidden')) {
        e.preventDefault();
        _selectedIdx = Math.min(_selectedIdx + 1, _results.length - 1);
        this._highlight();
      }
      if (e.key === 'ArrowUp' && !overlay.classList.contains('hidden')) {
        e.preventDefault();
        _selectedIdx = Math.max(_selectedIdx - 1, 0);
        this._highlight();
      }
      if (e.key === 'Enter' && !overlay.classList.contains('hidden')) {
        e.preventDefault();
        this._runSelected();
      }
    });

    input.addEventListener('input', () => {
      _selectedIdx = 0;
      this._search(input.value.trim());
    });
  },

  open() {
    const overlay = document.getElementById('command-palette');
    const input   = document.getElementById('cp-input');
    overlay.classList.remove('hidden');
    input.value = '';
    _selectedIdx = 0;
    this._search('');
    requestAnimationFrame(() => input.focus());
  },

  close() {
    document.getElementById('command-palette').classList.add('hidden');
  },

  async _search(query) {
    const q = query.toLowerCase();
    _results = [];

    // 1. Apps
    const appItems = Object.entries(_appRegistry)
      .filter(([id, app]) => {
        const kws = (app.keywords || []).join(' ');
        return !q || app.name.toLowerCase().includes(q) || kws.includes(q) || id.includes(q);
      })
      .map(([id, app]) => ({
        type: 'app', icon: app.emoji || '📄',
        title: app.name, sub: 'Application',
        action: () => { _WM.open(id, {}); this.close(); }
      }));

    // 2. Actions
    const actionItems = [
      { label: 'Toggle Dark/Light Theme', icon: '🌓', action: () => {
        document.documentElement.classList.toggle('light-theme');
        const isLight = document.documentElement.classList.contains('light-theme');
        const s = JSON.parse(localStorage.getItem('os_settings') || '{}');
        s.theme = isLight ? 'light' : 'dark';
        localStorage.setItem('os_settings', JSON.stringify(s));
      }},
      { label: 'Switch to Workspace 1', icon: '1️⃣', action: () => EventBus.emit('workspace:switch', { workspace: 1 }) },
      { label: 'Switch to Workspace 2', icon: '2️⃣', action: () => EventBus.emit('workspace:switch', { workspace: 2 }) },
      { label: 'Switch to Workspace 3', icon: '3️⃣', action: () => EventBus.emit('workspace:switch', { workspace: 3 }) },
      { label: 'New Markdown Note', icon: '📝', action: () => _WM.open('editor', { newFile: true }) },
    ].filter(a => !q || a.label.toLowerCase().includes(q))
     .map(a => ({ type: 'action', icon: a.icon, title: a.label, sub: 'Action', action: () => { a.action(); this.close(); } }));

    // 3. Files (async)
    let fileItems = [];
    try {
      const files = await FS.search(query);
      fileItems = files.slice(0, 6).map(f => ({
        type: 'file', icon: '📄',
        title: f.name, sub: f.path,
        action: () => { this._openFile(f); this.close(); }
      }));
    } catch (e) {}

    if (!q) {
      _results = [...appItems.slice(0, 9)];
    } else {
      _results = [
        ...appItems.slice(0, 4),
        ...actionItems.slice(0, 3),
        ...fileItems.slice(0, 5),
      ];
    }

    this._render(q);
  },

  _render(q) {
    const container = document.getElementById('cp-results');
    if (!_results.length) {
      container.innerHTML = `<div class="cp-empty">No results for "${q}"</div>`;
      return;
    }

    const groups = {};
    _results.forEach((r, i) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push({ ...r, _i: i });
    });

    const typeLabels = { app: 'Applications', action: 'Actions', file: 'Files' };
    let html = '';
    for (const [type, items] of Object.entries(groups)) {
      html += `<div class="cp-group-label">${typeLabels[type] || type}</div>`;
      items.forEach(item => {
        html += `
          <div class="cp-item ${item._i === _selectedIdx ? 'selected' : ''}" data-idx="${item._i}">
            <div class="cp-item-icon">${item.icon}</div>
            <div class="cp-item-main">
              <div class="cp-item-title">${item.title}</div>
              ${item.sub ? `<div class="cp-item-sub">${item.sub}</div>` : ''}
            </div>
          </div>`;
      });
    }
    container.innerHTML = html;

    container.querySelectorAll('.cp-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        _selectedIdx = parseInt(el.dataset.idx);
        this._highlight();
      });
      el.addEventListener('click', () => {
        _selectedIdx = parseInt(el.dataset.idx);
        this._runSelected();
      });
    });
  },

  _highlight() {
    document.querySelectorAll('.cp-item').forEach((el, i) => {
      el.classList.toggle('selected', parseInt(el.dataset.idx) === _selectedIdx);
    });
    const sel = document.querySelector('.cp-item.selected');
    sel?.scrollIntoView({ block: 'nearest' });
  },

  _runSelected() {
    const item = _results[_selectedIdx];
    if (item?.action) item.action();
  },

  _openFile(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext === 'md') {
      _WM.open('editor', { path: f.path });
    } else {
      _WM.open('filemanager', { path: f.parentPath });
    }
  },
};
