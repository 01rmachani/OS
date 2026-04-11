/* =========================================================
   BrowserOS — Markdown Utilities
   marked.js configuration, wikilink support, frontmatter parsing
   ========================================================= */

/**
 * Parse YAML frontmatter from markdown content.
 * Returns { meta, body } where meta is an object and body is the remaining MD.
 */
export function parseFrontmatter(content) {
  if (!content || !content.startsWith('---')) {
    return { meta: {}, body: content || '' };
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    return { meta: {}, body: content };
  }
  const fm = content.slice(4, end);
  const body = content.slice(end + 4).trimStart();
  const meta = {};

  for (const line of fm.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    // Array: tags: [a, b, c]
    if (val.startsWith('[') && val.endsWith(']')) {
      meta[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    } else {
      // Strip quotes
      val = val.replace(/^['"]|['"]$/g, '');
      meta[key] = val;
    }
  }

  return { meta, body };
}

/**
 * Pre-process wikilinks in content before passing to marked.
 * Converts [[Page Name]] → <a class="wikilink" data-target="Page Name">Page Name</a>
 * Converts [[Page Name|Display Text]] → with custom display
 */
export function preprocessWikilinks(content) {
  return content.replace(/\[\[([^\]|#\n]+?)(?:\|([^\]]+))?\]\]/g, (_, target, display) => {
    const name = target.trim();
    const label = display ? display.trim() : name;
    return `<a class="wikilink" data-target="${escapeAttr(name)}" href="#">${escapeHtml(label)}</a>`;
  });
}

function escapeAttr(s) {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render markdown content to sanitized HTML.
 * @param {string} raw - raw markdown
 * @param {object} opts
 * @param {boolean} opts.wikilinks - whether to process wikilinks
 * @returns {string} HTML
 */
export function renderMarkdown(raw, { wikilinks = true } = {}) {
  if (!raw) return '';
  const { body } = parseFrontmatter(raw);

  let content = wikilinks ? preprocessWikilinks(body) : body;

  // Configure marked for this render
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  let html;
  try {
    // marked v18+ may return a Promise in some modes, force sync
    const result = marked.parse(content);
    html = typeof result === 'string' ? result : body;
  } catch (e) {
    console.warn('Markdown parse error:', e);
    html = `<pre>${escapeHtml(body)}</pre>`;
  }

  // Sanitize with DOMPurify if available
  if (typeof DOMPurify !== 'undefined') {
    html = DOMPurify.sanitize(html, {
      ADD_ATTR: ['data-target', 'class'],
      ADD_TAGS: ['a'],
    });
  }

  // Apply syntax highlighting to code blocks
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  if (typeof hljs !== 'undefined') {
    doc.querySelectorAll('pre code').forEach(block => {
      try { hljs.highlightElement(block); } catch (e) {}
    });
  }

  return doc.body.innerHTML;
}

/**
 * Extract heading structure for TOC generation.
 * @param {string} html - rendered HTML
 * @returns {Array<{id, text, level}>}
 */
export function extractHeadings(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = [];
  doc.querySelectorAll('h1, h2, h3, h4').forEach(el => {
    const level = parseInt(el.tagName[1]);
    const text = el.textContent.trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    headings.push({ id, text, level });
  });
  return headings;
}

/**
 * Extract all [[wikilinks]] from raw markdown.
 */
export function extractWikilinks(content) {
  if (!content) return [];
  const matches = [...content.matchAll(/\[\[([^\]|#\n]+?)(?:\|[^\]]+)?\]\]/g)];
  return [...new Set(matches.map(m => m[1].trim()))];
}

/**
 * Get icon emoji for a file based on extension or name.
 */
export function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = {
    md: '📝', txt: '📄', js: '📜', ts: '📘', json: '📋',
    css: '🎨', html: '🌐', py: '🐍', sh: '⚡', yaml: '⚙️',
    yml: '⚙️', xml: '📰', pdf: '📕', png: '🖼️', jpg: '🖼️',
    jpeg: '🖼️', gif: '🖼️', svg: '🎭', mp3: '🎵', mp4: '🎬',
    zip: '📦', tar: '📦', gz: '📦',
  };
  if (name.toLowerCase() === 'readme.md') return '📖';
  if (name.toLowerCase().includes('todo')) return '✅';
  if (name.toLowerCase().includes('config') || name.toLowerCase() === '.gitignore') return '⚙️';
  return icons[ext] || '📄';
}

/**
 * Format a timestamp as relative time ("2 minutes ago")
 */
export function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}
