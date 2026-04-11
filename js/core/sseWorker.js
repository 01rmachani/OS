/* =========================================================
   BrowserOS — SSE Simulation Web Worker
   Generates synthetic system events for the Live Feed app.
   This file runs in a Web Worker context (no DOM access).
   ========================================================= */

const EVENT_CATALOG = {
  system: [
    'CPU usage: 12%', 'CPU usage: 34%', 'CPU usage: 67%', 'CPU usage: 5%',
    'Memory: 1.2 GB used / 8 GB total', 'Memory pressure: low',
    'Garbage collection: 12ms', 'IndexedDB flush: 4ms',
    'Service Worker: cache updated', 'Browser heap: 48 MB',
    'Render thread: 60 FPS', 'Layout reflow: 2ms',
    'Session restored from storage', 'Settings saved to localStorage',
  ],
  file: [
    'Created: /notes/new-idea.md', 'Modified: /notes/Welcome.md',
    'Modified: /notes/Architecture Overview.md', 'Created: /projects/readme.md',
    'Deleted: /tmp/scratch.txt', 'Moved: /drafts/idea.md → /notes/idea.md',
    'Copied: /notes/template.md → /notes/new-note.md',
    'Auto-saved: /notes/Getting Started.md', 'Indexed: 7 markdown files',
    'Wikilinks parsed: 23 connections found',
  ],
  network: [
    'CDN: marked.js loaded (cached)', 'CDN: d3.min.js loaded (cached)',
    'CDN: highlight.js loaded (cached)', 'CDN: Dexie loaded (cached)',
    'Font: Inter loaded from Google Fonts', 'PWA: Service Worker active',
    'Request: GET /data/seed/Welcome.md 200 OK',
    'WebSocket ping: 14ms', 'DNS resolved: fonts.googleapis.com',
    'Prefetch: /data/seed/Knowledge Graph.md',
  ],
  log: [
    '[INFO]  FileSystem initialized successfully',
    '[INFO]  WindowManager ready — 0 open windows',
    '[INFO]  Knowledge Graph: 7 nodes, 18 edges',
    '[INFO]  Command Palette: indexed 9 apps + 7 files',
    '[WARN]  Backdrop-filter may degrade on low-end devices',
    '[WARN]  Large file detected: content truncated for performance',
    '[INFO]  SSE Worker connected — streaming events',
    '[DEBUG] EventBus: 4 active listeners on fs:change',
    '[INFO]  Markdown parsed: 1.2ms average render time',
    '[ERROR] Failed to load custom wallpaper URL — using default',
    '[INFO]  D3 force simulation converged in 148 ticks',
    '[WARN]  Monaco Editor not yet loaded — lazy init on first open',
  ],
};

const TYPES = Object.keys(EVENT_CATALOG);
let eventId = 1;
let paused = false;
let intervalMs = 1800;

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function emit() {
  if (paused) return;
  const type = randomItem(TYPES);
  const data = randomItem(EVENT_CATALOG[type]);
  self.postMessage({
    id: eventId++,
    type,
    data,
    timestamp: new Date().toISOString(),
  });
}

// Variable rate: emit 1-3 events in a burst, then wait
function scheduleBurst() {
  const count = Math.random() < 0.3 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    setTimeout(emit, i * 200);
  }
  // Next burst in 1-4 seconds
  const next = 1000 + Math.random() * 3000;
  setTimeout(scheduleBurst, next);
}

// Handle messages from main thread
self.onmessage = (e) => {
  if (e.data.type === 'pause') paused = true;
  if (e.data.type === 'resume') paused = false;
  if (e.data.type === 'setRate') intervalMs = e.data.ms;
};

// Start immediately
scheduleBurst();
