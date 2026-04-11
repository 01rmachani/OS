/* =========================================================
   BrowserOS — Live Feed (SSE Simulation via Web Worker)
   ========================================================= */
import { EventBus } from '../core/eventBus.js';

export const LiveFeedApp = {
  id: 'livefeed', name: 'Live Feed', emoji: '📡',
  iconBg: 'icon-bg-teal', defaultWidth: 680, defaultHeight: 520,
  keywords: ['sse', 'live', 'feed', 'events', 'stream', 'real-time'],
  description: 'Real-time SSE event stream simulated via Web Worker.',

  mount(container, args) {
    let worker = null;
    let paused = false;
    let eventCount = 0;
    let totalByType = { system: 0, file: 0, network: 0, log: 0 };
    let activeFilters = new Set(['system', 'file', 'network', 'log']);
    const MAX_EVENTS = 200;

    container.innerHTML = `
      <div class="livefeed-app">
        <div class="livefeed-toolbar">
          <div class="livefeed-status">
            <div class="livefeed-dot" id="lf-dot"></div>
            <span id="lf-status">Connected</span>
          </div>
          <div class="livefeed-filters">
            ${['system','file','network','log'].map(type => `
              <label class="livefeed-filter active" data-type="${type}">
                <div class="livefeed-filter-dot" style="background:${typeColor(type)}"></div>
                ${type}
              </label>`).join('')}
          </div>
          <button class="btn btn-ghost" id="lf-pause" style="font-size:12px;padding:4px 10px;">⏸ Pause</button>
          <button class="btn btn-ghost" id="lf-clear" style="font-size:12px;padding:4px 10px;">🗑 Clear</button>
        </div>
        <div class="livefeed-events" id="lf-events"></div>
        <div class="livefeed-stats">
          <div class="livefeed-stat">Total: <span class="livefeed-stat-val" id="lf-count">0</span></div>
          <div class="livefeed-stat" style="color:${typeColor('system')}">System: <span class="livefeed-stat-val" id="lf-system">0</span></div>
          <div class="livefeed-stat" style="color:${typeColor('file')}">File: <span class="livefeed-stat-val" id="lf-file">0</span></div>
          <div class="livefeed-stat" style="color:${typeColor('network')}">Network: <span class="livefeed-stat-val" id="lf-network">0</span></div>
          <div class="livefeed-stat" style="color:${typeColor('log')}">Log: <span class="livefeed-stat-val" id="lf-log">0</span></div>
        </div>
      </div>`;

    const eventsEl = container.querySelector('#lf-events');

    function typeColor(type) {
      return { system: '#7c6af7', file: '#10b981', network: '#06b6d4', log: '#f59e0b' }[type] || '#888';
    }

    function addEvent(ev) {
      if (!activeFilters.has(ev.type)) return;

      eventCount++;
      totalByType[ev.type] = (totalByType[ev.type] || 0) + 1;

      const time = new Date(ev.timestamp).toLocaleTimeString();
      const div = document.createElement('div');
      div.className = `livefeed-event type-${ev.type}`;
      div.innerHTML = `
        <span class="livefeed-event-time">${time}</span>
        <span class="livefeed-event-type">${ev.type}</span>
        <span class="livefeed-event-data">${ev.data}</span>`;
      eventsEl.appendChild(div);

      // Prune old events
      while (eventsEl.children.length > MAX_EVENTS) {
        eventsEl.removeChild(eventsEl.firstChild);
      }

      // Auto-scroll
      eventsEl.scrollTop = eventsEl.scrollHeight;

      // Update stats
      container.querySelector('#lf-count').textContent   = eventCount;
      container.querySelector('#lf-system').textContent  = totalByType.system || 0;
      container.querySelector('#lf-file').textContent    = totalByType.file   || 0;
      container.querySelector('#lf-network').textContent = totalByType.network|| 0;
      container.querySelector('#lf-log').textContent     = totalByType.log    || 0;

      // Forward error logs to notifications
      if (ev.type === 'log' && ev.data.includes('[ERROR]')) {
        EventBus.emit('notification:add', {
          type: 'error', title: 'System Error',
          message: ev.data.replace('[ERROR]', '').trim(),
          icon: '❌', ttl: 5000,
        });
      }
    }

    // Start Web Worker
    const startWorker = () => {
      try {
        // Use blob URL to create worker from same origin
        const workerUrl = new URL('../../js/core/sseWorker.js', import.meta.url).href;
        worker = new Worker(workerUrl);
        worker.onmessage = (e) => {
          if (!paused) addEvent(e.data);
        };
        worker.onerror = (e) => {
          console.warn('SSE Worker error:', e);
          // Fall back to setInterval simulation
          startFallback();
        };
      } catch (e) {
        console.warn('Worker creation failed, using fallback:', e);
        startFallback();
      }
    };

    // Fallback: simulate with setInterval if Worker fails
    const fallbackIntervals = [];
    const startFallback = () => {
      const events = [
        { type: 'system', data: 'CPU usage: 23%' },
        { type: 'system', data: 'Memory: 1.2 GB used' },
        { type: 'file',   data: 'Modified: /notes/Welcome.md' },
        { type: 'network',data: 'CDN: d3.min.js loaded (cached)' },
        { type: 'log',    data: '[INFO]  FileSystem initialized' },
        { type: 'log',    data: '[WARN]  Large file detected' },
        { type: 'system', data: 'Render thread: 60 FPS' },
        { type: 'network',data: 'WebSocket ping: 12ms' },
        { type: 'file',   data: 'Indexed: 7 markdown files' },
        { type: 'log',    data: '[INFO]  Knowledge Graph: 7 nodes' },
      ];
      let idx = 0;
      const id = setInterval(() => {
        if (!paused) {
          const ev = events[idx % events.length];
          addEvent({ ...ev, id: Date.now(), timestamp: new Date().toISOString() });
          idx++;
        }
      }, 1200 + Math.random() * 1800);
      fallbackIntervals.push(id);
    };

    // Controls
    const pauseBtn = container.querySelector('#lf-pause');
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
      const dot = container.querySelector('#lf-dot');
      dot.classList.toggle('paused', paused);
      container.querySelector('#lf-status').textContent = paused ? 'Paused' : 'Connected';
      if (worker) worker.postMessage({ type: paused ? 'pause' : 'resume' });
    });

    container.querySelector('#lf-clear').addEventListener('click', () => {
      eventsEl.innerHTML = '';
      eventCount = 0;
      Object.keys(totalByType).forEach(k => totalByType[k] = 0);
      ['count','system','file','network','log'].forEach(k => {
        const el = container.querySelector(`#lf-${k}`);
        if (el) el.textContent = '0';
      });
    });

    // Filters
    container.querySelectorAll('.livefeed-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        if (activeFilters.has(type)) { activeFilters.delete(type); btn.classList.remove('active'); }
        else { activeFilters.add(type); btn.classList.add('active'); }
      });
    });

    startWorker();

    // Cleanup on window close
    container.addEventListener('disconnected', () => {
      worker?.terminate();
      fallbackIntervals.forEach(clearInterval);
    });

    // Initial greeting event
    setTimeout(() => addEvent({
      id: 0, type: 'system', data: 'BrowserOS Live Feed started — streaming events',
      timestamp: new Date().toISOString()
    }), 300);
  }
};
