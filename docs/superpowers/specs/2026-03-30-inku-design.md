# Inku — Design Spec

**The cleanest markdown editor.** A sharp, modern, Electron-based markdown editor with inline rendering, powerful file management, and a pluggable architecture.

## Branding

- **Name:** Inku (インク — Japanese for "ink")
- **Personality:** Sharp, modern, cute. Dark-mode native.
- **Logo direction:** Happy ink drop character or brush stroke forming an "I"

## Core Concept

Single-pane inline-rendering markdown editor (Obsidian-style). No split view — markdown renders in place as you type. When the cursor is on a line, raw syntax is shown; when it moves away, the line renders visually.

Platform: Electron (macOS first), later ported to web. The architecture is designed for this — the renderer process never touches Node APIs.

## Architecture

```
Electron Main Process
├── File Watcher (chokidar) — watches roots, syncs to DB
├── SQLite DB (better-sqlite3)
│   ├── file_index — path, root_id, title, frontmatter, modified_at
│   ├── tags — tag name, file associations
│   └── fts5 — full-text search index of file content
├── Plugin Loader — loads/validates plugin manifests
└── IPC Handlers — typed channels to renderer

IPC Bridge (typed TypeScript channels)

Electron Renderer Process
├── React 18 + Zustand
├── Sidebar (file tree, tags, search)
├── Editor (CodeMirror 6 + inline render decorations)
├── Tabs + Breadcrumbs
├── Status Bar
└── Theme Engine (CSS custom properties from JSON tokens)
```

**Key architectural decisions:**
- Main process owns all file I/O, DB access, and indexing. Renderer is pure UI.
- All IPC channels are typed in a shared `ipc-types.ts` — no stringly-typed messages.
- Renderer is web-compatible by design. Web port swaps main process for a backend API; renderer stays identical.
- SQLite for metadata, tags, and full-text search. Scales to thousands of files with instant results.

## File Management

### Multi-root

- Open any number of folders as "roots." Each appears as a top-level item in the sidebar.
- Roots persisted in SQLite `roots` table across sessions.
- Adding a root triggers a full recursive index of all `.md` files in the tree.
- No "workspace" config files. No `.inku` folders in the user's directories. Just folders.

### Sidebar

```
┌─────────────────────────┐
│ 🔍 Search...        ⌘P  │
├─────────────────────────┤
│ ☰ Filters: #tag ▾      │
├─────────────────────────┤
│ ▼ ~/Projects/blog       │
│   ▶ drafts/             │
│   ▶ published/          │
│     getting-started.md  │
│ ▼ ~/notes               │
│     todo.md             │
│     ideas.md            │
├─────────────────────────┤
│ 🏷 Tags                 │
│   recipes (4)           │
│   work (12)             │
│   journal (28)          │
└─────────────────────────┘
```

### Search

- Search bar always visible at top of sidebar.
- `Cmd+P` — quick file open (fuzzy match on filename).
- `Cmd+Shift+F` — full-text content search across all indexed files.
- Powered by SQLite FTS5. Instant results with highlighted matches.
- Composable filters: search within a tag, within a root, or across everything.

### Tags

- Sourced from two places:
  1. YAML frontmatter (`tags: [work, draft]`)
  2. Inline hashtags (`#work`)
- Both parsed during file indexing.
- Tag panel in sidebar shows all tags with file counts.
- Click a tag to filter the file tree.
- Editing tags in the editor updates the DB in real-time.

### File Operations

- Create, rename, delete, move files/folders via sidebar context menu.
- Drag and drop to move files between folders.
- `Cmd+N` — new file in currently selected folder.

## Editor

### Inline Rendering

CodeMirror 6 with custom view decorations. Per-line behavior:

| Syntax | Cursor on line | Cursor elsewhere |
|--------|---------------|-----------------|
| `# Heading` | Raw `# Heading` text | Rendered large/bold heading |
| `**bold**` | Shows asterisks | **bold** (asterisks hidden) |
| `[link](url)` | Shows full syntax | Clickable link (syntax hidden) |
| `` `code` `` | Shows backticks | Styled inline code |
| `![img](url)` | Shows syntax | Rendered image inline |
| Code blocks | Editable with syntax | Syntax-highlighted with language label |
| Tables | Raw pipe syntax | Rendered table |
| Math (`$$`) | Raw LaTeX | Rendered via KaTeX |
| `- [ ]` | Shows brackets | Clickable checkbox |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B` | Bold |
| `Cmd+I` | Italic |
| `Cmd+K` | Insert link |
| `Cmd+P` | Quick file open |
| `Cmd+Shift+F` | Global search |
| `Cmd+\` | Toggle sidebar |
| `Cmd+,` | Settings |
| `Cmd+N` | New file |
| `Cmd+Shift+P` | Command palette |

Vim mode available as a setting (CodeMirror vim extension).

### Editor Features

- **Tabs** — open multiple files, tab bar at top.
- **Breadcrumbs** — path below tabs showing `root / folder / file.md`.
- **Status bar** — line/col, word count, reading time.
- **Auto-save** — debounced 300ms after each keystroke.
- **Undo/redo** — per-file history, survives tab switches.
- **Image drag-and-drop** — copies to relative `assets/` folder, inserts markdown reference.

### Markdown Support

Full spec coverage via pluggable parser pipeline:

- **Baseline:** CommonMark
- **Extended:** GitHub Flavored Markdown (tables, strikethrough, autolinks, task lists)
- **Plugins (all built-in, toggleable):**
  - Footnotes
  - Math / KaTeX
  - Mermaid diagrams
  - Definition lists
  - Abbreviations
  - Mark/highlight (`==text==`)
  - Subscript / superscript
  - Table of contents generation
  - Emoji shortcodes
  - Syntax highlighting (100+ languages)

## Plugin System

Plugins are self-contained directories with a manifest and entry point.

### Plugin structure

```
~/.inku/plugins/
  my-plugin/
    manifest.json
    index.js
```

### Manifest

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Adds custom syntax support",
  "type": "markdown-extension",
  "hooks": {
    "remarkPlugin": true,
    "codemirrorExtension": true
  }
}
```

### Plugin API

Each plugin exports a module conforming to the `InkuPlugin` interface:
- **`remarkPlugin`** — a unified/remark plugin that extends the markdown AST (e.g., adds a new node type for `mermaid` fenced blocks, or parses `==highlight==` syntax).
- **`renderer`** — a React component that renders custom AST nodes into the inline preview.
- **`codemirrorExtension`** (optional) — a CodeMirror 6 `Extension` for syntax highlighting or inline decorations of the custom syntax in the editor.

### Built-in plugins

All ship with Inku, enabled by default, can be toggled off in settings:
GFM, Footnotes, Math/KaTeX, Mermaid, Syntax highlighting, Definition lists, Abbreviations, Mark/highlight, Sub/superscript, Table of contents, Emoji shortcodes.

### Community plugins

Drop a plugin folder into `~/.inku/plugins/`. No package manager for v1 — manual install. Settings UI shows all detected plugins with enable/disable toggles.

## Theme System

Themes are small JSON files that define color tokens. No CSS, no layout — just colors.

### Theme file

```json
{
  "name": "Inku Dark",
  "author": "inku",
  "colors": {
    "bg-primary": "#0a0a0b",
    "bg-secondary": "#111113",
    "bg-surface": "#1a1a1e",
    "border": "#1e1e22",
    "text-primary": "#e0e0e2",
    "text-secondary": "#8a8a90",
    "text-muted": "#4a4a4f",
    "accent": "#c4b5fd",
    "accent-strong": "#7c3aed",
    "accent-muted": "#1a1a2e",
    "success": "#86efac",
    "warning": "#fcd34d",
    "error": "#fca5a5"
  }
}
```

### How it works

- Tokens mapped to CSS custom properties at runtime (`--color-bg-primary`, etc.).
- All UI components reference custom properties — never hardcoded colors.
- Theme files live in `~/.inku/themes/`. Built-in: Inku Dark, Inku Light.
- Settings UI has a theme picker with live preview.

## Design Language

### Visual identity

- **Style:** Sharp & modern. Linear/Raycast energy. High contrast, tight spacing, crisp edges.
- **Accent color:** Violet (`#c4b5fd` dark / `#7c3aed` light) — distinctive, pairs with "ink" theme.
- **Surfaces:** Differentiated by shade, not elevation. No shadows. Subtle 1px borders.
- **Spacing:** 4px base grid. Tight but breathable.
- **Border radius:** 4-6px on interactive elements. Nothing rounded/bubbly.

### Typography

- **UI:** Inter — tight, geometric, modern.
- **Editor (monospace):** JetBrains Mono or Berkeley Mono.
- **Rendered markdown body:** Inter.
- **Rendered code blocks:** Same monospace font as editor.

### Dark mode is primary

Dark mode is the default, first-class experience. Light mode is fully supported but dark mode gets the most attention.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron (latest) |
| UI | React 18 |
| Language | TypeScript (everything) |
| State | Zustand |
| Editor | CodeMirror 6 |
| Database | better-sqlite3 |
| File watching | chokidar |
| Markdown parsing | unified / remark (pluggable pipeline) |
| Bundler | Vite |
| Packaging | electron-builder |

## Project Structure

```
inku/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # App entry, window management
│   │   ├── ipc/               # IPC handlers (typed channels)
│   │   ├── db/                # SQLite schema, queries, migrations
│   │   ├── watcher/           # Chokidar file watcher + DB sync
│   │   └── plugins/           # Plugin loader (main-side)
│   ├── renderer/              # Electron renderer (React app)
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── sidebar/       # File tree, tags, search
│   │   │   ├── editor/        # CodeMirror wrapper, inline renderers
│   │   │   ├── tabs/          # Tab bar
│   │   │   └── statusbar/     # Word count, cursor pos
│   │   ├── stores/            # Zustand stores
│   │   ├── hooks/             # React hooks (useIPC, useTheme, etc.)
│   │   └── themes/            # Theme loader, CSS variable injection
│   ├── shared/                # Types shared between main & renderer
│   │   ├── ipc-types.ts       # Typed IPC channel definitions
│   │   └── models.ts          # File, Tag, Root types
│   └── plugins/               # Built-in plugins
│       ├── gfm/
│       ├── math/
│       ├── mermaid/
│       ├── footnotes/
│       └── ...
├── resources/                 # App icon, assets
├── themes/                    # Built-in theme files
│   ├── inku-dark.json
│   └── inku-light.json
├── electron-builder.yml
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## IPC Contract

```typescript
type IpcChannels = {
  // File system
  'fs:list-roots': () => Root[]
  'fs:add-root': (path: string) => Root
  'fs:remove-root': (rootId: string) => void
  'fs:read-file': (path: string) => string
  'fs:write-file': (path: string, content: string) => void
  'fs:create-file': (rootId: string, relativePath: string) => FileEntry
  'fs:delete-file': (path: string) => void
  'fs:move-file': (from: string, to: string) => void
  'fs:list-tree': (rootId: string) => TreeNode[]

  // Search
  'search:files': (query: string) => FileEntry[]
  'search:content': (query: string, opts?: SearchOpts) => SearchResult[]

  // Tags
  'tags:list': () => Tag[]
  'tags:files-by-tag': (tag: string) => FileEntry[]

  // Plugins
  'plugins:list': () => PluginManifest[]
  'plugins:toggle': (id: string, enabled: boolean) => void

  // Themes
  'themes:list': () => ThemeManifest[]
  'themes:set': (id: string) => void

  // Events (main → renderer)
  'watch:file-changed': (event: FileChangeEvent) => void
  'watch:file-created': (event: FileChangeEvent) => void
  'watch:file-deleted': (event: FileChangeEvent) => void
}
```

## Web Port Strategy

The renderer never imports from `electron` or Node APIs directly. All system access goes through the IPC bridge. To port to web:

1. Replace Electron main process with a backend API (Express/Fastify or edge runtime).
2. Replace IPC bridge with HTTP/WebSocket client.
3. Renderer stays identical.
4. SQLite runs in browser via sql.js (WASM) for offline mode, or server-side for multi-device sync.
