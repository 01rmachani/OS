/* =========================================================
   BrowserOS — Terminal Emulator
   ========================================================= */
import { FS } from '../core/fileSystem.js';
import { EventBus } from '../core/eventBus.js';

export const TerminalApp = {
  id: 'terminal', name: 'Terminal', emoji: '💻',
  iconBg: 'icon-bg-indigo', defaultWidth: 720, defaultHeight: 480,
  minWidth: 400, minHeight: 280,
  keywords: ['terminal', 'shell', 'bash', 'command', 'cli'],
  description: 'Fake shell with ANSI colors and virtual filesystem commands.',

  mount(container, args) {
    let cwd = '/';
    let cmdHistory = [];
    let histIdx = -1;

    container.innerHTML = `
      <div class="terminal-app">
        <div class="terminal-output" id="term-output"></div>
        <div class="terminal-input-row">
          <span class="terminal-input-prompt" id="term-prompt">user@browseros:/ $</span>
          <input class="terminal-input" id="term-input" autocomplete="off" spellcheck="false" autofocus>
        </div>
      </div>`;

    const output  = container.querySelector('#term-output');
    const input   = container.querySelector('#term-input');
    const promptEl = container.querySelector('#term-prompt');

    const updatePrompt = () => {
      promptEl.textContent = `user@browseros:${cwd} $`;
    };

    const print = (text, cls = '') => {
      const div = document.createElement('div');
      div.className = 'terminal-output-text' + (cls ? ' ' + cls : '');
      div.innerHTML = ansiToHtml(text);
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
    };

    const printCmd = (cmd) => {
      const line = document.createElement('div');
      line.className = 'terminal-prompt-line';
      line.innerHTML = `<span class="terminal-prompt">${promptEl.textContent}</span><span class="terminal-cmd"> ${escHtml(cmd)}</span>`;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };

    const ansiToHtml = (str) => {
      return escHtml(str)
        .replace(/\x1b\[1m/g, '<span class="ansi-bold">')
        .replace(/\x1b\[31m/g, '<span class="ansi-red">')
        .replace(/\x1b\[32m/g, '<span class="ansi-green">')
        .replace(/\x1b\[33m/g, '<span class="ansi-yellow">')
        .replace(/\x1b\[34m/g, '<span class="ansi-blue">')
        .replace(/\x1b\[35m/g, '<span class="ansi-magenta">')
        .replace(/\x1b\[36m/g, '<span class="ansi-cyan">')
        .replace(/\x1b\[2m/g,  '<span class="ansi-dim">')
        .replace(/\x1b\[0m/g,  '</span>')
        .replace(/\x1b\[[0-9;]*m/g, '');
    };

    const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const resolvePath = (p) => {
      if (!p || p === '~') return '/';
      if (p.startsWith('/')) return normPath(p);
      return normPath(cwd + '/' + p);
    };

    const normPath = (p) => {
      const parts = p.split('/').filter(Boolean);
      const res = [];
      for (const part of parts) {
        if (part === '..') res.pop();
        else if (part !== '.') res.push(part);
      }
      return '/' + res.join('/');
    };

    // ──────────────────────────────────────────────────────
    const commands = {
      help: async (args) => {
        const cmd = args[0];
        if (cmd && HELP[cmd]) { print(HELP[cmd]); return; }
        print('\x1b[1m\x1b[36mBrowserOS Shell\x1b[0m — Available commands:\n');
        const cols = Object.keys(HELP).sort();
        let row = '';
        cols.forEach((c, i) => {
          row += c.padEnd(16);
          if ((i + 1) % 4 === 0) { print('  ' + row, 'muted'); row = ''; }
        });
        if (row) print('  ' + row, 'muted');
        print('\nType \x1b[33mhelp <command>\x1b[0m for details.', 'info');
      },

      clear: async () => { output.innerHTML = ''; },

      pwd: async () => print(cwd),

      cd: async (args) => {
        const target = resolvePath(args[0] || '/');
        const stat = await FS.stat(target);
        if (!stat) { print(`cd: ${args[0]}: No such directory`, 'error'); return; }
        if (stat.type !== 'directory') { print(`cd: ${args[0]}: Not a directory`, 'error'); return; }
        cwd = target;
        updatePrompt();
      },

      ls: async (args) => {
        const flags = args.filter(a => a.startsWith('-')).join('');
        const path  = resolvePath(args.find(a => !a.startsWith('-')) || cwd);
        const entries = await FS.readDir(path).catch(() => null);
        if (entries === null) { print(`ls: ${path}: No such directory`, 'error'); return; }
        if (!entries.length)  { print('(empty)', 'muted'); return; }

        if (flags.includes('l')) {
          entries.forEach(e => {
            const type = e.type === 'directory' ? '\x1b[34md\x1b[0m' : '-';
            const size = e.type === 'file' ? FS.formatSize(e.size || 0).padStart(8) : '       -';
            const date = new Date(e.modified).toLocaleDateString();
            const name = e.type === 'directory'
              ? `\x1b[34m${e.name}/\x1b[0m`
              : e.name.endsWith('.md') ? `\x1b[32m${e.name}\x1b[0m` : e.name;
            print(`${type} ${size}  ${date}  ${name}`);
          });
        } else {
          const line = entries.map(e => {
            if (e.type === 'directory') return `\x1b[34m${e.name}/\x1b[0m`;
            if (e.name.endsWith('.md')) return `\x1b[32m${e.name}\x1b[0m`;
            return e.name;
          }).join('  ');
          print(line);
        }
      },

      cat: async (args) => {
        if (!args.length) { print('Usage: cat <file>', 'error'); return; }
        const path = resolvePath(args[0]);
        const content = await FS.readFile(path);
        if (content === null) { print(`cat: ${args[0]}: No such file`, 'error'); return; }
        print(content || '(empty file)', 'muted');
      },

      touch: async (args) => {
        if (!args.length) { print('Usage: touch <file>', 'error'); return; }
        const path = resolvePath(args[0]);
        const exists = await FS.exists(path);
        if (!exists) await FS.writeFile(path, '');
        print(`Created: ${path}`, 'success');
      },

      mkdir: async (args) => {
        if (!args.length) { print('Usage: mkdir <dir>', 'error'); return; }
        const recursive = args.includes('-p');
        const name = args.find(a => !a.startsWith('-'));
        const path = resolvePath(name);
        try {
          if (recursive) await FS.mkdirP(path);
          else await FS.mkdir(path);
          print(`Created directory: ${path}`, 'success');
        } catch(e) { print(`mkdir: ${e.message}`, 'error'); }
      },

      rm: async (args) => {
        if (!args.length) { print('Usage: rm [-r] <path>', 'error'); return; }
        const recursive = args.includes('-r') || args.includes('-rf');
        const name = args.find(a => !a.startsWith('-'));
        const path = resolvePath(name);
        try {
          await FS.delete(path, recursive);
          print(`Removed: ${path}`, 'success');
        } catch(e) { print(`rm: ${e.message}`, 'error'); }
      },

      mv: async (args) => {
        if (args.length < 2) { print('Usage: mv <source> <dest>', 'error'); return; }
        const src = resolvePath(args[0]), dst = resolvePath(args[1]);
        try { await FS.move(src, dst); print(`Moved: ${src} → ${dst}`, 'success'); }
        catch(e) { print(`mv: ${e.message}`, 'error'); }
      },

      cp: async (args) => {
        if (args.length < 2) { print('Usage: cp <source> <dest>', 'error'); return; }
        const src = resolvePath(args[0]), dst = resolvePath(args[1]);
        try { await FS.copy(src, dst); print(`Copied: ${src} → ${dst}`, 'success'); }
        catch(e) { print(`cp: ${e.message}`, 'error'); }
      },

      echo: async (args) => {
        const redirectIdx = args.indexOf('>');
        const appendIdx  = args.indexOf('>>');
        if (appendIdx !== -1) {
          const text = args.slice(0, appendIdx).join(' ');
          const path = resolvePath(args[appendIdx + 1]);
          const existing = await FS.readFile(path) || '';
          await FS.writeFile(path, existing + text + '\n');
          print(`Appended to ${path}`, 'success');
        } else if (redirectIdx !== -1) {
          const text = args.slice(0, redirectIdx).join(' ');
          const path = resolvePath(args[redirectIdx + 1]);
          await FS.writeFile(path, text + '\n');
          print(`Written to ${path}`, 'success');
        } else {
          print(args.join(' '));
        }
      },

      grep: async (args) => {
        if (args.length < 2) { print('Usage: grep <pattern> <file>', 'error'); return; }
        const pattern = new RegExp(args[0], 'gi');
        const path = resolvePath(args[1]);
        const content = await FS.readFile(path);
        if (content === null) { print(`grep: ${args[1]}: No such file`, 'error'); return; }
        const lines = content.split('\n');
        let found = 0;
        lines.forEach((line, i) => {
          if (pattern.test(line)) {
            print(`\x1b[2m${i+1}:\x1b[0m ${line.replace(pattern, m => `\x1b[33m${m}\x1b[0m`)}`);
            found++;
          }
        });
        if (!found) print('No matches found.', 'muted');
        else print(`\n${found} match${found!==1?'es':''} found.`, 'info');
      },

      find: async (args) => {
        const nameFlag = args.indexOf('-name');
        if (nameFlag !== -1 && args[nameFlag+1]) {
          const pattern = args[nameFlag+1].replace(/\*/g, '.*').replace(/\?/g, '.');
          const re = new RegExp(pattern, 'i');
          const all = await FS.getAllFiles();
          const matches = all.filter(f => re.test(f.name));
          if (!matches.length) print('No files found.', 'muted');
          else matches.forEach(f => print(f.path, 'info'));
        } else {
          const files = await FS.search(args.find(a => !a.startsWith('-')) || '');
          files.forEach(f => print(f.path, 'info'));
        }
      },

      edit: async (args) => {
        const path = resolvePath(args[0] || '');
        EventBus.emit('file:open-editor', { path });
        print(`Opening ${path} in editor…`, 'info');
      },

      open: async (args) => {
        const path = resolvePath(args[0] || '');
        EventBus.emit('file:open', { path });
        print(`Opening ${path}…`, 'info');
      },

      whoami: async () => print('user'),

      date: async () => print(new Date().toString()),

      history: async () => {
        cmdHistory.slice(-20).forEach((c, i) => print(`  ${String(i+1).padStart(3)}  ${c}`, 'muted'));
      },

      theme: async (args) => {
        const t = args[0];
        if (t === 'dark')  { document.documentElement.classList.remove('light-theme'); print('Switched to dark theme.', 'success'); }
        else if (t === 'light') { document.documentElement.classList.add('light-theme'); print('Switched to light theme.', 'success'); }
        else print('Usage: theme <dark|light>', 'error');
      },

      neofetch: async () => {
        const files = await FS.getAllFiles();
        const logo = [
          ' ██████╗ ██████╗  ██████╗ ',
          ' ██╔══██╗██╔══██╗██╔═══██╗',
          ' ██████╔╝██████╔╝██║   ██║',
          ' ██╔══██╗██╔══██╗██║   ██║',
          ' ██████╔╝██║  ██║╚██████╔╝',
          ' ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ',
        ];
        const info = [
          ['OS', 'BrowserOS v1.0.0'],
          ['Shell', 'BrowserShell 1.0'],
          ['Engine', navigator.userAgent.match(/Chrome|Firefox|Safari/)?.[0] || 'Browser'],
          ['Files', files.length + ' indexed'],
          ['Theme', document.documentElement.classList.contains('light-theme') ? 'Light' : 'Dark'],
          ['Storage', (await FS.getStorageUsage()).used ? FS.formatSize((await FS.getStorageUsage()).used) : 'N/A'],
          ['Resolution', window.innerWidth + 'x' + window.innerHeight],
        ];
        const div = document.createElement('div');
        div.className = 'neofetch-output';
        div.innerHTML = `
          <pre class="neofetch-logo" style="color:#7c6af7;font-size:10px;">${logo.join('\n')}</pre>
          <div class="neofetch-info">${info.map(([k,v]) =>
            `<div><span class="neofetch-key">${k}:</span> <span class="neofetch-val">${v}</span></div>`
          ).join('')}</div>`;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
      },
    };

    const HELP = {
      ls: 'ls [-l] [path]  — List directory contents', cd: 'cd [path]  — Change directory',
      cat: 'cat <file>  — Display file contents', touch: 'touch <file>  — Create empty file',
      mkdir: 'mkdir [-p] <dir>  — Create directory', rm: 'rm [-r] <path>  — Remove file/directory',
      mv: 'mv <src> <dst>  — Move/rename', cp: 'cp <src> <dst>  — Copy file',
      echo: 'echo <text> [> file]  — Print or redirect', grep: 'grep <pattern> <file>  — Search content',
      find: 'find [path] [-name pattern]  — Find files', edit: 'edit <file>  — Open in editor',
      open: 'open <file>  — Open with default app', pwd: 'pwd  — Print working directory',
      whoami: 'whoami  — Print current user', date: 'date  — Print current date/time',
      history: 'history  — Show command history', clear: 'clear  — Clear terminal',
      theme: 'theme <dark|light>  — Switch OS theme', neofetch: 'neofetch  — Show system info',
      help: 'help [command]  — Show help',
    };

    const runCommand = async (raw) => {
      const parts = raw.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const cmdArgs = parts.slice(1);

      if (!cmd) return;

      if (commands[cmd]) {
        try { await commands[cmd](cmdArgs); }
        catch(e) { print(`Error: ${e.message}`, 'error'); }
      } else {
        print(`${cmd}: command not found. Type 'help' for available commands.`, 'error');
      }
    };

    // Input handling
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const raw = input.value.trim();
        input.value = '';
        printCmd(raw);
        if (raw) {
          cmdHistory.push(raw);
          histIdx = cmdHistory.length;
        }
        await runCommand(raw);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        histIdx = Math.max(0, histIdx - 1);
        input.value = cmdHistory[histIdx] || '';
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        histIdx = Math.min(cmdHistory.length, histIdx + 1);
        input.value = cmdHistory[histIdx] || '';
      }
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault(); output.innerHTML = '';
      }
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault(); printCmd('^C'); input.value = '';
      }
      // Tab completion
      if (e.key === 'Tab') {
        e.preventDefault();
        await tabComplete();
      }
    });

    const tabComplete = async () => {
      const val = input.value;
      const parts = val.split(/\s+/);
      const last = parts[parts.length - 1];
      if (!last) return;

      const parentPath = last.includes('/')
        ? resolvePath(last.slice(0, last.lastIndexOf('/') + 1))
        : cwd;
      const prefix = last.includes('/') ? last.slice(last.lastIndexOf('/') + 1) : last;

      const entries = await FS.readDir(parentPath).catch(() => []);
      const matches = entries.filter(e => e.name.toLowerCase().startsWith(prefix.toLowerCase()));

      if (matches.length === 1) {
        parts[parts.length - 1] = (last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : '') +
          matches[0].name + (matches[0].type === 'directory' ? '/' : '');
        input.value = parts.join(' ');
      } else if (matches.length > 1) {
        print(matches.map(m => m.name + (m.type === 'directory' ? '/' : '')).join('  '), 'muted');
      }
    };

    // Focus input on click
    container.addEventListener('click', () => input.focus());

    // Welcome message
    print('\x1b[1m\x1b[36mBrowserOS Terminal\x1b[0m — Type \x1b[33mhelp\x1b[0m for available commands.');
    print('\x1b[2mCurrent directory: /\x1b[0m\n');
    input.focus();
  }
};
