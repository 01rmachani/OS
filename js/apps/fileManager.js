/* =========================================================
   BrowserOS — File Manager App
   ========================================================= */
import { FS } from '../core/fileSystem.js';
import { EventBus } from '../core/eventBus.js';
import { fileIcon, timeAgo } from '../utils/markdown.js';

export const FileManagerApp = {
  id: 'filemanager', name: 'File Manager', emoji: '🗂️',
  iconBg: 'icon-bg-cyan', defaultWidth: 780, defaultHeight: 520,
  keywords: ['files', 'explorer', 'folder', 'browse'],
  description: 'Browse and manage your virtual file system.',

  mount(container, args) {
    let cwd = args?.path || '/';
    let viewMode = 'grid';
    let selected = new Set();
    let clipboard = null;

    container.innerHTML = `
      <div class="filemanager">
        <div class="fm-sidebar">
          <div class="fm-sidebar-section">Favorites</div>
          <div class="fm-sidebar-item active" data-path="/"><span class="fm-sidebar-item-icon">🏠</span> Home</div>
          <div class="fm-sidebar-item" data-path="/notes"><span class="fm-sidebar-item-icon">📝</span> Notes</div>
          <div class="fm-sidebar-item" data-path="/projects"><span class="fm-sidebar-item-icon">📁</span> Projects</div>
          <div class="fm-sidebar-item" data-path="/docs"><span class="fm-sidebar-item-icon">📚</span> Docs</div>
        </div>
        <div class="fm-main">
          <div class="fm-toolbar">
            <div class="fm-breadcrumb" id="fm-breadcrumb"></div>
            <div class="fm-toolbar-actions">
              <button class="fm-btn" id="fm-new-file"   title="New File">📄</button>
              <button class="fm-btn" id="fm-new-folder" title="New Folder">📁</button>
              <button class="fm-btn active" id="fm-view-grid" title="Grid View">⊞</button>
              <button class="fm-btn" id="fm-view-list"  title="List View">☰</button>
            </div>
          </div>
          <div class="fm-content" id="fm-content"></div>
          <div class="fm-statusbar" id="fm-statusbar">Loading...</div>
        </div>
      </div>`;

    const render = async () => {
      await renderDir(cwd);
    };

    const renderDir = async (path) => {
      cwd = path;
      const entries = await FS.readDir(path).catch(() => []);
      selected.clear();

      // Breadcrumb
      const bc = container.querySelector('#fm-breadcrumb');
      const parts = path === '/' ? [''] : ['', ...path.split('/').filter(Boolean)];
      bc.innerHTML = parts.map((p, i) => {
        const fullPath = i === 0 ? '/' : '/' + parts.slice(1, i + 1).join('/');
        const label = i === 0 ? '🏠 Home' : p;
        const isCurrent = i === parts.length - 1;
        return `<span class="fm-breadcrumb-item ${isCurrent ? 'current' : ''}" data-path="${fullPath}">${label}</span>
                ${isCurrent ? '' : '<span class="fm-breadcrumb-sep">›</span>'}`;
      }).join('');
      bc.querySelectorAll('.fm-breadcrumb-item:not(.current)').forEach(el => {
        el.addEventListener('click', () => renderDir(el.dataset.path));
      });

      // Sidebar active
      container.querySelectorAll('.fm-sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.path === path);
      });

      // Content
      const content = container.querySelector('#fm-content');
      if (entries.length === 0) {
        content.innerHTML = `<div class="fm-empty"><div class="fm-empty-icon">📭</div><div class="fm-empty-text">This folder is empty</div></div>`;
      } else if (viewMode === 'grid') {
        content.innerHTML = `<div class="fm-grid">${entries.map(e => itemHtml(e)).join('')}</div>`;
      } else {
        content.innerHTML = `
          <div class="fm-list">
            <div class="fm-list-item" style="opacity:0.5;font-size:11px;font-weight:700;letter-spacing:0.05em;border-bottom:1px solid var(--window-border);padding-bottom:6px;">
              <span class="fm-list-icon"></span>
              <span class="fm-list-name">Name</span>
              <div class="fm-list-meta"><span class="fm-list-size">Size</span><span class="fm-list-date">Modified</span></div>
            </div>
            ${entries.map(e => listItemHtml(e)).join('')}
          </div>`;
      }

      bindItemEvents(content, entries);

      container.querySelector('#fm-statusbar').textContent =
        `${entries.length} item${entries.length !== 1 ? 's' : ''} · ${path}`;
    };

    function itemHtml(e) {
      const icon = e.type === 'directory' ? '📁' : fileIcon(e.name);
      return `<div class="fm-item" data-path="${e.path}" data-type="${e.type}">
        <div class="fm-item-icon">${icon}</div>
        <div class="fm-item-name">${e.name}</div>
      </div>`;
    }

    function listItemHtml(e) {
      const icon = e.type === 'directory' ? '📁' : fileIcon(e.name);
      return `<div class="fm-list-item" data-path="${e.path}" data-type="${e.type}">
        <span class="fm-list-icon">${icon}</span>
        <span class="fm-list-name">${e.name}</span>
        <div class="fm-list-meta">
          <span class="fm-list-size">${e.type === 'file' ? FS.formatSize(e.size || 0) : '—'}</span>
          <span class="fm-list-date">${timeAgo(e.modified)}</span>
        </div>
      </div>`;
    }

    function bindItemEvents(content, entries) {
      content.querySelectorAll('.fm-item, .fm-list-item').forEach(el => {
        const path = el.dataset.path;
        const type = el.dataset.type;
        if (!path) return;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          content.querySelectorAll('.fm-item.selected,.fm-list-item.selected').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
        });

        el.addEventListener('dblclick', () => {
          if (type === 'directory') {
            renderDir(path);
          } else {
            EventBus.emit('file:open', { path });
          }
        });

        el.addEventListener('contextmenu', (e) => {
          e.preventDefault(); e.stopPropagation();
          EventBus.emit('contextmenu:show', {
            x: e.clientX, y: e.clientY,
            items: type === 'directory' ? [
              { label: 'Open', icon: '📂', action: () => renderDir(path) },
              { separator: true },
              { label: 'Rename', icon: '✏️', action: () => renameItem(path, entries.find(x => x.path === path)) },
              { label: 'Delete', icon: '🗑️', action: () => deleteItem(path), danger: true },
            ] : [
              { label: 'Open',         icon: '📂', action: () => EventBus.emit('file:open', { path }) },
              { label: 'Open in Wiki', icon: '📖', action: () => EventBus.emit('file:open-wiki', { path }) },
              { label: 'Open in Editor', icon: '✏️', action: () => EventBus.emit('file:open-editor', { path }) },
              { separator: true },
              { label: 'Copy Path',    icon: '📋', action: () => navigator.clipboard?.writeText(path) },
              { label: 'Rename',       icon: '✏️', action: () => renameItem(path, entries.find(x => x.path === path)) },
              { label: 'Delete',       icon: '🗑️', action: () => deleteItem(path), danger: true },
            ]
          });
        });
      });
    }

    const renameItem = async (path, entry) => {
      const newName = prompt('Rename to:', entry?.name || '');
      if (!newName || newName === entry?.name) return;
      const newPath = path.slice(0, path.lastIndexOf('/') + 1) + newName;
      try {
        await FS.move(path, newPath);
        render();
      } catch (e) { alert('Rename failed: ' + e.message); }
    };

    const deleteItem = async (path) => {
      if (!confirm(`Delete "${path.split('/').pop()}"?`)) return;
      try { await FS.delete(path, true); render(); }
      catch (e) { alert('Delete failed: ' + e.message); }
    };

    // Toolbar buttons
    container.querySelector('#fm-new-file').addEventListener('click', async () => {
      const name = prompt('File name:', 'untitled.md');
      if (!name) return;
      await FS.writeFile(cwd + '/' + name, `# ${name.replace(/\.[^.]+$/, '')}\n\n`);
      render();
    });
    container.querySelector('#fm-new-folder').addEventListener('click', async () => {
      const name = prompt('Folder name:', 'New Folder');
      if (!name) return;
      await FS.mkdir(cwd + '/' + name);
      render();
    });
    container.querySelector('#fm-view-grid').addEventListener('click', () => {
      viewMode = 'grid';
      container.querySelector('#fm-view-grid').classList.add('active');
      container.querySelector('#fm-view-list').classList.remove('active');
      render();
    });
    container.querySelector('#fm-view-list').addEventListener('click', () => {
      viewMode = 'list';
      container.querySelector('#fm-view-list').classList.add('active');
      container.querySelector('#fm-view-grid').classList.remove('active');
      render();
    });

    // Sidebar
    container.querySelectorAll('.fm-sidebar-item[data-path]').forEach(item => {
      item.addEventListener('click', () => renderDir(item.dataset.path));
    });

    // FS change listener
    const onChange = () => render();
    EventBus.on('fs:change', onChange);
    container.addEventListener('disconnected', () => EventBus.off('fs:change', onChange));

    render();
  }
};
