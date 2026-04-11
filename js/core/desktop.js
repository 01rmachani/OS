/* =========================================================
   BrowserOS — Desktop (icons, wallpaper, right-click menu)
   ========================================================= */
import { EventBus } from './eventBus.js';

let _WM, _appRegistry;

export const Desktop = {
  init(WindowManager, appRegistry) {
    _WM = WindowManager;
    _appRegistry = appRegistry;
    this._renderIcons();
    this._bindDesktopContextMenu();
    this._bindKeyboardShortcuts();
    this._applyStoredWallpaper();
  },

  _renderIcons() {
    const grid = document.getElementById('desktop-icons');
    grid.innerHTML = '';

    const desktopApps = Object.entries(_appRegistry)
      .filter(([, app]) => app.showOnDesktop !== false);

    desktopApps.forEach(([id, app]) => {
      const icon = document.createElement('div');
      icon.className = 'desktop-icon';
      icon.dataset.appId = id;
      icon.innerHTML = `
        <div class="desktop-icon-img ${app.iconBg || 'icon-bg-violet'}">${app.emoji || '📄'}</div>
        <div class="desktop-icon-label">${app.name}</div>
      `;

      // Single click = select
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
      });

      // Double click = open
      icon.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        _WM.open(id, {});
      });

      // Right-click on icon
      icon.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        EventBus.emit('contextmenu:show', {
          x: e.clientX, y: e.clientY,
          items: [
            { label: 'Open', icon: '🚀', action: () => _WM.open(id, {}) },
            { separator: true },
            { label: 'App Info', icon: 'ℹ️', action: () => {
              EventBus.emit('notification:add', {
                type: 'info',
                title: app.name,
                message: app.description || 'No description available.',
                icon: app.emoji,
              });
            }},
          ]
        });
      });

      grid.appendChild(icon);
    });

    // Deselect on desktop click
    document.getElementById('desktop').addEventListener('click', () => {
      document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
    });
  },

  _bindDesktopContextMenu() {
    document.getElementById('desktop').addEventListener('contextmenu', (e) => {
      if (e.target.closest('.desktop-icon') || e.target.closest('.window')) return;
      e.preventDefault();

      EventBus.emit('contextmenu:show', {
        x: e.clientX, y: e.clientY,
        items: [
          { label: 'New Note',   icon: '📝', action: () => _WM.open('editor', { newFile: true }) },
          { label: 'New Folder', icon: '📁', action: () => this._newFolderDialog() },
          { separator: true },
          { label: 'Open File Manager', icon: '🗂️', action: () => _WM.open('filemanager', {}) },
          { label: 'Open Terminal',     icon: '💻', action: () => _WM.open('terminal', {}) },
          { separator: true },
          { label: 'Change Wallpaper', icon: '🖼️', action: () => _WM.open('settings', { panel: 'wallpaper' }) },
          { label: 'Settings',         icon: '⚙️', action: () => _WM.open('settings', {}) },
        ]
      });
    });
  },

  _newFolderDialog() {
    const name = prompt('New folder name:', 'New Folder');
    if (name) {
      import('../core/fileSystem.js').then(({ FS }) => {
        FS.mkdir('/notes/' + name).then(() => {
          EventBus.emit('notification:add', {
            type: 'success', title: 'Folder Created',
            message: `Created "${name}"`, icon: '📁',
          });
        });
      });
    }
  },

  _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const meta = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd+K = Command Palette
      if (meta && e.key === 'k') {
        e.preventDefault();
        EventBus.emit('commandpalette:open');
      }

      // Super (Win key) + number = workspace switch
      if (e.key === '1' && meta && e.altKey) EventBus.emit('workspace:switch', { workspace: 1 });
      if (e.key === '2' && meta && e.altKey) EventBus.emit('workspace:switch', { workspace: 2 });
      if (e.key === '3' && meta && e.altKey) EventBus.emit('workspace:switch', { workspace: 3 });

      // F1 = command palette (alternative)
      if (e.key === 'F1') {
        e.preventDefault();
        EventBus.emit('commandpalette:open');
      }

      // ? key = shortcuts help (when no input focused)
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        this._showShortcutsHelp();
      }
    });
  },

  _showShortcutsHelp() {
    const shortcuts = [
      ['Ctrl+K', 'Open Command Palette'],
      ['Ctrl+W', 'Close active window'],
      ['Ctrl+Tab', 'Next window'],
      ['Ctrl+Alt+1-3', 'Switch workspace'],
      ['F1', 'Open Command Palette'],
      ['?', 'Show this help'],
    ];
    const html = shortcuts.map(([k, d]) =>
      `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;gap:16px;">
        <kbd style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;font-size:12px;">${k}</kbd>
        <span style="color:rgba(255,255,255,0.6);">${d}</span>
      </div>`
    ).join('');

    // Create a simple floating help window
    const existing = document.getElementById('shortcuts-help');
    if (existing) { existing.remove(); return; }

    const div = document.createElement('div');
    div.id = 'shortcuts-help';
    div.style.cssText = `
      position:fixed;right:80px;bottom:60px;z-index:99999;
      background:rgba(15,15,25,0.9);backdrop-filter:blur(20px);
      border:1px solid rgba(255,255,255,0.12);border-radius:12px;
      padding:16px;min-width:240px;box-shadow:0 20px 60px rgba(0,0,0,0.6);
    `;
    div.innerHTML = `<div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:10px;">Keyboard Shortcuts</div>${html}`;
    document.body.appendChild(div);

    const close = (e) => {
      if (!div.contains(e.target)) { div.remove(); document.removeEventListener('click', close); }
    };
    setTimeout(() => document.addEventListener('click', close), 100);
  },

  _applyStoredWallpaper() {
    try {
      const settings = JSON.parse(localStorage.getItem('os_settings') || '{}');
      const wp = settings.wallpaper || 'default';
      this.setWallpaper(wp);

      // Apply theme
      if (settings.theme === 'light') document.documentElement.classList.add('light-theme');
      if (settings.accent) document.documentElement.className =
        document.documentElement.className.replace(/accent-\S+/g, '') + ' accent-' + settings.accent;
    } catch (e) {}
  },

  setWallpaper(name) {
    const desktop = document.getElementById('desktop');
    desktop.className = desktop.className.replace(/wallpaper-\S+/g, '').trim();
    desktop.classList.add('wallpaper-' + name);
  },
};
