/* =========================================================
   BrowserOS — Monaco IDE App (VS Code-like)
   ========================================================= */
import { FS } from '../core/fileSystem.js';
import { EventBus } from '../core/eventBus.js';

export const MonacoIDEApp = {
  id: 'ide', name: 'Code IDE', emoji: '💻',
  iconBg: 'icon-bg-blue', defaultWidth: 1100, defaultHeight: 700,
  keywords: ['ide', 'code', 'editor', 'monaco', 'vscode', 'programming', 'develop'],
  description: 'Full VS Code-like IDE with Monaco Editor, tabs, file tree, and integrated terminal.',

  mount(container, args, winId) {
    container.innerHTML = `
      <div class="ide-app">
        <!-- Activity Bar -->
        <div class="ide-activity-bar">
          <button class="ide-activity-btn active" data-panel="explorer" title="Explorer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 3h8l2 2h8v14H3z"/>
            </svg>
          </button>
          <button class="ide-activity-btn" data-panel="search" title="Search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button class="ide-activity-btn" data-panel="terminal" title="Terminal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
          </button>
          <div style="flex:1"></div>
          <button class="ide-activity-btn" data-panel="settings" title="Settings" id="ide-settings-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        <!-- Sidebar -->
        <div class="ide-sidebar" id="ide-sidebar">
          <!-- Explorer Panel -->
          <div class="ide-panel active" id="panel-explorer">
            <div class="ide-panel-header">
              <span>EXPLORER</span>
              <button class="ide-panel-action" id="ide-new-file" title="New File">+</button>
            </div>
            <div class="ide-file-tree" id="ide-file-tree"></div>
          </div>

          <!-- Search Panel -->
          <div class="ide-panel" id="panel-search">
            <div class="ide-panel-header"><span>SEARCH</span></div>
            <div style="padding:8px;">
              <input type="text" class="ide-search-input" id="ide-search-input" placeholder="Search in files…">
            </div>
            <div class="ide-search-results" id="ide-search-results"></div>
          </div>

          <!-- Terminal Panel (sidebar version) -->
          <div class="ide-panel" id="panel-terminal">
            <div class="ide-panel-header"><span>TERMINAL</span></div>
            <div style="padding:8px;color:var(--text-muted);font-size:12px;">Use the integrated terminal below.</div>
          </div>
        </div>

        <!-- Editor Area -->
        <div class="ide-editor-area">
          <!-- Tab Bar -->
          <div class="ide-tab-bar" id="ide-tab-bar">
            <div class="ide-tabs" id="ide-tabs"></div>
            <div class="ide-tab-actions">
              <button class="ide-tab-action-btn" id="ide-split-btn" title="Split Editor">⊟</button>
            </div>
          </div>

          <!-- Editor Container -->
          <div class="ide-editor-container" id="ide-editor-container">
            <div class="ide-welcome" id="ide-welcome">
              <div class="ide-welcome-logo">💻</div>
              <div class="ide-welcome-title">BrowserOS Code IDE</div>
              <div class="ide-welcome-subtitle">VS Code-like development environment</div>
              <div class="ide-welcome-actions">
                <button class="ide-welcome-btn" id="ide-open-file-btn">📂 Open File</button>
                <button class="ide-welcome-btn" id="ide-new-file-btn2">📄 New File</button>
              </div>
              <div class="ide-welcome-tips">
                <div class="ide-welcome-tip"><kbd>Ctrl</kbd>+<kbd>S</kbd> Save</div>
                <div class="ide-welcome-tip"><kbd>Ctrl</kbd>+<kbd>\</kbd> Split</div>
                <div class="ide-welcome-tip"><kbd>Ctrl</kbd>+<kbd>`</kbd> Terminal</div>
                <div class="ide-welcome-tip"><kbd>F1</kbd> Command Palette</div>
              </div>
            </div>
            <div id="ide-monaco-container" style="display:none;flex:1;height:100%;"></div>
          </div>

          <!-- Integrated Terminal -->
          <div class="ide-terminal-panel" id="ide-terminal-panel" style="display:none;">
            <div class="ide-terminal-header">
              <span>TERMINAL</span>
              <button class="ide-terminal-close" id="ide-terminal-close">✕</button>
            </div>
            <div class="ide-terminal-body" id="ide-terminal-body">
              <div class="ide-term-output" id="ide-term-output"></div>
              <div class="ide-term-input-line">
                <span class="ide-term-prompt">$ </span>
                <input type="text" class="ide-term-input" id="ide-term-input" spellcheck="false" autocomplete="off" placeholder="Type a command...">
              </div>
            </div>
          </div>

          <!-- Status Bar -->
          <div class="ide-status-bar">
            <div class="ide-status-left">
              <span class="ide-status-item" id="ide-status-branch">⎇ main</span>
              <span class="ide-status-item" id="ide-status-errors">✓ No errors</span>
            </div>
            <div class="ide-status-right">
              <span class="ide-status-item" id="ide-status-lang">Plain Text</span>
              <span class="ide-status-item" id="ide-status-pos">Ln 1, Col 1</span>
              <span class="ide-status-item" id="ide-status-encoding">UTF-8</span>
            </div>
          </div>
        </div>
      </div>`;

    // State
    let tabs = [];         // { id, path, name, dirty, model }
    let activeTabId = null;
    let monacoEditor = null;
    let monacoReady = false;
    let splitMode = false;
    let monacoEditor2 = null;
    let termHistory = [];
    let termHistIdx = -1;
    let termCwd = '/notes';

    // ── Monaco Loader ──────────────────────────────────────────
    const loadMonaco = () => new Promise((resolve) => {
      if (typeof monaco !== 'undefined') { resolve(); return; }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
      script.onload = () => {
        require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
        require(['vs/editor/editor.main'], () => resolve());
      };
      script.onerror = () => {
        console.warn('Monaco failed to load, using textarea fallback');
        resolve(); // resolve anyway, will use fallback
      };
      document.head.appendChild(script);
    });

    const initMonaco = async () => {
      await loadMonaco();
      if (typeof monaco === 'undefined') {
        // Fallback: plain textarea
        document.getElementById('ide-monaco-container').innerHTML =
          '<textarea id="ide-fallback-ta" style="width:100%;height:100%;background:var(--bg-base);color:var(--text-primary);border:none;outline:none;padding:16px;font-family:var(--font-mono);font-size:14px;resize:none;" spellcheck="false"></textarea>';
        monacoReady = false;
        return;
      }

      // Monaco dark theme matching our OS
      monaco.editor.defineTheme('browserOS', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
          { token: 'keyword', foreground: '7c6af7' },
          { token: 'string', foreground: 'ce9178' },
          { token: 'number', foreground: 'b5cea8' },
          { token: 'type', foreground: '06b6d4' },
        ],
        colors: {
          'editor.background': '#0d0d14',
          'editor.foreground': '#e8e8f0',
          'editorLineNumber.foreground': '#444466',
          'editorCursor.foreground': '#7c6af7',
          'editor.selectionBackground': '#7c6af730',
          'editor.inactiveSelectionBackground': '#7c6af718',
          'editorIndentGuide.background': '#ffffff10',
          'editorIndentGuide.activeBackground': '#7c6af740',
          'editor.lineHighlightBackground': '#ffffff08',
          'editorGutter.background': '#0d0d14',
          'minimap.background': '#0d0d14',
        }
      });

      const container = document.getElementById('ide-monaco-container');
      monacoEditor = monaco.editor.create(container, {
        value: '',
        language: 'plaintext',
        theme: 'browserOS',
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        minimap: { enabled: true, scale: 0.8 },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorSmoothCaretAnimation: true,
        renderLineHighlight: 'gutter',
      });

      // Cursor position in status bar
      monacoEditor.onDidChangeCursorPosition(e => {
        document.getElementById('ide-status-pos').textContent =
          `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
      });

      // Mark dirty on content change
      monacoEditor.onDidChangeModelContent(() => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab && !tab.dirty) {
          tab.dirty = true;
          renderTabs();
        }
      });

      // Keyboard shortcuts
      monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveActiveTab());
      monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backslash, () => toggleSplit());
      monacoEditor.addCommand(monaco.KeyCode.F1, () => {
        EventBus.emit('commandpalette:open');
      });

      monacoReady = true;
    };

    // ── Language Detection ─────────────────────────────────────
    const getLang = (filename) => {
      const ext = filename.split('.').pop().toLowerCase();
      const map = {
        js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
        py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
        c: 'c', cpp: 'cpp', cs: 'csharp', php: 'php', swift: 'swift',
        md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
        html: 'html', css: 'css', scss: 'scss', sql: 'sql',
        sh: 'shell', bash: 'shell', xml: 'xml', toml: 'ini',
      };
      return map[ext] || 'plaintext';
    };

    // ── Tab Management ─────────────────────────────────────────
    const renderTabs = () => {
      const tabsEl = document.getElementById('ide-tabs');
      tabsEl.innerHTML = tabs.map(t => `
        <div class="ide-tab ${t.id === activeTabId ? 'active' : ''}" data-id="${t.id}">
          <span class="ide-tab-icon">${fileIcon(t.name)}</span>
          <span class="ide-tab-name">${t.name}${t.dirty ? ' ●' : ''}</span>
          <button class="ide-tab-close" data-id="${t.id}">✕</button>
        </div>`).join('');

      tabsEl.querySelectorAll('.ide-tab').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.classList.contains('ide-tab-close')) return;
          switchTab(el.dataset.id);
        });
      });
      tabsEl.querySelectorAll('.ide-tab-close').forEach(el => {
        el.addEventListener('click', () => closeTab(el.dataset.id));
      });
    };

    const fileIcon = (name) => {
      const ext = name.split('.').pop().toLowerCase();
      const icons = { md: '📝', js: '🟨', ts: '🔷', py: '🐍', html: '🌐', css: '🎨',
                      json: '📋', sh: '⚡', rs: '🦀', go: '🐹', rb: '💎', java: '☕' };
      return icons[ext] || '📄';
    };

    const openTab = async (path) => {
      // Check if already open
      let tab = tabs.find(t => t.path === path);
      if (tab) { switchTab(tab.id); return; }

      const content = await FS.readFile(path) || '';
      const name = path.split('/').pop();
      const id = 'tab-' + Date.now();
      tab = { id, path, name, dirty: false, content };
      tabs.push(tab);

      activeTabId = id;
      document.getElementById('ide-welcome').style.display = 'none';
      document.getElementById('ide-monaco-container').style.display = 'flex';

      if (monacoReady && monacoEditor) {
        const lang = getLang(name);
        const model = monaco.editor.createModel(content, lang);
        tab.model = model;
        monacoEditor.setModel(model);
        document.getElementById('ide-status-lang').textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
        if (monacoEditor2) monacoEditor2.setModel(model);
      } else {
        // Fallback textarea
        const ta = document.getElementById('ide-fallback-ta');
        if (ta) ta.value = content;
      }

      renderTabs();
      highlightFileInTree(path);
    };

    const switchTab = (id) => {
      const tab = tabs.find(t => t.id === id);
      if (!tab) return;
      activeTabId = id;

      if (monacoReady && monacoEditor && tab.model) {
        monacoEditor.setModel(tab.model);
        const lang = getLang(tab.name);
        document.getElementById('ide-status-lang').textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
      } else {
        const ta = document.getElementById('ide-fallback-ta');
        if (ta) ta.value = tab.content || '';
      }

      renderTabs();
      highlightFileInTree(tab.path);
    };

    const closeTab = (id) => {
      const idx = tabs.findIndex(t => t.id === id);
      if (idx === -1) return;
      const tab = tabs[idx];

      if (tab.dirty && !confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;

      if (tab.model) tab.model.dispose();
      tabs.splice(idx, 1);

      if (activeTabId === id) {
        const next = tabs[Math.min(idx, tabs.length - 1)];
        if (next) switchTab(next.id);
        else {
          activeTabId = null;
          if (monacoReady && monacoEditor) monacoEditor.setModel(null);
          document.getElementById('ide-welcome').style.display = 'flex';
          document.getElementById('ide-monaco-container').style.display = 'none';
        }
      }
      renderTabs();
    };

    const saveActiveTab = async () => {
      const tab = tabs.find(t => t.id === activeTabId);
      if (!tab) return;

      let content = '';
      if (monacoReady && monacoEditor && tab.model) {
        content = tab.model.getValue();
      } else {
        const ta = document.getElementById('ide-fallback-ta');
        content = ta ? ta.value : '';
      }

      await FS.writeFile(tab.path, content);
      tab.dirty = false;
      tab.content = content;
      renderTabs();

      // Visual feedback in status bar
      const statusEl = document.getElementById('ide-status-errors');
      statusEl.textContent = '✓ Saved';
      setTimeout(() => { statusEl.textContent = '✓ No errors'; }, 1500);
    };

    // ── Split Editor ───────────────────────────────────────────
    const toggleSplit = () => {
      if (!monacoReady) return;
      splitMode = !splitMode;
      const container = document.getElementById('ide-monaco-container');

      if (splitMode) {
        container.style.display = 'flex';
        const div2 = document.createElement('div');
        div2.id = 'ide-monaco-2';
        div2.style.cssText = 'flex:1;height:100%;border-left:1px solid var(--window-border);';
        container.appendChild(div2);

        const tab = tabs.find(t => t.id === activeTabId);
        monacoEditor2 = monaco.editor.create(div2, {
          model: tab?.model || null,
          theme: 'browserOS',
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          automaticLayout: true,
          minimap: { enabled: false },
        });

        // Resize first editor to half
        document.getElementById('ide-monaco-container').firstChild.style.flex = '1';
      } else {
        if (monacoEditor2) { monacoEditor2.dispose(); monacoEditor2 = null; }
        const div2 = document.getElementById('ide-monaco-2');
        if (div2) div2.remove();
      }
    };

    // ── File Tree ──────────────────────────────────────────────
    const renderFileTree = async () => {
      const files = await FS.getAllFiles().catch(() => []);
      const tree = document.getElementById('ide-file-tree');

      // Group by folder
      const folders = {};
      files.forEach(f => {
        const folder = f.parentPath || '/';
        if (!folders[folder]) folders[folder] = [];
        folders[folder].push(f);
      });

      let html = '';
      Object.keys(folders).sort().forEach(folder => {
        const displayFolder = folder === '/' ? 'Root' : folder.split('/').filter(Boolean).pop();
        html += `<div class="ide-tree-folder">
          <div class="ide-tree-folder-name">📁 ${displayFolder}</div>
          <div class="ide-tree-children">
            ${folders[folder].map(f => `
              <div class="ide-tree-file" data-path="${f.path}" title="${f.path}">
                ${fileIcon(f.name)} ${f.name}
              </div>`).join('')}
          </div>
        </div>`;
      });

      tree.innerHTML = html || '<div style="padding:16px;color:var(--text-muted);font-size:12px;">No files found</div>';

      tree.querySelectorAll('.ide-tree-file').forEach(el => {
        el.addEventListener('click', () => openTab(el.dataset.path));
        el.addEventListener('dblclick', () => openTab(el.dataset.path));
      });

      tree.querySelectorAll('.ide-tree-folder-name').forEach(el => {
        el.addEventListener('click', () => {
          const children = el.nextElementSibling;
          children.style.display = children.style.display === 'none' ? '' : 'none';
        });
      });
    };

    const highlightFileInTree = (path) => {
      document.querySelectorAll('.ide-tree-file').forEach(el => {
        el.classList.toggle('active', el.dataset.path === path);
      });
    };

    // ── Search ─────────────────────────────────────────────────
    let searchTimer = null;
    document.getElementById('ide-search-input').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(async () => {
        const q = e.target.value.trim();
        const resultsEl = document.getElementById('ide-search-results');
        if (!q) { resultsEl.innerHTML = ''; return; }

        const results = await FS.search(q).catch(() => []);
        resultsEl.innerHTML = results.slice(0, 30).map(r => `
          <div class="ide-search-result" data-path="${r.path}">
            <div class="ide-search-result-file">${fileIcon(r.name)} ${r.name}</div>
            <div class="ide-search-result-match">${escapeHtml((r.content || '').slice(0, 80))}</div>
          </div>`).join('') || '<div style="padding:8px;color:var(--text-muted);font-size:12px;">No results</div>';

        resultsEl.querySelectorAll('.ide-search-result').forEach(el => {
          el.addEventListener('click', () => openTab(el.dataset.path));
        });
      }, 300);
    });

    const escapeHtml = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // ── Activity Bar Panels ────────────────────────────────────
    document.querySelectorAll('.ide-activity-btn[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        if (panel === 'settings') { EventBus.emit('window:open', { appId: 'settings' }); return; }

        document.querySelectorAll('.ide-activity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const sidebar = document.getElementById('ide-sidebar');
        const currentPanel = sidebar.querySelector('.ide-panel.active');
        const newPanel = document.getElementById('panel-' + panel);

        if (currentPanel === newPanel) {
          sidebar.style.display = sidebar.style.display === 'none' ? '' : 'none';
        } else {
          sidebar.style.display = '';
          sidebar.querySelectorAll('.ide-panel').forEach(p => p.classList.remove('active'));
          if (newPanel) newPanel.classList.add('active');
        }

        if (panel === 'terminal') showTerminal();
      });
    });

    // ── Integrated Terminal ────────────────────────────────────
    const showTerminal = () => {
      const panel = document.getElementById('ide-terminal-panel');
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      if (panel.style.display !== 'none') {
        setTimeout(() => document.getElementById('ide-term-input')?.focus(), 50);
      }
    };

    document.getElementById('ide-terminal-close').addEventListener('click', () => {
      document.getElementById('ide-terminal-panel').style.display = 'none';
    });

    const termPrint = (text, cls = '') => {
      const out = document.getElementById('ide-term-output');
      const line = document.createElement('div');
      line.className = 'ide-term-line' + (cls ? ' ' + cls : '');
      line.innerHTML = text;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    };

    const termExec = async (cmd) => {
      const [c, ...rest] = cmd.trim().split(/\s+/);
      const arg = rest.join(' ');

      switch (c.toLowerCase()) {
        case 'ls': {
          const entries = await FS.readDir(termCwd).catch(() => []);
          termPrint(entries.map(e => `<span style="color:${e.type==='dir'?'#06b6d4':'#e8e8f0'}">${e.name}</span>`).join('  ') || '(empty)');
          break;
        }
        case 'cd': {
          const target = arg === '..' ? termCwd.split('/').slice(0, -1).join('/') || '/' : (arg.startsWith('/') ? arg : termCwd + '/' + arg);
          const exists = await FS.exists(target);
          if (exists) { termCwd = target; } else termPrint(`cd: no such directory: ${arg}`, 'term-error');
          break;
        }
        case 'pwd':
          termPrint(termCwd);
          break;
        case 'cat': {
          const path = arg.startsWith('/') ? arg : termCwd + '/' + arg;
          const content = await FS.readFile(path);
          if (content !== null) termPrint(escapeHtml(content).replace(/\n/g,'<br>'));
          else termPrint(`cat: ${arg}: No such file`, 'term-error');
          break;
        }
        case 'edit':
        case 'open': {
          const path = arg.startsWith('/') ? arg : termCwd + '/' + arg;
          if (arg.endsWith('.md')) openTab(path);
          else openTab(path);
          break;
        }
        case 'clear':
          document.getElementById('ide-term-output').innerHTML = '';
          break;
        case 'help':
          termPrint('Commands: ls, cd, pwd, cat, edit, open, clear, help');
          break;
        default:
          termPrint(`Command not found: ${c}. Type <b>help</b> for available commands.`, 'term-warn');
      }
    };

    const termInput = document.getElementById('ide-term-input');
    termInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = termInput.value.trim();
        if (!cmd) return;
        termHistory.unshift(cmd);
        termHistIdx = -1;
        termPrint(`<span style="color:#7c6af7">$</span> ${escapeHtml(cmd)}`);
        termInput.value = '';
        await termExec(cmd);
      }
      if (e.key === 'ArrowUp') {
        termHistIdx = Math.min(termHistIdx + 1, termHistory.length - 1);
        termInput.value = termHistory[termHistIdx] || '';
        e.preventDefault();
      }
      if (e.key === 'ArrowDown') {
        termHistIdx = Math.max(termHistIdx - 1, -1);
        termInput.value = termHistIdx >= 0 ? termHistory[termHistIdx] : '';
        e.preventDefault();
      }
      if (e.key === 'l' && e.ctrlKey) {
        document.getElementById('ide-term-output').innerHTML = '';
        e.preventDefault();
      }
    });

    // ── New File ───────────────────────────────────────────────
    const newFile = async () => {
      const name = prompt('New file name:', 'untitled.md');
      if (!name) return;
      const path = '/notes/' + name;
      await FS.writeFile(path, '');
      await renderFileTree();
      openTab(path);
    };

    document.getElementById('ide-new-file').addEventListener('click', newFile);
    document.getElementById('ide-new-file-btn2').addEventListener('click', newFile);

    document.getElementById('ide-open-file-btn').addEventListener('click', async () => {
      const files = await FS.getAllFiles().catch(() => []);
      if (!files.length) { alert('No files found.'); return; }
      const names = files.map((f, i) => `${i + 1}. ${f.path}`).join('\n');
      const choice = prompt('Open file (enter number):\n' + names);
      const idx = parseInt(choice) - 1;
      if (!isNaN(idx) && files[idx]) openTab(files[idx].path);
    });

    document.getElementById('ide-split-btn').addEventListener('click', toggleSplit);

    // ── Global keyboard shortcuts ──────────────────────────────
    const onKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === '`') { e.preventDefault(); showTerminal(); }
      if (ctrl && e.key === 's') { e.preventDefault(); saveActiveTab(); }
    };
    container.addEventListener('keydown', onKeyDown);

    // ── Listen for open events ─────────────────────────────────
    const onOpenEditor = ({ path }) => { if (path) openTab(path); };
    EventBus.on('file:open-editor', onOpenEditor);
    EventBus.on('file:open', ({ path }) => { if (path) openTab(path); });

    // ── FS change → refresh tree ───────────────────────────────
    EventBus.on('fs:change', renderFileTree);

    // ── Boot ───────────────────────────────────────────────────
    const boot = async () => {
      await renderFileTree();
      await initMonaco();

      // Open initial file if provided
      if (args?.path) {
        openTab(args.path);
      }

      // Boot message in terminal output
      termPrint('Welcome to BrowserOS Integrated Terminal', 'term-info');
      termPrint(`Type <b>help</b> for available commands.`);
    };

    boot();
  }
};
