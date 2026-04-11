/* =========================================================
   BrowserOS — Main Entry Point
   Boots the OS: init core systems, register apps, seed FS
   ========================================================= */
import { EventBus }       from './core/eventBus.js';
import { FS }             from './core/fileSystem.js';
import { WindowManager }  from './core/windowManager.js';
import { Taskbar }        from './core/taskbar.js';
import { Desktop }        from './core/desktop.js';
import { Notifications }  from './core/notifications.js';
import { CommandPalette } from './core/commandPalette.js';
import { Workspaces }     from './core/workspaces.js';

// Apps
import { FileManagerApp } from './apps/fileManager.js';
import { EditorApp }      from './apps/editor.js';
import { GraphApp }       from './apps/graph.js';
import { WikiApp }        from './apps/wiki.js';
import { TerminalApp }    from './apps/terminal.js';
import { MonacoIDEApp }   from './apps/monacoIDE.js';
import { AITerminalApp }  from './apps/aiTerminal.js';
import { LiveFeedApp }    from './apps/liveFeed.js';
import { SettingsApp }    from './apps/settings.js';

/* ── App Registry ────────────────────────────────────────── */
const APP_REGISTRY = [
  FileManagerApp,
  EditorApp,
  GraphApp,
  WikiApp,
  TerminalApp,
  MonacoIDEApp,
  AITerminalApp,
  LiveFeedApp,
  SettingsApp,
];

window._OS = {
  apps: {},
  windows: {},
  currentWorkspace: 0,
};

APP_REGISTRY.forEach(app => {
  window._OS.apps[app.id] = app;
});

/* ── Apply saved preferences ─────────────────────────────── */
const applyPrefs = () => {
  const theme    = localStorage.getItem('os_theme') || 'dark';
  const accentIdx = parseInt(localStorage.getItem('os_accent_idx') || '0');
  const fontSize  = localStorage.getItem('os_font_size') || '14';
  const wallpaper = localStorage.getItem('os_wallpaper') || 'gradient-dark';
  const noGlass   = localStorage.getItem('os_glass') === 'false';
  const noAnim    = localStorage.getItem('os_animations') === 'false';

  // Theme
  if (theme === 'light') document.documentElement.classList.add('light-theme');
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('light-theme', !prefersDark);
  }

  // Glass / Animations
  if (noGlass) document.documentElement.classList.add('no-glass');
  if (noAnim)  document.documentElement.classList.add('no-animations');

  // Font size
  document.documentElement.style.setProperty('--base-font-size', fontSize + 'px');

  // Accent colors
  const ACCENTS = [
    { primary: '#7c6af7', secondary: '#06b6d4' },
    { primary: '#06b6d4', secondary: '#7c6af7' },
    { primary: '#f43f5e', secondary: '#f59e0b' },
    { primary: '#f59e0b', secondary: '#10b981' },
    { primary: '#10b981', secondary: '#06b6d4' },
    { primary: '#f97316', secondary: '#a855f7' },
    { primary: '#ec4899', secondary: '#8b5cf6' },
    { primary: '#6366f1', secondary: '#10b981' },
  ];
  const accent = ACCENTS[accentIdx] || ACCENTS[0];
  document.documentElement.style.setProperty('--accent-primary', accent.primary);
  document.documentElement.style.setProperty('--accent-secondary', accent.secondary);
  document.documentElement.style.setProperty('--accent-gradient',
    `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`);

  // Wallpaper
  const desktop = document.getElementById('desktop');
  if (desktop) {
    const wallMap = {
      'gradient-dark': 'wallpaper-gradient',
      'grid-dark':     'wallpaper-grid',
      'aurora':        'wallpaper-aurora',
      'dots':          'wallpaper-dots',
      'topography':    'wallpaper-topo',
      'solid':         'wallpaper-solid',
    };
    const cls = wallMap[wallpaper] || 'wallpaper-gradient';
    desktop.classList.add(cls);
  }
};

/* ── Open App ────────────────────────────────────────────── */
const openApp = (appId, args = {}, opts = {}) => {
  const app = window._OS.apps[appId];
  if (!app) { console.warn('Unknown app:', appId); return; }
  WindowManager.open(appId, args, { ...opts, title: app.name, icon: app.emoji });
};

/* ── EventBus handlers ───────────────────────────────────── */
const wireEvents = () => {
  // Open app by id
  EventBus.on('window:open', ({ appId, args, opts }) => openApp(appId, args, opts));

  // Open file → detect best app
  EventBus.on('file:open', ({ path }) => {
    if (!path) return;
    if (path.endsWith('.md')) {
      openApp('editor', { path });
    } else if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.py') || path.endsWith('.json')) {
      openApp('ide', { path });
    } else {
      openApp('editor', { path });
    }
  });

  // Open file in editor directly
  EventBus.on('file:open-editor', ({ path, newFile }) => {
    openApp('editor', { path, newFile });
  });

  // Open file in wiki
  EventBus.on('file:open-wiki', ({ path, name }) => {
    openApp('wiki', { path, name });
  });

  // Keyboard: Ctrl+K → command palette
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'k') {
      e.preventDefault();
      EventBus.emit('commandpalette:open');
    }

    // ? key → shortcuts overlay (only when not in input)
    if (e.key === '?' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
      toggleShortcutsOverlay();
    }

    // F11 → fullscreen
    if (e.key === 'F11') {
      e.preventDefault();
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });

  // Settings changes
  EventBus.on('settings:theme', ({ theme }) => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
  });
};

/* ── Shortcuts Overlay ───────────────────────────────────── */
const toggleShortcutsOverlay = () => {
  let overlay = document.getElementById('shortcuts-overlay');
  if (overlay) { overlay.remove(); return; }

  overlay = document.createElement('div');
  overlay.id = 'shortcuts-overlay';
  overlay.innerHTML = `
    <div class="shortcuts-modal">
      <div class="shortcuts-title">⌨️ Keyboard Shortcuts</div>
      <div class="shortcuts-grid">
        ${[
          ['Ctrl+K',          'Command Palette'],
          ['Ctrl+Alt+1/2/3',  'Switch Workspace'],
          ['?',               'Show Shortcuts'],
          ['F11',             'Toggle Fullscreen'],
          ['Ctrl+S',          'Save (in Editor/IDE)'],
          ['Ctrl+B',          'Bold (in Editor)'],
          ['Ctrl+I',          'Italic (in Editor)'],
          ['Ctrl+`',          'Toggle Terminal (IDE)'],
          ['Ctrl+\\',         'Split Editor (IDE)'],
          ['↑↓',              'Command History (Terminal)'],
          ['Tab',             'Autocomplete (Terminal)'],
          ['Ctrl+L',          'Clear (Terminal/AI)'],
          ['Ctrl+C',          'Cancel (Terminal/AI)'],
        ].map(([k, v]) => `<div class="shortcut-item"><kbd>${k}</kbd><span>${v}</span></div>`).join('')}
      </div>
      <div style="text-align:center;margin-top:16px;color:var(--text-muted);font-size:12px;">Press <kbd>?</kbd> or click outside to close</div>
    </div>`;
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
};

/* ── Boot sequence ───────────────────────────────────────── */
const boot = async () => {
  const bootScreen = document.getElementById('boot-screen');

  try {
    // Apply saved prefs before anything shows
    applyPrefs();

    // Init core systems in parallel where possible
    await Promise.all([
      FS.init().then(async () => {
        // Seed filesystem if first boot
        const seeded = localStorage.getItem('os_fs_seeded');
        if (!seeded) {
          await seedFilesystem();
          localStorage.setItem('os_fs_seeded', '1');
        }
      }),
    ]);

    // Init UI systems
    Notifications.init();
    WindowManager.init();
    Taskbar.init(APP_REGISTRY);
    Desktop.init(APP_REGISTRY);
    CommandPalette.init(APP_REGISTRY);
    Workspaces.init();

    // Wire EventBus handlers
    wireEvents();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/OS/sw.js').catch(() => {
        // Ignore SW registration errors (local dev, etc.)
      });
    }

    // Hide boot screen
    if (bootScreen) {
      bootScreen.classList.add('boot-done');
      setTimeout(() => bootScreen.remove(), 600);
    }

    // Welcome notification
    setTimeout(() => {
      Notifications.add({
        type: 'success',
        title: 'BrowserOS Ready',
        message: 'Double-click any icon to launch an app. Press Ctrl+K for the command palette.',
        icon: '🖥️',
        ttl: 5000,
      });
    }, 800);

    console.log('[BrowserOS] Boot complete.', window._OS.apps);

  } catch (err) {
    console.error('[BrowserOS] Boot failed:', err);
    if (bootScreen) {
      bootScreen.innerHTML = `
        <div style="color:#f43f5e;font-family:monospace;padding:32px;text-align:center;">
          <h2>Boot Error</h2>
          <pre style="font-size:12px;color:rgba(255,255,255,0.6);text-align:left;max-width:600px;">${err.stack || err.message}</pre>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#7c6af7;color:#fff;border:none;border-radius:6px;cursor:pointer;">Reload</button>
        </div>`;
    }
  }
};

/* ── Seed filesystem ─────────────────────────────────────── */
const seedFilesystem = async () => {
  const files = [
    {
      path: '/notes/Welcome.md',
      content: `---
title: Welcome to BrowserOS
tags: [welcome, getting-started]
---

# Welcome to BrowserOS 🖥️

Welcome to **BrowserOS** — a fully-featured operating system running entirely in your browser.

No installation required. All your data lives in IndexedDB on your device.

## Quick Start

- 📁 **File Manager** — Browse and organize your files
- ✏️ **Markdown Editor** — Write notes with live preview
- 🕸️ **Knowledge Graph** — Visualize connections between your notes
- 📖 **Wiki** — Read your notes as a beautiful wiki
- 💻 **Terminal** — Run commands in a fake shell
- 🤖 **AI Terminal** — AI-powered coding assistant

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl+K\` | Command Palette |
| \`?\` | Show all shortcuts |
| \`F11\` | Fullscreen |

## Explore Further

Check out [[Getting Started]] for a detailed tour.
See the [[Knowledge Graph]] to understand how notes connect.
Learn about [[Terminal Commands]] for shell usage.

> **Tip:** Click any \`[[wikilink]]\` to navigate to that note.
`
    },
    {
      path: '/notes/Getting Started.md',
      content: `---
title: Getting Started
tags: [guide, tutorial]
---

# Getting Started with BrowserOS

This guide walks you through the key features of BrowserOS.

## The Desktop

Your desktop shows app icons. **Double-click** to open any app.
**Right-click** the desktop for quick actions.

## Windows

Windows are fully draggable and resizable:
- **Drag** the title bar to move
- **Drag** the edges/corners to resize
- Click **⊟ ○ ✕** to minimize, maximize, or close

## Workspaces

BrowserOS supports **3 virtual workspaces**. Use \`Ctrl+Alt+1\`, \`Ctrl+Alt+2\`, \`Ctrl+Alt+3\` to switch.

## The Knowledge Graph

Your notes are connected via \`[[wikilinks]]\`. The [[Knowledge Graph]] app visualizes these connections as an interactive D3 force-directed graph.

Try opening the Graph and watching your notes appear as nodes!

## Markdown Editor

The [[Markdown Editor]] offers:
- Split-pane editing (write on left, preview on right)
- Live \`[[wikilink]]\` preview
- Auto-save after 1.5 seconds
- Toolbar for bold, italic, code, wikilinks, tables

## Terminal

The [[Terminal Commands]] reference explains all available shell commands.

## AI Terminal

The AI Terminal (🤖) lets you interact with your notes using natural language:
- \`explain Welcome.md\`
- \`find files about knowledge graph\`
- \`create note My Project Ideas\`

Add your **Anthropic API key** in Settings to get real AI responses!
`
    },
    {
      path: '/notes/Knowledge Graph.md',
      content: `---
title: Knowledge Graph
tags: [graph, visualization, wikilinks]
---

# Knowledge Graph 🕸️

The Knowledge Graph visualizes connections between your notes as a **force-directed D3 graph**.

## How It Works

1. Every \`.md\` file becomes a **node** in the graph
2. \`[[wikilinks]]\` between files become **edges** (connections)
3. Nodes with more backlinks are **larger**
4. Nodes are **colored by folder**

## Interacting with the Graph

- **Click** a node to open the file
- **Drag** nodes to rearrange the layout
- **Zoom** with scroll wheel or pinch
- **Hover** to see file details and connections
- Use the **search** to highlight specific nodes
- Toggle **folder filters** to focus on specific areas

## Creating Connections

Simply add \`[[Note Name]]\` in any markdown file to create a link.

For example, this note links to:
- [[Welcome]]
- [[Getting Started]]
- [[Architecture Overview]]

See also: [[Markdown Editor]] for creating and editing notes.
`
    },
    {
      path: '/notes/Terminal Commands.md',
      content: `---
title: Terminal Commands
tags: [terminal, commands, shell]
---

# Terminal Commands 💻

BrowserOS includes a fully-featured fake terminal with common Unix-like commands.

## Basic Commands

\`\`\`bash
help              # Show all commands
clear             # Clear the screen
pwd               # Print working directory
whoami            # Show current user
date              # Show current date/time
neofetch          # System info with ASCII art
\`\`\`

## File Navigation

\`\`\`bash
ls                # List directory contents
ls -l             # Long format listing
cd /notes         # Change directory
cd ..             # Go up one level
\`\`\`

## File Operations

\`\`\`bash
cat file.md       # Show file contents
touch file.md     # Create empty file
mkdir folder      # Create directory
rm file.md        # Delete file
rm -r folder      # Delete folder recursively
mv src dst        # Move/rename file
cp src dst        # Copy file
\`\`\`

## Search

\`\`\`bash
find -name "*.md"          # Find markdown files
grep "pattern" file.md     # Search in file
\`\`\`

## App Integration

\`\`\`bash
edit file.md      # Open in Markdown Editor
open file.md      # Open in best app
\`\`\`

See [[Getting Started]] for more information about the OS.
`
    },
    {
      path: '/notes/Architecture Overview.md',
      content: `---
title: Architecture Overview
tags: [architecture, technical, design]
---

# Architecture Overview 🏗️

BrowserOS is built as a pure static web application with no build step.

## Core Modules

### Window Manager
The \`WindowManager\` handles all window operations:
- Drag (pointer events with bounds clamping)
- Resize (8-direction handles)
- Snap zones (left/right/top edges)
- Z-index management

### Virtual File System
\`fileSystem.js\` provides a virtual FS backed by **Dexie.js** (IndexedDB wrapper):
- \`readFile\`, \`writeFile\`, \`readDir\`, \`mkdir\`, \`delete\`, \`move\`, \`copy\`
- Full-text search across all files
- Backlinks query (which files link to this one?)
- Automatic wikilink extraction

### Event Bus
All cross-module communication goes through \`EventBus\` — a simple pub/sub:
\`\`\`js
EventBus.emit('window:open', { appId: 'editor' });
EventBus.on('file:open', ({ path }) => { ... });
\`\`\`

## Tech Stack

| Library | Purpose |
|---------|---------|
| D3.js v7 | Knowledge Graph visualization |
| Dexie.js v4 | IndexedDB virtual filesystem |
| marked.js | Markdown → HTML rendering |
| Monaco Editor | VS Code-like IDE |
| Fuse.js | Fuzzy search |
| highlight.js | Code syntax highlighting |

See [[Knowledge Graph]] for how notes connect.
See [[Getting Started]] for a user guide.
`
    },
    {
      path: '/notes/Ideas and Todo.md',
      content: `---
title: Ideas and Todo
tags: [ideas, todo, planning]
---

# Ideas and Todo 💡

A scratchpad for ideas and tasks.

## Current Ideas

- [ ] Add drag-and-drop file upload support
- [ ] Export all notes as a ZIP archive
- [ ] Collaborative editing via WebRTC
- [ ] Custom CSS theme editor
- [ ] Note templates with variables
- [ ] Calendar view for time-tagged notes
- [ ] Voice input integration

## Knowledge Base Goals

The [[Knowledge Graph]] should eventually support:
- Tag-based clustering
- Time-based layouts (chronological)
- Geographic connections

## Links to Explore

- [[Welcome]] — Start here
- [[Getting Started]] — User guide
- [[Architecture Overview]] — Technical details
- [[Markdown Editor]] — Writing experience

## Notes

> Use \`[[wikilinks]]\` to connect ideas across your knowledge base.
> The more links, the richer the graph!
`
    },
    {
      path: '/notes/Markdown Editor.md',
      content: `---
title: Markdown Editor
tags: [editor, markdown, writing]
---

# Markdown Editor ✏️

The Markdown Editor provides a split-pane writing environment.

## Features

### Split View
The editor shows your raw Markdown on the **left** and a live rendered preview on the **right**.

### Wikilinks
Type \`[[Note Name]]\` to link to another note. Click wikilinks in the preview to navigate.

### Frontmatter
Add YAML frontmatter for metadata:

\`\`\`yaml
---
title: My Note
tags: [work, important]
---
\`\`\`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl+S\` | Save |
| \`Ctrl+B\` | Bold |
| \`Ctrl+I\` | Italic |
| \`Tab\` | 2-space indent |

### Toolbar

The toolbar provides one-click formatting:
- **B** — Bold text
- *I* — Italic text
- \`</>\` — Inline code
- \`[[]]\` — Insert wikilink
- ⊞ — Insert table

## Auto-Save

Files are automatically saved **1.5 seconds** after you stop typing.

See [[Getting Started]] for a full tour.
See [[Knowledge Graph]] for visualizing your notes.
`
    },
    {
      path: '/projects/Project Alpha.md',
      content: `---
title: Project Alpha
tags: [project, active]
---

# Project Alpha 🚀

## Overview

This is an active project tracking file.

## Goals

1. Build a comprehensive knowledge base
2. Connect ideas using [[wikilinks]]
3. Visualize the connections in the [[Knowledge Graph]]

## Progress

- [x] Set up initial structure
- [x] Create core documentation
- [ ] Expand with more detailed notes
- [ ] Review connections in graph

## Related Notes

- [[Architecture Overview]]
- [[Ideas and Todo]]
- [[Getting Started]]
`
    },
    {
      path: '/projects/Project Beta.md',
      content: `---
title: Project Beta
tags: [project, planning]
---

# Project Beta 🔬

## Overview

A planning document for the next phase.

## Research Areas

- Knowledge management systems
- Graph-based note taking (like [[Knowledge Graph]])
- Terminal-first workflows (see [[Terminal Commands]])

## Timeline

| Phase | Status |
|-------|--------|
| Research | ✅ Done |
| Design | 🔄 In Progress |
| Build | ⏳ Planned |

## See Also

- [[Project Alpha]] — Sister project
- [[Ideas and Todo]] — Feature backlog
`
    },
  ];

  for (const file of files) {
    await FS.writeFile(file.path, file.content);
  }
};

/* ── Start ───────────────────────────────────────────────── */
// Wait for DOM if needed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
