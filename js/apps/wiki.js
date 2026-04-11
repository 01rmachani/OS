/* =========================================================
   BrowserOS — Wiki / Knowledge Base App
   ========================================================= */
import { FS } from '../core/fileSystem.js';
import { EventBus } from '../core/eventBus.js';
import { renderMarkdown, parseFrontmatter, extractHeadings } from '../utils/markdown.js';

export const WikiApp = {
  id: 'wiki', name: 'Wiki', emoji: '📖',
  iconBg: 'icon-bg-green', defaultWidth: 1000, defaultHeight: 640,
  keywords: ['wiki', 'knowledge', 'base', 'read', 'browse', 'notes'],
  description: 'Browse your markdown notes as a beautiful wiki with backlinks and TOC.',

  mount(container, args, winId) {
    let history = [], historyIdx = -1;
    let allFiles = [];

    container.innerHTML = `
      <div class="wiki-app">
        <div class="wiki-sidebar">
          <input type="text" class="wiki-search" id="wiki-search" placeholder="Search notes…">
          <div class="wiki-file-list" id="wiki-file-list"></div>
        </div>
        <div class="wiki-main">
          <div class="wiki-content-area">
            <div class="wiki-nav-bar">
              <button class="wiki-nav-btn" id="wiki-back" title="Back">◀</button>
              <button class="wiki-nav-btn" id="wiki-fwd"  title="Forward">▶</button>
              <div class="wiki-current-title" id="wiki-page-title">Select a note</div>
              <button class="wiki-nav-btn" id="wiki-edit" title="Edit in Editor">✏️</button>
              <button class="wiki-nav-btn" id="wiki-graph" title="Show in Graph">🕸️</button>
            </div>
            <div class="wiki-article" id="wiki-article"><div style="color:var(--text-muted);text-align:center;padding:40px;">Select a note from the sidebar to begin reading.</div></div>
          </div>
          <div class="wiki-toc-panel" id="wiki-toc-panel">
            <div class="wiki-toc-title">Contents</div>
            <div id="wiki-toc"></div>
          </div>
        </div>
      </div>`;

    const article    = container.querySelector('#wiki-article');
    const tocPanel   = container.querySelector('#wiki-toc');
    const pageTitle  = container.querySelector('#wiki-page-title');
    const fileList   = container.querySelector('#wiki-file-list');
    const searchInput = container.querySelector('#wiki-search');

    const loadPage = async (pathOrName) => {
      let path = pathOrName;
      // If it's a name (from wikilink), find the file
      if (!pathOrName.startsWith('/')) {
        const match = allFiles.find(f =>
          f.name.replace(/\.md$/i, '').toLowerCase() === pathOrName.toLowerCase()
        );
        if (!match) {
          article.innerHTML = `
            <h1 style="color:var(--text-muted)">📄 "${pathOrName}"</h1>
            <p style="color:var(--text-muted)">This note doesn't exist yet. <a class="wikilink" href="#" onclick="return false;" data-create="${pathOrName}">Create it?</a></p>`;
          article.querySelector('[data-create]')?.addEventListener('click', () => {
            EventBus.emit('file:open-editor', { path: '/notes/' + pathOrName + '.md', newFile: true });
          });
          return;
        }
        path = match.path;
      }

      const content = await FS.readFile(path);
      if (content === null) return;

      const { meta, body } = parseFrontmatter(content);
      const name = path.split('/').pop().replace(/\.md$/i, '');

      pageTitle.textContent = meta.title || name;
      EventBus.emit('window:setTitle', { id: winId, title: (meta.title || name) + ' — Wiki' });

      // Render markdown
      const html = renderMarkdown(content);
      let articleHTML = '';

      if (meta.tags?.length) {
        const tags = Array.isArray(meta.tags) ? meta.tags : [meta.tags];
        articleHTML += `<div class="wiki-tags">${tags.map(t => `<span class="wiki-tag">#${t}</span>`).join('')}</div>`;
      }
      articleHTML += html;

      // Backlinks
      const backlinks = await FS.getBacklinks(path);
      if (backlinks.length) {
        articleHTML += `<div class="wiki-backlinks">
          <div class="wiki-backlinks-title">↩ Backlinks (${backlinks.length})</div>
          ${backlinks.map(f => `
            <div class="wiki-backlink-item" data-path="${f.path}">
              <span class="wiki-backlink-name">📄 ${f.name.replace(/\.md$/i,'')}</span>
            </div>`).join('')}
        </div>`;
      }

      article.innerHTML = articleHTML;
      article.scrollTop = 0;

      // Wikilink clicks
      article.querySelectorAll('a.wikilink').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          navigateTo(a.dataset.target || a.textContent);
        });
      });

      // Backlink clicks
      article.querySelectorAll('.wiki-backlink-item[data-path]').forEach(el => {
        el.addEventListener('click', () => loadAndPush(el.dataset.path));
      });

      // TOC
      const headings = extractHeadings(html);
      if (headings.length) {
        tocPanel.innerHTML = headings.map(h => `
          <div class="wiki-toc-item h${h.level}" data-heading="${h.text}">${h.text}</div>`).join('');
        tocPanel.querySelectorAll('.wiki-toc-item').forEach(item => {
          item.addEventListener('click', () => {
            const heading = [...article.querySelectorAll('h1,h2,h3,h4')]
              .find(el => el.textContent.trim() === item.dataset.heading);
            heading?.scrollIntoView({ behavior: 'smooth' });
          });
        });
      } else {
        tocPanel.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:4px 8px;">No headings</div>';
      }

      // Highlight code blocks
      if (typeof hljs !== 'undefined') {
        article.querySelectorAll('pre code').forEach(b => { try { hljs.highlightElement(b); } catch(e){} });
      }

      // Update file list active
      fileList.querySelectorAll('.wiki-file-item').forEach(el => {
        el.classList.toggle('active', el.dataset.path === path);
      });
    };

    const loadAndPush = (path) => {
      history = history.slice(0, historyIdx + 1);
      history.push(path);
      historyIdx = history.length - 1;
      loadPage(path);
      updateNavBtns();
    };

    const navigateTo = (name) => {
      const file = allFiles.find(f =>
        f.name.replace(/\.md$/i,'').toLowerCase() === name.toLowerCase()
      );
      loadAndPush(file ? file.path : name);
    };

    const updateNavBtns = () => {
      container.querySelector('#wiki-back').disabled = historyIdx <= 0;
      container.querySelector('#wiki-fwd').disabled  = historyIdx >= history.length - 1;
    };

    container.querySelector('#wiki-back').addEventListener('click', () => {
      if (historyIdx > 0) { historyIdx--; loadPage(history[historyIdx]); updateNavBtns(); }
    });
    container.querySelector('#wiki-fwd').addEventListener('click', () => {
      if (historyIdx < history.length - 1) { historyIdx++; loadPage(history[historyIdx]); updateNavBtns(); }
    });
    container.querySelector('#wiki-edit').addEventListener('click', () => {
      if (history[historyIdx]) EventBus.emit('file:open-editor', { path: history[historyIdx] });
    });
    container.querySelector('#wiki-graph').addEventListener('click', () => {
      EventBus.emit('window:open', { appId: 'graph' });
    });

    const renderFileList = (files) => {
      fileList.innerHTML = files.map(f => `
        <div class="wiki-file-item" data-path="${f.path}">
          📄 ${f.name.replace(/\.md$/i,'')}
        </div>`).join('');
      fileList.querySelectorAll('.wiki-file-item').forEach(el => {
        el.addEventListener('click', () => loadAndPush(el.dataset.path));
      });
    };

    const init = async () => {
      allFiles = (await FS.getAllFiles().catch(() => [])).filter(f => f.name.endsWith('.md'));
      renderFileList(allFiles);

      // Search
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = q ? allFiles.filter(f =>
          f.name.toLowerCase().includes(q) || (f.content || '').toLowerCase().includes(q)
        ) : allFiles;
        renderFileList(filtered);
      });

      // Load initial
      const initialPath = args?.path || args?.name;
      if (initialPath) {
        loadAndPush(initialPath);
      } else if (allFiles.length) {
        const welcome = allFiles.find(f => f.name === 'Welcome.md') || allFiles[0];
        loadAndPush(welcome.path);
      }
    };

    // Listen for wiki open events
    const onOpenWiki = ({ path, name }) => {
      if (path) loadAndPush(path);
      else if (name) navigateTo(name);
    };
    EventBus.on('file:open-wiki', onOpenWiki);

    const onChange = async () => {
      allFiles = (await FS.getAllFiles().catch(() => [])).filter(f => f.name.endsWith('.md'));
      renderFileList(allFiles);
    };
    EventBus.on('fs:change', onChange);

    init();
  }
};
