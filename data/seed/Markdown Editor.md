---
title: Markdown Editor
tags: [editor, markdown, wikilinks, writing]
created: 2026-04-10
---

# Markdown Editor

The Markdown Editor provides a split-pane writing experience with live preview.

## Interface

```
┌─────────────────────┬─────────────────────┐
│  Editor (left)      │  Live Preview (right)│
│                     │                      │
│  # My Note          │  My Note             │
│                     │  ─────────           │
│  [[Wikilink]]       │  Wikilink  ←clickable│
│                     │                      │
│  ```js              │  ┌──────────────┐    │
│  console.log('hi')  │  │ console.log  │    │
│  ```                │  └──────────────┘    │
└─────────────────────┴─────────────────────┘
```

## Wikilinks

Type `[[Note Name]]` to create a link to another note. In the preview, clicking a wikilink opens that note in the [[Wiki]] viewer.

The [[Knowledge Graph]] automatically picks up these links to build the visual graph.

## Supported Markdown

- **Bold**, *italic*, ~~strikethrough~~
- `inline code` and fenced code blocks with syntax highlighting
- Tables, blockquotes, task lists `- [ ] item`
- YAML frontmatter (`---` blocks) for tags and metadata
- Headings H1-H6
- Images: `![alt](url)`
- Links: `[text](url)` and `[[wikilinks]]`

## Toolbar

| Button | Action |
|--------|--------|
| **B** | Bold selected text |
| *I* | Italic |
| `</>` | Code block |
| `[[]]` | Insert wikilink |
| 📊 | Insert table |
| 👁 | Toggle preview-only mode |

## Auto-save

Changes are automatically saved after **500ms of inactivity**. The title bar shows a dot `●` when there are unsaved changes.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+S` | Save now |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+K` | Insert link |
| `Ctrl+Shift+V` | Toggle preview |

## Related

- [[Knowledge Graph]]
- [[Wiki]]
- [[Getting Started]]
- [[Terminal Commands]]
