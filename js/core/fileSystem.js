/* =========================================================
   BrowserOS — Virtual File System (IndexedDB via Dexie)
   ========================================================= */
import { EventBus } from './eventBus.js';

let db;

const MIME_MAP = {
  '.md': 'text/markdown', '.txt': 'text/plain',
  '.js': 'text/javascript', '.ts': 'text/typescript',
  '.json': 'application/json', '.css': 'text/css',
  '.html': 'text/html', '.py': 'text/x-python',
  '.sh': 'text/x-shellscript', '.yaml': 'text/yaml',
  '.yml': 'text/yaml', '.xml': 'text/xml',
};

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function mimeOf(name) {
  return MIME_MAP[extOf(name)] || 'text/plain';
}

function basename(path) {
  return path.split('/').filter(Boolean).pop() || '/';
}

function parentOf(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return '/';
  return '/' + parts.slice(0, -1).join('/');
}

function normPath(path) {
  if (!path || path === '/') return '/';
  const parts = path.split('/').filter(Boolean);
  return '/' + parts.join('/');
}

export const FS = {
  async init() {
    db = new Dexie('BrowserOS_FS');
    db.version(1).stores({
      files: '&path, parentPath, name, type, modified, *tags',
    });
    await db.open();

    // Ensure root dir exists
    const root = await db.files.get('/');
    if (!root) {
      await db.files.put({
        path: '/', name: '/', type: 'directory',
        parentPath: null, content: null,
        created: Date.now(), modified: Date.now(), tags: [], size: 0
      });
    }
  },

  async writeFile(path, content, tags = []) {
    path = normPath(path);
    const parent = parentOf(path);
    const name = basename(path);

    // Auto-create parent dirs
    await this.mkdirP(parent);

    const existing = await db.files.get(path);
    const now = Date.now();
    const size = new Blob([content]).size;

    // Extract tags from frontmatter
    const fmTags = this._extractFrontmatterTags(content);
    const allTags = [...new Set([...tags, ...fmTags])];

    await db.files.put({
      path, name,
      type: 'file',
      parentPath: parent,
      content,
      size,
      mimeType: mimeOf(name),
      created: existing ? existing.created : now,
      modified: now,
      tags: allTags,
    });

    EventBus.emit('fs:change', { path, type: 'write' });
  },

  async readFile(path) {
    path = normPath(path);
    const entry = await db.files.get(path);
    if (!entry || entry.type !== 'file') return null;
    return entry.content || '';
  },

  async readDir(path) {
    path = normPath(path);
    const entries = await db.files.where('parentPath').equals(path).toArray();
    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  },

  async mkdir(path) {
    path = normPath(path);
    if (await db.files.get(path)) return;
    const parent = parentOf(path);
    if (parent !== '/' && !(await db.files.get(parent))) {
      await this.mkdir(parent);
    }
    await db.files.put({
      path, name: basename(path),
      type: 'directory',
      parentPath: parent,
      content: null,
      created: Date.now(), modified: Date.now(),
      tags: [], size: 0
    });
    EventBus.emit('fs:change', { path, type: 'mkdir' });
  },

  async mkdirP(path) {
    if (!path || path === '/') return;
    const parts = path.split('/').filter(Boolean);
    let cur = '';
    for (const p of parts) {
      cur += '/' + p;
      await this.mkdir(cur);
    }
  },

  async delete(path, recursive = false) {
    path = normPath(path);
    const entry = await db.files.get(path);
    if (!entry) return;

    if (entry.type === 'directory') {
      if (!recursive) throw new Error(`${path}: is a directory`);
      const children = await db.files.where('parentPath').equals(path).toArray();
      for (const child of children) {
        await this.delete(child.path, true);
      }
    }

    await db.files.delete(path);
    EventBus.emit('fs:change', { path, type: 'delete' });
  },

  async move(from, to) {
    from = normPath(from);
    to = normPath(to);
    const entry = await db.files.get(from);
    if (!entry) throw new Error(`${from}: not found`);

    const content = entry.content;
    await this.delete(from, entry.type === 'directory');

    if (entry.type === 'file') {
      await this.writeFile(to, content || '');
    } else {
      await this.mkdir(to);
    }
    EventBus.emit('fs:change', { from, to, type: 'move' });
  },

  async copy(from, to) {
    from = normPath(from);
    to = normPath(to);
    const content = await this.readFile(from);
    if (content === null) throw new Error(`${from}: not found`);
    await this.writeFile(to, content);
  },

  async exists(path) {
    path = normPath(path);
    return !!(await db.files.get(path));
  },

  async stat(path) {
    path = normPath(path);
    return db.files.get(path);
  },

  async search(query) {
    const all = await db.files.where('type').equals('file').toArray();
    if (!query) return all;
    const lq = query.toLowerCase();
    return all.filter(f =>
      f.name.toLowerCase().includes(lq) ||
      (f.content && f.content.toLowerCase().includes(lq)) ||
      f.tags.some(t => t.toLowerCase().includes(lq))
    );
  },

  async getAllFiles() {
    return db.files.where('type').equals('file').toArray();
  },

  async getBacklinks(filename) {
    // Find all files that [[link]] to this file
    const name = basename(filename).replace(/\.md$/i, '');
    const all = await db.files.where('type').equals('file').toArray();
    const results = [];
    for (const f of all) {
      if (!f.content) continue;
      const links = this.extractWikilinks(f.content);
      if (links.some(l => l.toLowerCase() === name.toLowerCase())) {
        results.push(f);
      }
    }
    return results;
  },

  extractWikilinks(content) {
    if (!content) return [];
    const matches = [...content.matchAll(/\[\[([^\]|#\n]+?)(?:\|[^\]]+)?\]\]/g)];
    return [...new Set(matches.map(m => m[1].trim()))];
  },

  _extractFrontmatterTags(content) {
    if (!content || !content.startsWith('---')) return [];
    const end = content.indexOf('\n---', 4);
    if (end === -1) return [];
    const fm = content.slice(4, end);
    const match = fm.match(/^tags:\s*\[([^\]]*)\]/m);
    if (match) {
      return match[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean);
    }
    const multiMatch = fm.match(/^tags:\n((?:\s*-\s*.+\n?)+)/m);
    if (multiMatch) {
      return multiMatch[1].split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
    }
    return [];
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  },

  async getStorageUsage() {
    try {
      const est = await navigator.storage?.estimate?.();
      return { used: est?.usage || 0, quota: est?.quota || 0 };
    } catch { return { used: 0, quota: 0 }; }
  },

  async seedFromServer(seedFiles) {
    const seeded = localStorage.getItem('os_seeded_v2');
    if (seeded) return;

    try {
      await this.mkdir('/notes');
      await this.mkdir('/projects');
      await this.mkdir('/docs');

      for (const { path, url } of seedFiles) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const content = await resp.text();
            await this.writeFile(path, content);
          }
        } catch (e) { console.warn('Seed fetch failed:', url, e); }
      }
      localStorage.setItem('os_seeded_v2', '1');
    } catch (e) { console.error('Seeding failed:', e); }
  }
};
