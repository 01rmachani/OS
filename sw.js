/* =========================================================
   BrowserOS — Service Worker (PWA / Offline Support)
   Cache-first for static assets, network-first for HTML
   ========================================================= */
const CACHE_NAME = 'browseros-v1';
const STATIC_ASSETS = [
  '/OS/',
  '/OS/index.html',
  '/OS/css/os.css',
  '/OS/css/desktop.css',
  '/OS/css/windows.css',
  '/OS/css/taskbar.css',
  '/OS/css/apps/filemanager.css',
  '/OS/css/apps/editor.css',
  '/OS/css/apps/graph.css',
  '/OS/css/apps/wiki.css',
  '/OS/css/apps/terminal.css',
  '/OS/css/apps/settings.css',
  '/OS/js/os.js',
  '/OS/js/core/eventBus.js',
  '/OS/js/core/fileSystem.js',
  '/OS/js/core/windowManager.js',
  '/OS/js/core/taskbar.js',
  '/OS/js/core/desktop.js',
  '/OS/js/core/notifications.js',
  '/OS/js/core/commandPalette.js',
  '/OS/js/core/contextMenu.js',
  '/OS/js/core/workspaces.js',
  '/OS/js/core/sseWorker.js',
  '/OS/js/apps/fileManager.js',
  '/OS/js/apps/editor.js',
  '/OS/js/apps/graph.js',
  '/OS/js/apps/wiki.js',
  '/OS/js/apps/terminal.js',
  '/OS/js/apps/monacoIDE.js',
  '/OS/js/apps/aiTerminal.js',
  '/OS/js/apps/liveFeed.js',
  '/OS/js/apps/settings.js',
  '/OS/js/utils/markdown.js',
  '/OS/js/utils/storage.js',
];

// CDN assets to cache
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/dexie@4.4.2/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/fuse.js@7.3.0/dist/fuse.min.js',
  'https://cdn.jsdelivr.net/npm/marked@18.0.0/marked.min.js',
  'https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/build/highlight.min.js',
  'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js',
  'https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github-dark.min.css',
];

// ── Install: pre-cache static assets ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets (ignore failures for missing files)
      const localCache = cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some static assets not cached:', err);
      });

      // Cache CDN assets separately (ignore failures)
      const cdnCache = Promise.all(
        CDN_ASSETS.map(url =>
          fetch(url, { mode: 'cors' })
            .then(res => { if (res.ok) cache.put(url, res); })
            .catch(() => {}) // CDN failures are OK
        )
      );

      return Promise.all([localCache, cdnCache]);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for static, network-first for API ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Anthropic API calls
  if (url.hostname === 'api.anthropic.com') return;

  // Navigation requests: network-first (freshest HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(res => {
        if (!res || !res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }).catch(() => {
        // Return a helpful offline page for HTML requests
        if (event.request.headers.get('Accept')?.includes('text/html')) {
          return caches.match('/OS/') || new Response(
            '<h1>BrowserOS</h1><p>Offline — cached content unavailable.</p>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      });
    })
  );
});

// ── Background sync message handler ───────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
