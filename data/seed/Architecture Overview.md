---
title: Architecture Overview
tags: [architecture, technical, dev, internals]
created: 2026-04-10
---

# Architecture Overview

BrowserOS is a pure static web application — no server required, no build step.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Storage | IndexedDB (Dexie.js) | Virtual file system |
| Rendering | Vanilla JS + ES Modules | App framework |
| Markdown | marked.js | MD → HTML parsing |
| Code | Monaco Editor | VS Code-like IDE |
| Graph | D3.js v7 | Knowledge graph |
| Search | Fuse.js | Fuzzy full-text search |
| Icons | Lucide | SVG icon system |
| Sanitize | DOMPurify | XSS protection |
| Events | Web Workers | SSE simulation |
| Offline | Service Worker | PWA / cache |

## Module Architecture

```
index.html
  └── js/os.js (entry point)
        ├── core/eventBus.js      ← pub/sub between modules
        ├── core/fileSystem.js    ← Dexie IndexedDB FS API
        ├── core/windowManager.js ← drag, resize, snap
        ├── core/taskbar.js       ← taskbar + clock
        ├── core/desktop.js       ← icons + wallpaper
        ├── core/notifications.js ← toast + panel
        ├── core/commandPalette.js← Ctrl+K search
        ├── apps/fileManager.js   ← file explorer
        ├── apps/editor.js        ← markdown editor
        ├── apps/graph.js         ← D3 knowledge graph
        ├── apps/wiki.js          ← wiki viewer
        ├── apps/terminal.js      ← shell emulator
        ├── apps/monacoIDE.js     ← Monaco code IDE
        ├── apps/aiTerminal.js    ← AI coding assistant
        ├── apps/liveFeed.js      ← SSE demo
        └── apps/settings.js      ← OS settings
```

## Key Design Patterns

### Event Bus
All modules communicate via a central [[EventBus]]. No direct imports between apps.

```javascript
EventBus.emit('window:open', { appId: 'editor', args: { path } });
EventBus.on('fs:change', handler);
```

### Virtual File System
The [[File Manager]] and all apps use a unified FS API backed by IndexedDB:

```javascript
await FS.writeFile('/notes/idea.md', '# My Idea');
const files = await FS.readDir('/notes');
const content = await FS.readFile('/notes/idea.md');
```

### App Registry
Each app registers itself with metadata:

```javascript
OS.registerApp({
  id: 'editor',
  name: 'Markdown Editor',
  icon: 'edit',
  launch: (args) => WindowManager.open('editor', args)
});
```

## Data Storage

- **Files/Folders**: IndexedDB via Dexie.js (`BrowserOS_FS` database)
- **Settings**: localStorage (`os_settings` key)
- **Session**: sessionStorage (open windows restore on reload)

## Deployment

GitHub Actions deploys the entire repo root to GitHub Pages on every push. No build step — just static file serving.

URL: `https://01rmachani.github.io/OS/`

## Related

- [[Welcome to BrowserOS]]
- [[Knowledge Graph]]
- [[Getting Started]]
