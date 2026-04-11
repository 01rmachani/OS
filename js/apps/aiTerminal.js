/* =========================================================
   BrowserOS — AI Coding Terminal (Claude Code-style)
   ========================================================= */
import { FS } from '../core/fileSystem.js';
import { EventBus } from '../core/eventBus.js';

export const AITerminalApp = {
  id: 'aiterminal', name: 'AI Terminal', emoji: '🤖',
  iconBg: 'icon-bg-violet', defaultWidth: 860, defaultHeight: 580,
  keywords: ['ai', 'terminal', 'claude', 'assistant', 'coding', 'chat', 'opencode'],
  description: 'AI-powered coding terminal. Claude Code-style with simulated AI or real Anthropic API.',

  mount(container, args, winId) {
    let sessions = [{ id: 1, label: 'Session 1', history: [], cwd: '/notes' }];
    let activeSession = 0;
    let cmdHistory = [];
    let cmdHistIdx = -1;
    let isThinking = false;
    let apiKey = localStorage.getItem('os_anthropic_key') || '';

    container.innerHTML = `
      <div class="ai-term-app">
        <!-- Session tabs -->
        <div class="ai-term-sessions" id="ai-sessions">
          <div class="ai-session-tab active" data-idx="0">Session 1</div>
          <button class="ai-session-new" id="ai-new-session" title="New Session">+</button>
        </div>

        <!-- Main area -->
        <div class="ai-term-main">
          <!-- Context header -->
          <div class="ai-term-context" id="ai-context">
            <span class="ai-context-icon">📍</span>
            <span id="ai-context-text">No file selected</span>
            <button class="ai-context-btn" id="ai-context-pick">Browse</button>
            ${apiKey ? '<span class="ai-api-badge">🔑 API Connected</span>' : '<span class="ai-api-badge muted">🤖 Simulated</span>'}
          </div>

          <!-- Output area -->
          <div class="ai-term-output" id="ai-output">
            <div class="ai-message ai-message-system">
              <div class="ai-msg-icon">🤖</div>
              <div class="ai-msg-body">
                <div class="ai-msg-header">BrowserOS AI Terminal</div>
                <div class="ai-msg-text">Hello! I'm your AI coding assistant. I can help you explore, explain, and edit your notes and files.<br><br>
                  Try: <code>explain Welcome.md</code> · <code>summarize /notes</code> · <code>find files about knowledge graph</code> · <code>create note My Ideas</code> · <code>help</code>
                </div>
              </div>
            </div>
          </div>

          <!-- Input bar -->
          <div class="ai-term-input-bar">
            <span class="ai-term-prefix">⟩</span>
            <input type="text" class="ai-term-input" id="ai-input"
              placeholder="Ask me anything… (↑↓ history, Ctrl+R search)"
              spellcheck="false" autocomplete="off">
            <button class="ai-term-send" id="ai-send">↵</button>
          </div>
        </div>
      </div>`;

    const output = container.querySelector('#ai-output');
    const input  = container.querySelector('#ai-input');

    // ── Rendering helpers ──────────────────────────────────────
    const appendMsg = (role, html, icon = '') => {
      const div = document.createElement('div');
      div.className = `ai-message ai-message-${role}`;
      div.innerHTML = `
        <div class="ai-msg-icon">${icon || (role === 'user' ? '👤' : role === 'assistant' ? '🤖' : 'ℹ️')}</div>
        <div class="ai-msg-body">
          <div class="ai-msg-header">${role === 'user' ? 'You' : role === 'assistant' ? 'AI Assistant' : 'System'}</div>
          <div class="ai-msg-text">${html}</div>
        </div>`;
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
      return div;
    };

    const appendThinking = () => {
      const div = document.createElement('div');
      div.className = 'ai-message ai-message-assistant ai-thinking';
      div.innerHTML = `
        <div class="ai-msg-icon">🤖</div>
        <div class="ai-msg-body">
          <div class="ai-msg-header">AI Assistant</div>
          <div class="ai-msg-text ai-spinner-text">
            <span class="ai-spinner">●</span> Thinking…
          </div>
        </div>`;
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
      return div;
    };

    const removeThinking = (el) => { if (el?.parentNode) el.remove(); };

    const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const code = (s) => `<code class="ai-code">${esc(s)}</code>`;
    const pre  = (s) => `<pre class="ai-pre">${esc(s)}</pre>`;

    // ── Context file ───────────────────────────────────────────
    let contextFile = null;
    container.querySelector('#ai-context-pick').addEventListener('click', async () => {
      const files = await FS.getAllFiles().catch(() => []);
      const md = files.filter(f => f.name.endsWith('.md'));
      if (!md.length) { alert('No markdown files found.'); return; }
      const names = md.map((f, i) => `${i + 1}. ${f.path}`).join('\n');
      const choice = prompt('Select file for context:\n' + names);
      const idx = parseInt(choice) - 1;
      if (!isNaN(idx) && md[idx]) {
        contextFile = md[idx];
        container.querySelector('#ai-context-text').textContent = contextFile.path;
      }
    });

    // ── Command Parser & Simulated AI ─────────────────────────
    const resolveFile = async (name) => {
      if (!name) return contextFile || null;
      const files = await FS.getAllFiles().catch(() => []);
      const lower = name.toLowerCase().replace(/\.md$/i, '');
      return files.find(f =>
        f.name.toLowerCase().replace(/\.md$/i, '') === lower ||
        f.path.toLowerCase() === name.toLowerCase()
      ) || null;
    };

    const simulateResponse = async (userInput) => {
      const input_lower = userInput.toLowerCase().trim();
      const allFiles = await FS.getAllFiles().catch(() => []);
      const mdFiles = allFiles.filter(f => f.name.endsWith('.md'));

      // ── explain <file> ──────────────────────────────────────
      if (/^explain\s+(.+)/i.test(userInput)) {
        const name = userInput.match(/^explain\s+(.+)/i)[1].trim();
        const file = await resolveFile(name);
        if (!file) return `I couldn't find a file called ${code(name)}. Try listing files with ${code('list files')}.`;

        const words = (file.content || '').split(/\s+/).filter(Boolean).length;
        const headings = [...(file.content || '').matchAll(/^#+\s+(.+)/mg)].map(m => m[1]);
        const wikilinks = [...(file.content || '').matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);

        return `📄 <strong>${file.name}</strong><br><br>
          <strong>Overview:</strong> This file is located at ${code(file.path)} and contains <strong>${words} words</strong>.<br><br>
          ${headings.length ? `<strong>Headings:</strong><br>${headings.map(h => `• ${h}`).join('<br>')}<br><br>` : ''}
          ${wikilinks.length ? `<strong>Links to:</strong> ${wikilinks.map(w => code(w)).join(', ')}<br><br>` : ''}
          <strong>Tags:</strong> ${(file.tags || []).length ? file.tags.map(t => `#${t}`).join(', ') : 'none'}<br><br>
          <strong>Last modified:</strong> ${file.modified ? new Date(file.modified).toLocaleString() : 'unknown'}`;
      }

      // ── summarize <folder> ──────────────────────────────────
      if (/^summarize/i.test(userInput)) {
        if (!mdFiles.length) return 'No markdown files found in the filesystem.';
        return `📁 <strong>File Summary</strong> (${mdFiles.length} notes)<br><br>` +
          mdFiles.map(f => {
            const firstLine = (f.content || '').split('\n').find(l => l.trim() && !l.startsWith('#')) || '(no preview)';
            return `• ${code(f.name)} — ${esc(firstLine.slice(0, 60))}${firstLine.length > 60 ? '…' : ''}`;
          }).join('<br>');
      }

      // ── find files about <topic> ────────────────────────────
      if (/^find\s+files?\s+(about|related\s+to|on|with)\s+(.+)/i.test(userInput)) {
        const topic = userInput.match(/^find\s+files?\s+(?:about|related\s+to|on|with)\s+(.+)/i)[1].trim();
        const results = await FS.search(topic).catch(() => []);
        if (!results.length) return `No files found about ${code(topic)}.`;
        return `🔍 Found <strong>${results.length}</strong> files related to ${code(topic)}:<br><br>` +
          results.map(f => `• <strong>${f.name}</strong> — ${code(f.path)}`).join('<br>');
      }

      // ── create note <title> ─────────────────────────────────
      if (/^create\s+note\s+(.+)/i.test(userInput)) {
        const title = userInput.match(/^create\s+note\s+(.+)/i)[1].trim();
        const path = '/notes/' + title + '.md';
        const content = `# ${title}\n\n*Created by AI Terminal on ${new Date().toLocaleDateString()}*\n\n## Overview\n\nAdd your content here.\n\n## Notes\n\n- \n\n## References\n\n`;
        await FS.writeFile(path, content);
        contextFile = { path, name: title + '.md', content };
        container.querySelector('#ai-context-text').textContent = path;
        return `✅ Created ${code(title + '.md')} at ${code(path)}<br><br>The file is now set as your context. Open it in the editor with: ${code('open ' + title + '.md')}`;
      }

      // ── add to <file>: <content> ────────────────────────────
      if (/^add\s+to\s+(.+?):\s*(.+)/i.test(userInput)) {
        const m = userInput.match(/^add\s+to\s+(.+?):\s*(.+)/i);
        const file = await resolveFile(m[1].trim());
        if (!file) return `File not found: ${code(m[1])}`;
        const addition = '\n' + m[2].trim();
        await FS.writeFile(file.path, (file.content || '') + addition);
        return `✅ Appended to ${code(file.name)}:<br>${pre(addition.trim())}`;
      }

      // ── link <file1> to <file2> ─────────────────────────────
      if (/^link\s+(.+?)\s+to\s+(.+)/i.test(userInput)) {
        const m = userInput.match(/^link\s+(.+?)\s+to\s+(.+)/i);
        const file1 = await resolveFile(m[1].trim());
        const targetName = m[2].trim().replace(/\.md$/i, '');
        if (!file1) return `File not found: ${code(m[1])}`;
        const newContent = (file1.content || '') + `\n\nSee also: [[${targetName}]]`;
        await FS.writeFile(file1.path, newContent);
        return `✅ Added wikilink in ${code(file1.name)}: ${code('[[' + targetName + ']]')}`;
      }

      // ── open / edit <file> ──────────────────────────────────
      if (/^(open|edit)\s+(.+)/i.test(userInput)) {
        const name = userInput.match(/^(?:open|edit)\s+(.+)/i)[1].trim();
        const file = await resolveFile(name);
        if (!file) return `File not found: ${code(name)}`;
        EventBus.emit('file:open-editor', { path: file.path });
        return `📝 Opening ${code(file.name)} in the editor…`;
      }

      // ── list files ─────────────────────────────────────────
      if (/^list\s+files?/i.test(userInput)) {
        if (!mdFiles.length) return 'No markdown files found.';
        return `📄 <strong>${mdFiles.length} files:</strong><br><br>` +
          mdFiles.map(f => `• ${code(f.path)}`).join('<br>');
      }

      // ── show graph ──────────────────────────────────────────
      if (/^show\s+graph/i.test(userInput) || /^graph/i.test(userInput)) {
        EventBus.emit('window:open', { appId: 'graph' });
        return '🕸️ Opening Knowledge Graph…';
      }

      // ── show wiki ───────────────────────────────────────────
      if (/^show\s+wiki|^wiki/i.test(userInput)) {
        EventBus.emit('window:open', { appId: 'wiki' });
        return '📖 Opening Wiki…';
      }

      // ── count / stats ───────────────────────────────────────
      if (/^(stats|count|info)/i.test(userInput)) {
        const totalWords = mdFiles.reduce((acc, f) => acc + (f.content || '').split(/\s+/).filter(Boolean).length, 0);
        const allLinks = mdFiles.reduce((acc, f) => acc + [...(f.content || '').matchAll(/\[\[([^\]]+)\]\]/g)].length, 0);
        return `📊 <strong>Workspace Statistics</strong><br><br>
          • Total files: <strong>${mdFiles.length}</strong><br>
          • Total words: <strong>${totalWords.toLocaleString()}</strong><br>
          • Total wikilinks: <strong>${allLinks}</strong><br>
          • Avg words/file: <strong>${mdFiles.length ? Math.round(totalWords / mdFiles.length) : 0}</strong>`;
      }

      // ── clear ───────────────────────────────────────────────
      if (/^clear/i.test(userInput)) {
        output.innerHTML = '';
        sessions[activeSession].history = [];
        return null; // No response needed
      }

      // ── new session ─────────────────────────────────────────
      if (/^\/new\s*session/i.test(userInput)) {
        addSession();
        return null;
      }

      // ── help ────────────────────────────────────────────────
      if (/^help$/i.test(userInput)) {
        return `🤖 <strong>Available Commands</strong><br><br>
          <strong>File Operations:</strong><br>
          ${code('explain <file>')} — Analyze a file in depth<br>
          ${code('summarize')} — List all files with previews<br>
          ${code('list files')} — Show all markdown files<br>
          ${code('create note <title>')} — Create a new note<br>
          ${code('add to <file>: <text>')} — Append text to a file<br>
          ${code('link <file1> to <file2>')} — Add wikilink between files<br>
          ${code('open <file>')} — Open file in editor<br><br>
          <strong>Discovery:</strong><br>
          ${code('find files about <topic>')} — Search across all notes<br>
          ${code('stats')} — Show workspace statistics<br><br>
          <strong>Navigation:</strong><br>
          ${code('show graph')} — Open Knowledge Graph<br>
          ${code('show wiki')} — Open Wiki viewer<br>
          ${code('clear')} — Clear the terminal<br>
          ${code('/new session')} — Start a new session<br><br>
          <strong>Keyboard:</strong><br>
          ↑↓ Navigate history · Ctrl+L Clear · Ctrl+C Cancel`;
      }

      // ── Fallback: general question ──────────────────────────
      const greetings = ['hello','hi','hey','howdy'];
      if (greetings.some(g => input_lower === g)) {
        return `Hello! 👋 I'm your AI assistant for BrowserOS. I can help you explore and manage your knowledge base.<br>
          Type ${code('help')} to see what I can do.`;
      }

      // Generic smart fallback
      const keywords = input_lower.split(/\s+/);
      const relevantFile = mdFiles.find(f =>
        keywords.some(k => k.length > 3 && f.name.toLowerCase().includes(k))
      );
      if (relevantFile) {
        return `I found a relevant file: ${code(relevantFile.name)}<br><br>
          Try: ${code('explain ' + relevantFile.name.replace('.md', ''))} to get a detailed analysis, or
          ${code('open ' + relevantFile.name.replace('.md', ''))} to edit it.`;
      }

      return `I'm not sure how to help with that. Type ${code('help')} to see available commands, or try being more specific.<br><br>
        For example: ${code('find files about ' + (keywords[keywords.length - 1] || 'notes'))}`;
    };

    // ── Real API call (if key available) ──────────────────────
    const callRealAPI = async (userInput, fileContext) => {
      const messages = [
        {
          role: 'user',
          content: fileContext
            ? `You are helping with a browser-based OS file system. Current file context:\n\nFile: ${fileContext.path}\n\nContent:\n${(fileContext.content || '').slice(0, 3000)}\n\nUser request: ${userInput}`
            : `You are an AI assistant for BrowserOS, a browser-based OS with markdown files and a knowledge graph. Help the user with: ${userInput}`
        }
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      return data.content[0]?.text || '(empty response)';
    };

    // ── Handle input ───────────────────────────────────────────
    const handleInput = async () => {
      const cmd = input.value.trim();
      if (!cmd || isThinking) return;

      input.value = '';
      cmdHistory.unshift(cmd);
      cmdHistIdx = -1;
      sessions[activeSession].history.push({ role: 'user', text: cmd });

      appendMsg('user', esc(cmd));
      isThinking = true;
      const thinkEl = appendThinking();

      // Small delay to simulate thinking
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));

      try {
        let responseHtml;

        if (apiKey) {
          // Try real API first
          try {
            const text = await callRealAPI(cmd, contextFile);
            // Convert markdown-ish to HTML (simple)
            responseHtml = esc(text)
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/`(.+?)`/g, '<code class="ai-code">$1</code>')
              .replace(/\n\n/g, '<br><br>')
              .replace(/\n/g, '<br>');
          } catch (apiErr) {
            console.warn('API call failed, falling back to simulation:', apiErr);
            responseHtml = await simulateResponse(cmd);
            if (responseHtml !== null) {
              responseHtml = `⚠️ <em>API error: ${esc(apiErr.message)}</em><br><br>` + responseHtml;
            }
          }
        } else {
          responseHtml = await simulateResponse(cmd);
        }

        removeThinking(thinkEl);
        if (responseHtml !== null) {
          appendMsg('assistant', responseHtml);
          sessions[activeSession].history.push({ role: 'assistant', text: responseHtml });
        }
      } catch (err) {
        removeThinking(thinkEl);
        appendMsg('system', `❌ Error: ${esc(err.message)}`, '❌');
      }

      isThinking = false;
    };

    container.querySelector('#ai-send').addEventListener('click', handleInput);
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); await handleInput(); }
      if (e.key === 'ArrowUp') {
        cmdHistIdx = Math.min(cmdHistIdx + 1, cmdHistory.length - 1);
        input.value = cmdHistory[cmdHistIdx] || '';
        e.preventDefault();
      }
      if (e.key === 'ArrowDown') {
        cmdHistIdx = Math.max(cmdHistIdx - 1, -1);
        input.value = cmdHistIdx >= 0 ? cmdHistory[cmdHistIdx] : '';
        e.preventDefault();
      }
      if (e.key === 'l' && e.ctrlKey) {
        output.innerHTML = '';
        e.preventDefault();
      }
      if (e.key === 'c' && e.ctrlKey && isThinking) {
        isThinking = false;
        output.querySelectorAll('.ai-thinking').forEach(el => el.remove());
        e.preventDefault();
      }
    });

    // ── Sessions ───────────────────────────────────────────────
    const addSession = () => {
      const id = sessions.length + 1;
      sessions.push({ id, label: `Session ${id}`, history: [], cwd: '/notes' });
      activeSession = sessions.length - 1;
      renderSessions();
      output.innerHTML = '';
      appendMsg('system', `Started ${code('Session ' + id)}. Type ${code('help')} to get started.`, 'ℹ️');
    };

    const renderSessions = () => {
      const bar = container.querySelector('#ai-sessions');
      bar.innerHTML = sessions.map((s, i) => `
        <div class="ai-session-tab ${i === activeSession ? 'active' : ''}" data-idx="${i}">${s.label}</div>`).join('') +
        '<button class="ai-session-new" id="ai-new-session" title="New Session">+</button>';

      bar.querySelectorAll('.ai-session-tab').forEach(el => {
        el.addEventListener('click', () => {
          activeSession = parseInt(el.dataset.idx);
          renderSessions();
          output.innerHTML = '';
          sessions[activeSession].history.forEach(msg => appendMsg(msg.role, msg.text));
        });
      });
      bar.querySelector('#ai-new-session').addEventListener('click', addSession);
    };

    container.querySelector('#ai-new-session').addEventListener('click', addSession);

    // ── Listen for API key changes from Settings ───────────────
    const onApiKey = ({ key }) => {
      apiKey = key;
      const badge = container.querySelector('.ai-api-badge');
      if (badge) badge.innerHTML = key
        ? '🔑 API Connected'
        : '<span class="muted">🤖 Simulated</span>';
    };
    EventBus.on('settings:apikey', onApiKey);

    // Focus input
    setTimeout(() => input.focus(), 100);
  }
};
