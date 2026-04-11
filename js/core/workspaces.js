/* =========================================================
   BrowserOS — Virtual Workspace Manager
   ========================================================= */
import { EventBus } from './eventBus.js';

let currentWorkspace = 1;
const NUM_WORKSPACES = 3;

export const Workspaces = {
  init(WindowManager) {
    window._OS = window._OS || {};
    window._OS.currentWorkspace = 1;

    EventBus.on('workspace:switch', ({ workspace }) => {
      this.switchTo(workspace, WindowManager);
    });

    // Keyboard: Ctrl+Alt+[1-3]
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey) {
        const n = parseInt(e.key);
        if (n >= 1 && n <= NUM_WORKSPACES) {
          e.preventDefault();
          EventBus.emit('workspace:switch', { workspace: n });
        }
      }
    });
  },

  switchTo(n, WindowManager) {
    if (n === currentWorkspace) return;
    const prev = currentWorkspace;
    currentWorkspace = n;
    window._OS.currentWorkspace = n;

    const wins = WindowManager.getAll();
    wins.forEach(win => {
      const el = win.el;
      if (win.workspace === prev) {
        el.classList.add('workspace-leaving');
        el.addEventListener('animationend', () => {
          el.classList.remove('workspace-leaving');
          el.style.display = 'none';
        }, { once: true });
      } else if (win.workspace === n) {
        el.style.display = 'flex';
        el.classList.add('workspace-entering');
        el.addEventListener('animationend', () => {
          el.classList.remove('workspace-entering');
        }, { once: true });
      }
    });

    EventBus.emit('workspace:switched', { workspace: n });
  },

  getCurrentWorkspace() { return currentWorkspace; },
};
