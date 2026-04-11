---
title: Getting Started
tags: [guide, tutorial, beginner]
created: 2026-04-10
---

# Getting Started with BrowserOS

## Your First Steps

### 1. Open the File Manager

Double-click the **File Manager** icon on the desktop. You'll see your notes organized in folders. All files are stored in your browser's IndexedDB — nothing is sent to any server.

### 2. Create a New Note

In the [[File Manager]], click **New File** or open the [[Terminal]] and type:

```bash
touch /notes/my-first-note.md
edit /notes/my-first-note.md
```

### 3. Write with Wikilinks

In the [[Markdown Editor]], use `[[double brackets]]` to link to other notes:

```markdown
This connects to [[Welcome]] and [[Knowledge Graph]].
```

These links appear in the [[Knowledge Graph]] as edges between nodes.

### 4. Explore the Knowledge Graph

Open the **Knowledge Graph** app to see a visual map of how your notes interconnect. Click any node to open that note.

### 5. Use the Terminal

The [[Terminal]] gives you shell-like commands over your virtual file system:

```bash
ls /notes
cat "Welcome.md"
mkdir /projects
```

See [[Terminal Commands]] for the full list.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command Palette |
| `Ctrl+W` | Close active window |
| `Ctrl+Tab` | Cycle windows |
| `Super+1` | Workspace 1 |
| `Super+2` | Workspace 2 |
| `Super+3` | Workspace 3 |
| `F11` | Fullscreen window |
| `?` | Show all shortcuts |

## Related Notes

- [[Welcome to BrowserOS]]
- [[Terminal Commands]]
- [[Knowledge Graph]]
- [[Architecture Overview]]
