<p align="center">
  <img src="resources/banner.svg" alt="Inku" width="600" />
</p>

<p align="center">
  <strong>A sharp, modern markdown editor with inline rendering.</strong>
  <br />
  <sub>Built with Electron, CodeMirror 6, React, and SQLite.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/electron-33-purple?style=flat-square" />
</p>

---

## What is Inku?

**Inku** (インク, "ink") is a markdown editor that renders your writing inline as you type — no split panes, no preview toggle. When the cursor is on a line, you see raw markdown. Move away, and it renders beautifully in place.

Sharp design. Violet accents on dark surfaces. Tight spacing. No clutter.

## Features

**Editor**
- Single-pane inline rendering (headings, bold, italic, code, links, images, tables, checkboxes)
- Clickable checkboxes that toggle in the source
- Fenced code blocks with syntax highlighting and language labels
- Auto-save (300ms debounce)
- Keyboard-first: `Cmd+B` bold, `Cmd+I` italic, `Cmd+K` link

**File Management**
- Open multiple folders as roots — no vault lock-in, just your filesystem
- Recursive file tree with expand/collapse
- Full-text search powered by SQLite FTS5
- Tag system: YAML frontmatter + inline `#hashtags`
- Quick file open with `Cmd+P`

**Design**
- Dark-first, sharp & modern (Inku Dark + Inku Light included)
- Themeable via small JSON files — just color tokens, no CSS
- Clean typography — geometric sans for UI, monospace for code
- 4px grid, subtle borders, no shadows

**Extensible**
- Built-in plugins: GFM, Math/KaTeX, Mermaid, Footnotes
- Plugin architecture: drop a folder in `~/.inku/plugins/`
- Community themes: drop a JSON file in `~/.inku/themes/`

## Quick Start

```bash
git clone https://github.com/Piryus/inku.git
cd inku
npm install
npx electron-rebuild -f -w better-sqlite3
npm run build:main
```

Then, in two terminals:

```bash
# Terminal 1 — Vite dev server
npm run dev

# Terminal 2 — Electron
NODE_ENV=development npx electron .
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+P` | Quick file open |
| `Cmd+Shift+P` | Command palette |
| `Cmd+\` | Toggle sidebar |
| `Cmd+,` | Settings |
| `Cmd+N` | New file |
| `Cmd+B` | Bold |
| `Cmd+I` | Italic |
| `Cmd+K` | Insert link |
| `Cmd+S` | Save |

## Architecture

```
Electron Main Process
├── SQLite (better-sqlite3) — file index, tags, FTS5 search
├── File Watcher (chokidar) — watches roots, syncs to DB
├── Plugin Loader — discovers and validates plugins
└── Typed IPC Handlers

Electron Renderer Process (web-portable)
├── React 18 + Zustand
├── CodeMirror 6 — inline markdown rendering
├── Theme Engine — CSS custom properties from JSON tokens
└── Sidebar, Tabs, Command Palette, Settings
```

The renderer never touches Node APIs. All system access goes through typed IPC channels, making the web port straightforward.

## Themes

Themes are small JSON files with color tokens:

```json
{
  "name": "My Theme",
  "author": "you",
  "colors": {
    "bg-primary": "#0a0a0b",
    "bg-secondary": "#111113",
    "accent": "#c4b5fd",
    ...
  }
}
```

Drop it in `~/.inku/themes/` and select it in Settings.

## Plugins

Built-in plugins ship enabled by default. Toggle them in Settings.

| Plugin | What it does |
|--------|-------------|
| GFM | Tables, strikethrough, autolinks, task lists |
| Math | LaTeX rendering via KaTeX |
| Mermaid | Diagrams from fenced code blocks |
| Footnotes | Footnote references and definitions |

Community plugins go in `~/.inku/plugins/`. Each plugin is a folder with a `manifest.json` and `index.js`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron |
| UI | React 18, Zustand |
| Editor | CodeMirror 6 |
| Database | SQLite (better-sqlite3) |
| File watching | chokidar |
| Bundler | Vite |
| Language | TypeScript |

## Roadmap

- [ ] Web version (renderer is already web-portable)
- [ ] Vim mode
- [ ] Image drag-and-drop
- [ ] Table of contents sidebar
- [ ] Export to PDF / HTML
- [ ] Plugin marketplace

## License

MIT
