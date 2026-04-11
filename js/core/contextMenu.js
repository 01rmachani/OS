/* =========================================================
   BrowserOS — Global Context Menu
   ========================================================= */
import { EventBus } from './eventBus.js';

export const ContextMenu = {
  init() {
    EventBus.on('contextmenu:show', ({ x, y, items }) => this.show(x, y, items));

    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', () => this.hide());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  },

  show(x, y, items) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';
    menu.classList.remove('hidden');

    items.forEach(item => {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'ctx-separator';
        menu.appendChild(sep);
        return;
      }
      const el = document.createElement('div');
      el.className = 'ctx-item' + (item.danger ? ' danger' : '');
      el.innerHTML = `
        <span class="ctx-item-icon">${item.icon || ''}</span>
        <span>${item.label}</span>
        ${item.shortcut ? `<span class="ctx-item-shortcut">${item.shortcut}</span>` : ''}
      `;
      if (item.disabled) {
        el.style.opacity = '0.4';
        el.style.pointerEvents = 'none';
      } else {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hide();
          item.action?.();
        });
      }
      menu.appendChild(el);
    });

    // Position with boundary detection
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = 200, mh = items.length * 34;
    const fx = x + mw > vw ? vw - mw - 8 : x;
    const fy = y + mh > vh ? vh - mh - 8 : y;

    menu.style.left = fx + 'px';
    menu.style.top  = fy + 'px';
  },

  hide() {
    document.getElementById('context-menu').classList.add('hidden');
  },
};
