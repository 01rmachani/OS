/* =========================================================
   BrowserOS — Settings App
   ========================================================= */
import { EventBus } from '../core/eventBus.js';

const ACCENTS = [
  { name: 'Violet',   primary: '#7c6af7', secondary: '#06b6d4' },
  { name: 'Cyan',     primary: '#06b6d4', secondary: '#7c6af7' },
  { name: 'Rose',     primary: '#f43f5e', secondary: '#f59e0b' },
  { name: 'Amber',    primary: '#f59e0b', secondary: '#10b981' },
  { name: 'Emerald',  primary: '#10b981', secondary: '#06b6d4' },
  { name: 'Orange',   primary: '#f97316', secondary: '#a855f7' },
  { name: 'Pink',     primary: '#ec4899', secondary: '#8b5cf6' },
  { name: 'Indigo',   primary: '#6366f1', secondary: '#10b981' },
];

const WALLPAPERS = [
  { id: 'gradient-dark', label: 'Aurora Gradient', class: 'wallpaper-gradient' },
  { id: 'grid-dark',     label: 'Dark Grid',       class: 'wallpaper-grid' },
  { id: 'aurora',        label: 'Aurora Mesh',     class: 'wallpaper-aurora' },
  { id: 'dots',          label: 'Dot Matrix',      class: 'wallpaper-dots' },
  { id: 'topography',    label: 'Topography',      class: 'wallpaper-topo' },
  { id: 'solid',         label: 'Solid Dark',      class: 'wallpaper-solid' },
];

export const SettingsApp = {
  id: 'settings', name: 'Settings', emoji: '⚙️',
  iconBg: 'icon-bg-gray', defaultWidth: 780, defaultHeight: 560,
  keywords: ['settings', 'theme', 'wallpaper', 'accent', 'preferences', 'configuration'],
  description: 'Customize theme, wallpaper, accent color, and system preferences.',

  mount(container, args, winId) {
    const get = (k, def) => localStorage.getItem('os_' + k) ?? def;

    // Load current prefs
    let currentTheme    = get('theme', 'dark');
    let currentAccent   = parseInt(get('accent_idx', '0'));
    let currentWall     = get('wallpaper', 'gradient-dark');
    let currentFontSize = parseInt(get('font_size', '14'));
    let currentTaskbar  = get('taskbar_pos', 'bottom');
    let apiKey          = get('anthropic_key', '');
    let animations      = get('animations', 'true') === 'true';
    let glassEnabled    = get('glass', 'true') === 'true';

    container.innerHTML = `
      <div class="settings-app">
        <!-- Nav -->
        <div class="settings-nav">
          <div class="settings-nav-item active" data-section="appearance">
            <span class="settings-nav-icon">🎨</span> Appearance
          </div>
          <div class="settings-nav-item" data-section="desktop">
            <span class="settings-nav-icon">🖥️</span> Desktop
          </div>
          <div class="settings-nav-item" data-section="system">
            <span class="settings-nav-icon">⚙️</span> System
          </div>
          <div class="settings-nav-item" data-section="api">
            <span class="settings-nav-icon">🔑</span> AI & API
          </div>
          <div class="settings-nav-item" data-section="about">
            <span class="settings-nav-icon">ℹ️</span> About
          </div>
        </div>

        <!-- Content -->
        <div class="settings-content" id="settings-content">

          <!-- Appearance -->
          <div class="settings-section active" id="section-appearance">
            <h2 class="settings-section-title">Appearance</h2>

            <div class="settings-group">
              <div class="settings-group-label">Theme</div>
              <div class="settings-theme-picker">
                <button class="settings-theme-btn ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
                  <div class="theme-preview dark-preview"></div>
                  <span>Dark</span>
                </button>
                <button class="settings-theme-btn ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
                  <div class="theme-preview light-preview"></div>
                  <span>Light</span>
                </button>
                <button class="settings-theme-btn ${currentTheme === 'system' ? 'active' : ''}" data-theme="system">
                  <div class="theme-preview system-preview"></div>
                  <span>System</span>
                </button>
              </div>
            </div>

            <div class="settings-group">
              <div class="settings-group-label">Accent Color</div>
              <div class="settings-accents">
                ${ACCENTS.map((a, i) => `
                  <button class="settings-accent-swatch ${i === currentAccent ? 'active' : ''}"
                    data-idx="${i}" title="${a.name}"
                    style="background: linear-gradient(135deg, ${a.primary}, ${a.secondary});">
                  </button>`).join('')}
              </div>
              <div class="settings-accent-name" id="accent-name">${ACCENTS[currentAccent].name}</div>
            </div>

            <div class="settings-group">
              <div class="settings-group-label">Font Size</div>
              <div class="settings-row">
                <input type="range" class="settings-slider" id="font-size-slider"
                  min="12" max="20" step="1" value="${currentFontSize}">
                <span class="settings-slider-val" id="font-size-val">${currentFontSize}px</span>
              </div>
            </div>

            <div class="settings-group">
              <div class="settings-row settings-toggle-row">
                <div>
                  <div class="settings-toggle-label">Window Glass Effect</div>
                  <div class="settings-toggle-desc">Frosted glass window backgrounds</div>
                </div>
                <label class="settings-toggle">
                  <input type="checkbox" id="glass-toggle" ${glassEnabled ? 'checked' : ''}>
                  <span class="settings-toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-group">
              <div class="settings-row settings-toggle-row">
                <div>
                  <div class="settings-toggle-label">Animations</div>
                  <div class="settings-toggle-desc">Window open/close and transition animations</div>
                </div>
                <label class="settings-toggle">
                  <input type="checkbox" id="anim-toggle" ${animations ? 'checked' : ''}>
                  <span class="settings-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Desktop -->
          <div class="settings-section" id="section-desktop">
            <h2 class="settings-section-title">Desktop & Wallpaper</h2>

            <div class="settings-group">
              <div class="settings-group-label">Wallpaper</div>
              <div class="settings-wallpapers">
                ${WALLPAPERS.map(w => `
                  <button class="settings-wallpaper-btn ${currentWall === w.id ? 'active' : ''}"
                    data-wall="${w.id}" data-class="${w.class}">
                    <div class="wallpaper-thumb ${w.class}"></div>
                    <span>${w.label}</span>
                  </button>`).join('')}
              </div>
            </div>

            <div class="settings-group">
              <div class="settings-group-label">Taskbar Position</div>
              <div class="settings-row" style="gap:8px;">
                <button class="settings-option-btn ${currentTaskbar === 'bottom' ? 'active' : ''}" data-taskbar="bottom">Bottom</button>
                <button class="settings-option-btn ${currentTaskbar === 'top' ? 'active' : ''}" data-taskbar="top">Top</button>
              </div>
            </div>
          </div>

          <!-- System -->
          <div class="settings-section" id="section-system">
            <h2 class="settings-section-title">System</h2>

            <div class="settings-group">
              <div class="settings-group-label">Storage</div>
              <div class="settings-storage-info" id="storage-info">Calculating…</div>
              <button class="settings-btn settings-btn-danger" id="reset-fs-btn">🗑️ Clear All Files</button>
            </div>

            <div class="settings-group">
              <div class="settings-group-label">Reset</div>
              <button class="settings-btn" id="reset-settings-btn">↩ Reset All Settings</button>
            </div>

            <div class="settings-group">
              <div class="settings-group-label">Keyboard Shortcuts</div>
              <div class="settings-shortcuts">
                ${[
                  ['Ctrl+K', 'Command Palette'],
                  ['Ctrl+Alt+1/2/3', 'Switch Workspace'],
                  ['?', 'Show Shortcuts'],
                  ['F11', 'Fullscreen'],
                ].map(([k, v]) => `<div class="settings-shortcut"><kbd>${k}</kbd><span>${v}</span></div>`).join('')}
              </div>
            </div>
          </div>

          <!-- API -->
          <div class="settings-section" id="section-api">
            <h2 class="settings-section-title">AI & API Settings</h2>

            <div class="settings-group">
              <div class="settings-group-label">Anthropic API Key</div>
              <div class="settings-toggle-desc" style="margin-bottom:8px;">
                Required to use real AI responses in the AI Terminal. Without a key, responses are simulated.
                <br><small style="color:var(--text-muted);">Your key is stored only in localStorage.</small>
              </div>
              <div class="settings-row" style="gap:8px;">
                <input type="password" class="settings-input" id="api-key-input"
                  placeholder="sk-ant-api..." value="${apiKey}">
                <button class="settings-btn" id="save-api-key">Save</button>
                <button class="settings-btn settings-btn-danger" id="clear-api-key">Clear</button>
              </div>
              <div class="settings-api-status" id="api-status">
                ${apiKey ? '✅ API key configured' : '⚪ No API key (simulated mode)'}
              </div>
            </div>

            <div class="settings-group">
              <div class="settings-group-label">AI Model</div>
              <select class="settings-select" id="ai-model-select">
                <option value="claude-sonnet-4-6" ${get('ai_model','claude-sonnet-4-6')==='claude-sonnet-4-6'?'selected':''}>Claude Sonnet 4.6 (Recommended)</option>
                <option value="claude-opus-4-6" ${get('ai_model','claude-sonnet-4-6')==='claude-opus-4-6'?'selected':''}>Claude Opus 4.6 (Most capable)</option>
                <option value="claude-haiku-4-5-20251001" ${get('ai_model','claude-sonnet-4-6')==='claude-haiku-4-5-20251001'?'selected':''}>Claude Haiku 4.5 (Fastest)</option>
              </select>
            </div>
          </div>

          <!-- About -->
          <div class="settings-section" id="section-about">
            <h2 class="settings-section-title">About BrowserOS</h2>
            <div class="settings-about">
              <div class="settings-about-logo">🖥️</div>
              <div class="settings-about-name">BrowserOS</div>
              <div class="settings-about-version">Version 1.0.0 — Knowledge Graph Edition</div>
              <div class="settings-about-desc">
                A fully-featured OS running entirely in your browser. No server required.
                Built with pure HTML, CSS, and JavaScript using ES Modules.
              </div>
              <div class="settings-about-stack">
                <span class="settings-stack-badge">D3.js</span>
                <span class="settings-stack-badge">Dexie.js</span>
                <span class="settings-stack-badge">marked.js</span>
                <span class="settings-stack-badge">Monaco Editor</span>
                <span class="settings-stack-badge">Fuse.js</span>
                <span class="settings-stack-badge">highlight.js</span>
                <span class="settings-stack-badge">PWA</span>
              </div>
              <div class="settings-about-links">
                <a class="settings-about-link" href="https://01rmachani.github.io/OS/" target="_blank">🌐 Live Site</a>
                <a class="settings-about-link" href="https://github.com/01rmachani/OS" target="_blank">📂 GitHub</a>
              </div>
            </div>
          </div>

        </div>
      </div>`;

    // ── Nav switching ──────────────────────────────────────────
    container.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
        container.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        const section = container.querySelector('#section-' + item.dataset.section);
        if (section) section.classList.add('active');

        if (item.dataset.section === 'system') updateStorageInfo();
      });
    });

    // ── Theme ──────────────────────────────────────────────────
    container.querySelectorAll('.settings-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTheme = btn.dataset.theme;
        localStorage.setItem('os_theme', currentTheme);
        container.querySelectorAll('.settings-theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyTheme(currentTheme);
      });
    });

    const applyTheme = (theme) => {
      const html = document.documentElement;
      if (theme === 'dark')  { html.classList.remove('light-theme'); }
      if (theme === 'light') { html.classList.add('light-theme'); }
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.classList.toggle('light-theme', !prefersDark);
      }
      EventBus.emit('settings:theme', { theme });
    };

    // ── Accent color ───────────────────────────────────────────
    container.querySelectorAll('.settings-accent-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        currentAccent = parseInt(btn.dataset.idx);
        localStorage.setItem('os_accent_idx', currentAccent);
        container.querySelectorAll('.settings-accent-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        container.querySelector('#accent-name').textContent = ACCENTS[currentAccent].name;
        applyAccent(currentAccent);
      });
    });

    const applyAccent = (idx) => {
      const accent = ACCENTS[idx];
      const root = document.documentElement;
      root.style.setProperty('--accent-primary', accent.primary);
      root.style.setProperty('--accent-secondary', accent.secondary);
      root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`);
      EventBus.emit('settings:accent', { accent });
    };

    // ── Font size ──────────────────────────────────────────────
    const fontSlider = container.querySelector('#font-size-slider');
    const fontVal    = container.querySelector('#font-size-val');
    fontSlider.addEventListener('input', () => {
      currentFontSize = parseInt(fontSlider.value);
      fontVal.textContent = currentFontSize + 'px';
      localStorage.setItem('os_font_size', currentFontSize);
      document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
    });

    // ── Glass toggle ───────────────────────────────────────────
    container.querySelector('#glass-toggle').addEventListener('change', (e) => {
      glassEnabled = e.target.checked;
      localStorage.setItem('os_glass', glassEnabled);
      document.documentElement.classList.toggle('no-glass', !glassEnabled);
    });

    // ── Animations toggle ──────────────────────────────────────
    container.querySelector('#anim-toggle').addEventListener('change', (e) => {
      animations = e.target.checked;
      localStorage.setItem('os_animations', animations);
      document.documentElement.classList.toggle('no-animations', !animations);
    });

    // ── Wallpaper ──────────────────────────────────────────────
    container.querySelectorAll('.settings-wallpaper-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentWall = btn.dataset.wall;
        localStorage.setItem('os_wallpaper', currentWall);
        container.querySelectorAll('.settings-wallpaper-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyWallpaper(btn.dataset.wall, btn.dataset.class);
      });
    });

    const applyWallpaper = (id, cls) => {
      const desktop = document.getElementById('desktop');
      if (!desktop) return;
      desktop.className = desktop.className.replace(/wallpaper-\S+/g, '').trim();
      if (cls) desktop.classList.add(cls);
      EventBus.emit('settings:wallpaper', { wallpaper: id });
    };

    // ── Taskbar position ───────────────────────────────────────
    container.querySelectorAll('[data-taskbar]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTaskbar = btn.dataset.taskbar;
        localStorage.setItem('os_taskbar_pos', currentTaskbar);
        container.querySelectorAll('[data-taskbar]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const taskbar = document.getElementById('taskbar');
        if (taskbar) {
          taskbar.style.top    = currentTaskbar === 'top' ? '0' : '';
          taskbar.style.bottom = currentTaskbar === 'bottom' ? '0' : '';
        }
      });
    });

    // ── API key ────────────────────────────────────────────────
    container.querySelector('#save-api-key').addEventListener('click', () => {
      apiKey = container.querySelector('#api-key-input').value.trim();
      localStorage.setItem('os_anthropic_key', apiKey);
      container.querySelector('#api-status').textContent = apiKey ? '✅ API key saved' : '⚪ No API key';
      EventBus.emit('settings:apikey', { key: apiKey });
    });

    container.querySelector('#clear-api-key').addEventListener('click', () => {
      apiKey = '';
      localStorage.removeItem('os_anthropic_key');
      container.querySelector('#api-key-input').value = '';
      container.querySelector('#api-status').textContent = '⚪ No API key (simulated mode)';
      EventBus.emit('settings:apikey', { key: '' });
    });

    container.querySelector('#ai-model-select').addEventListener('change', (e) => {
      localStorage.setItem('os_ai_model', e.target.value);
    });

    // ── Storage info ───────────────────────────────────────────
    const updateStorageInfo = async () => {
      const el = container.querySelector('#storage-info');
      try {
        const estimate = await navigator.storage?.estimate?.();
        if (estimate) {
          const used  = (estimate.usage  / 1024 / 1024).toFixed(2);
          const quota = (estimate.quota  / 1024 / 1024).toFixed(0);
          el.innerHTML = `Used: <strong>${used} MB</strong> of ${quota} MB available`;
        } else {
          el.textContent = 'Storage estimate unavailable';
        }
      } catch {
        el.textContent = 'Storage info unavailable';
      }
    };

    container.querySelector('#reset-settings-btn').addEventListener('click', () => {
      if (!confirm('Reset all settings to defaults?')) return;
      ['theme','accent_idx','wallpaper','font_size','taskbar_pos','glass','animations']
        .forEach(k => localStorage.removeItem('os_' + k));
      applyTheme('dark');
      applyAccent(0);
      document.documentElement.style.removeProperty('--base-font-size');
      EventBus.emit('notification:add', { type: 'success', title: 'Settings Reset', message: 'All settings restored to defaults.', icon: '✓', ttl: 3000 });
    });

    container.querySelector('#reset-fs-btn').addEventListener('click', async () => {
      if (!confirm('Delete ALL files? This cannot be undone.')) return;
      try {
        const { FS } = await import('../core/fileSystem.js');
        const files = await FS.getAllFiles();
        for (const f of files) await FS.delete(f.path);
        EventBus.emit('notification:add', { type: 'info', title: 'Files Cleared', message: 'All files have been deleted.', icon: '🗑️', ttl: 4000 });
      } catch (e) {
        EventBus.emit('notification:add', { type: 'error', title: 'Error', message: e.message, icon: '❌', ttl: 5000 });
      }
    });

    // ── Apply saved settings on mount ─────────────────────────
    applyTheme(currentTheme);
    applyAccent(currentAccent);
    document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
  }
};
