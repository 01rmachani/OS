---
title: Knowledge Graph
tags: [graph, wikilinks, visualization, obsidian]
created: 2026-04-10
---

# Knowledge Graph

The **Knowledge Graph** is one of BrowserOS's most powerful features. It visualizes the connections between your notes as an interactive force-directed graph.

## How Links Work

When you write `[[Note Name]]` anywhere in a note, a directional link is created from that note to the referenced note. These links become **edges** in the graph.

### Example

If `Getting Started.md` contains `[[Terminal Commands]]`, the graph shows an arrow from "Getting Started" to "Terminal Commands".

## Graph Features

### Navigation
- **Scroll** to zoom in/out
- **Click + drag** the background to pan
- **Click a node** to open that note

### Visual Encoding
- **Node size** — proportional to the number of incoming links (more links = bigger)
- **Node color** — determined by folder (each folder gets a distinct color)
- **Edge opacity** — stronger connections shown more prominently
- **Orphan nodes** — files with no links shown with a dashed border

### Controls (Sidebar)
- **Filter by tag** — show only nodes with specific tags
- **Search** — highlight matching nodes
- **Orphans toggle** — show/hide unlinked files
- **Physics controls** — adjust force simulation parameters

## Building a Good Knowledge Base

The most valuable knowledge graphs emerge from natural note-taking habits:

1. Write notes about concepts, projects, and ideas
2. Link related concepts with `[[wikilinks]]`
3. Let the graph reveal unexpected connections
4. Use **backlinks** in the [[Wiki]] to see what points to any given note

## Related

- [[Welcome to BrowserOS]]
- [[Getting Started]]
- [[Markdown Editor]]
- [[Wiki]]
- [[Architecture Overview]]
