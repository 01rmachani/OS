/* =========================================================
   BrowserOS — Markdown Editor App
   ========================================================= */
import { FS } from '../core/fileSystem.js';
import { EventBus } from '../core/eventBus.js';
import { renderMarkdown, parseFrontmatter } from '../utils/markdown.js';

export const EditorApp = {
  id: 'editor', name: 'Markdown Editor', emoji: '✏️',
  iconBg: 'icon-bg-violet', defaultWidth: 900, defaultHeight: 600,
  keywords: ['edit', 'write', 'markdown', 'note', 'md'],
  description: 'Split-pane markdown editor with live preview and wikilinks.',

  mount(container, args, winId) {
    let currentPath = args?.path || null;
    let isNewFile = args?.newFile || false;
    let saveTimer = null;
    let isDirty = false;

    container.innerHTML = `
      <div class="editor-app">
        <div class="editor-toolbar">
          <div class="editor-filename" id="ed-filename">${currentPath ? currentPath.split('/').pop() : 'Untitled.md'}</div>
          <button class="editor-tool-btn" data-action="bold"    title="Bold (Ctrl+B)"><b>B</b></button>
          <button class="editor-tool-btn" data-action="italic"  title="Italic (Ctrl+I)"><i>I</i></button>
          <button class="editor-tool-btn" data-action="code"    title="Code">&lt;/&gt;</button>
          <button class="editor-tool-btn" data-action="wikilink" title="Insert Wikilink">[[]]</button>
          <button class="editor-tool-btn" data-action="table"   title="Insert Table">⊞</button>
          <div class="editor-toolbar-sep"></div>
          <button class="editor-tool-btn" id="ed-save-btn"      title="Save (Ctrl+S)">💾</button>
          <button class="editor-tool-btn" id="ed-new-btn"       title="New File">📄+</button>
          <button class="editor-tool-btn" id="ed-open-btn"      title="Open File">📂</button>
        </div>
        <div class="editor-panes">
          <div class="editor-pane">
            <div class="editor-pane-label">EDITOR</div>
            <textarea class="editor-textarea" id="ed-textarea" spellcheck="false" placeholder="Start writing..."></textarea>
          </div>
          <div class="editor-pane">
            <div class="editor-pane-label">PREVIEW</div>
            <div class="editor-preview" id="ed-preview"></div>
          </div>
        </div>
        <div class="editor-statusbar">
          <span class="editor-statusbar-item" id="ed-wordcount">0 words</span>
          <span class="editor-statusbar-item" id="ed-charcount">0 chars</span>
          <span class="editor-statusbar-item" id="ed-path" style="color:var(--text-muted);">No file</span>
          <span class="editor-autosave hidden" id="ed-autosave">✓ Saved</span>
        </div>
      </div>`;

    const textarea  = container.querySelector('#ed-textarea');
    const preview   = container.querySelector('#ed-preview');
    const filename  = container.querySelector('#ed-filename');
    const wordCount = container.querySelector('#ed-wordcount');
    const charCount = container.querySelector('#ed-charcount');
    const pathEl    = container.querySelector('#ed-path');
    const autosave  = container.querySelector('#ed-autosave');

    const updatePreview = () => {
      const raw = textarea.value;
      const { meta, body } = parseFrontmatter(raw);

      let html = '';
      // Render tags from frontmatter
      if (meta.tags?.length) {
        html += `<div class="editor-frontmatter">${
          (Array.isArray(meta.tags) ? meta.tags : [meta.tags])
            .map(t => `<span class="editor-tag">#${t}</span>`).join('')
        }</div>`;
      }
      html += renderMarkdown(raw);
      preview.innerHTML = html;

      // Wire wikilink clicks
      preview.querySelectorAll('a.wikilink').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          EventBus.emit('file:open-wiki', { name: a.dataset.target });
        });
      });

      // Word/char count
      const words = body.trim().split(/\s+/).filter(Boolean).length;
      wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
      charCount.textContent = `${body.length} chars`;
    };

    const markDirty = () => {
      if (!isDirty) { isDirty = true; EventBus.emit('window:setUnsaved', { id: winId, unsaved: true }); }
      autosave.classList.add('hidden');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(autoSave, 1500);
    };

    const autoSave = async () => {
      if (!currentPath) return;
      await FS.writeFile(currentPath, textarea.value);
      isDirty = false;
      autosave.textContent = '✓ Saved';
      autosave.classList.remove('hidden');
      EventBus.emit('window:setUnsaved', { id: winId, unsaved: false });
      setTimeout(() => autosave.classList.add('hidden'), 2000);
    };

    const loadFile = async (path) => {
      currentPath = path;
      const content = await FS.readFile(path);
      textarea.value = content || '';
      filename.textContent = path.split('/').pop();
      pathEl.textContent = path;
      EventBus.emit('window:setTitle', { id: winId, title: path.split('/').pop() + ' — Editor' });
      updatePreview();
      isDirty = false;
    };

    const saveFile = async () => {
      if (!currentPath) {
        const name = prompt('Save as:', 'untitled.md');
        if (!name) return;
        currentPath = '/notes/' + name;
        filename.textContent = name;
        pathEl.textContent = currentPath;
      }
      await FS.writeFile(currentPath, textarea.value);
      isDirty = false;
      autosave.textContent = '✓ Saved';
      autosave.classList.remove('hidden');
      setTimeout(() => autosave.classList.add('hidden'), 2000);
    };

    // Textarea events
    textarea.addEventListener('input', () => { updatePreview(); markDirty(); });

    // Keyboard shortcuts
    textarea.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); saveFile(); }
      if (ctrl && e.key === 'b') { e.preventDefault(); wrapSelection('**', '**'); }
      if (ctrl && e.key === 'i') { e.preventDefault(); wrapSelection('*', '*'); }
      // Tab → indent
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end   = textarea.selectionEnd;
        textarea.value = textarea.value.slice(0, start) + '  ' + textarea.value.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
    });

    const wrapSelection = (before, after) => {
      const start = textarea.selectionStart, end = textarea.selectionEnd;
      const selected = textarea.value.slice(start, end) || 'text';
      textarea.value = textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd   = start + before.length + selected.length;
      textarea.focus();
      updatePreview(); markDirty();
    };

    // Toolbar actions
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'bold')     wrapSelection('**', '**');
        if (action === 'italic')   wrapSelection('*', '*');
        if (action === 'code')     wrapSelection('`', '`');
        if (action === 'wikilink') {
          const name = prompt('Link to note:', '');
          if (name) wrapSelection(`[[${name}`, ']]');
        }
        if (action === 'table') {
          const t = '\n| Header | Header |\n|--------|--------|\n| Cell   | Cell   |\n';
          const start = textarea.selectionStart;
          textarea.value = textarea.value.slice(0, start) + t + textarea.value.slice(start);
          textarea.selectionStart = textarea.selectionEnd = start + t.length;
          updatePreview(); markDirty();
        }
        textarea.focus();
      });
    });

    container.querySelector('#ed-save-btn').addEventListener('click', saveFile);

    container.querySelector('#ed-new-btn').addEventListener('click', () => {
      if (isDirty && !confirm('Discard unsaved changes?')) return;
      currentPath = null; isDirty = false;
      textarea.value = '# New Note\n\n';
      filename.textContent = 'Untitled.md';
      pathEl.textContent = 'No file';
      updatePreview();
    });

    container.querySelector('#ed-open-btn').addEventListener('click', async () => {
      const files = await FS.getAllFiles().catch(() => []);
      const md = files.filter(f => f.name.endsWith('.md'));
      if (!md.length) { alert('No markdown files found.'); return; }
      const names = md.map((f, i) => `${i+1}. ${f.path}`).join('\n');
      const choice = prompt('Open file (enter number):\n' + names);
      const idx = parseInt(choice) - 1;
      if (!isNaN(idx) && md[idx]) loadFile(md[idx].path);
    });

    // Load initial file
    if (currentPath) loadFile(currentPath);
    else if (!isNewFile) {
      // Try to load Welcome.md
      FS.exists('/notes/Welcome.md').then(exists => {
        if (exists) loadFile('/notes/Welcome.md');
        else { textarea.value = '# Welcome\n\nStart writing here.\n'; updatePreview(); }
      });
    } else {
      textarea.value = '# New Note\n\n';
      updatePreview();
    }

    // Listen for external open requests
    const onOpenEditor = ({ path }) => { if (path) loadFile(path); };
    EventBus.on('file:open-editor', onOpenEditor);
  }
};
