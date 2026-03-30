# Inku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Inku, a sharp modern Electron markdown editor with inline rendering, multi-root file management, SQLite-backed search/tags, and a pluggable theme/plugin architecture.

**Architecture:** Electron app with clean IPC split — main process owns file I/O, SQLite DB, and file watching; renderer is a pure React/Zustand UI with CodeMirror 6. All IPC channels are typed. Renderer never touches Node APIs, enabling a future web port.

**Tech Stack:** Electron, React 18, TypeScript, Zustand, CodeMirror 6, better-sqlite3, chokidar, unified/remark, Vite, electron-builder

**Spec:** `docs/superpowers/specs/2026-03-30-inku-design.md`

---

## File Map

### Main Process (`src/main/`)
- `src/main/index.ts` — Electron app entry, window creation, IPC registration
- `src/main/ipc/index.ts` — IPC handler registry, typed invoke/on wrappers
- `src/main/ipc/fs-handlers.ts` — File system IPC handlers (read, write, create, delete, move, roots, tree)
- `src/main/ipc/search-handlers.ts` — Search IPC handlers (file search, content search)
- `src/main/ipc/tag-handlers.ts` — Tag IPC handlers
- `src/main/ipc/plugin-handlers.ts` — Plugin list/toggle IPC handlers
- `src/main/ipc/theme-handlers.ts` — Theme list/set IPC handlers
- `src/main/db/index.ts` — SQLite connection, schema init, migrations
- `src/main/db/schema.sql` — DDL for roots, files, tags, file_tags, fts5
- `src/main/db/queries.ts` — Prepared statement wrappers for all DB operations
- `src/main/watcher/index.ts` — Chokidar watcher, file indexing, DB sync
- `src/main/plugins/loader.ts` — Plugin discovery, manifest validation, enable/disable

### Renderer (`src/renderer/`)
- `src/renderer/index.html` — HTML shell
- `src/renderer/main.tsx` — React entry
- `src/renderer/App.tsx` — Root layout (sidebar + editor + tabs + statusbar)
- `src/renderer/ipc.ts` — Typed IPC client (wraps `window.electronAPI`)
- `src/renderer/stores/files.ts` — Zustand store: roots, tree, selected file
- `src/renderer/stores/editor.ts` — Zustand store: open tabs, active tab, dirty state
- `src/renderer/stores/tags.ts` — Zustand store: tags list, active tag filter
- `src/renderer/stores/search.ts` — Zustand store: search query, results
- `src/renderer/stores/theme.ts` — Zustand store: active theme, tokens
- `src/renderer/stores/plugins.ts` — Zustand store: plugin list, enabled state
- `src/renderer/components/sidebar/Sidebar.tsx` — Sidebar container (search + tree + tags)
- `src/renderer/components/sidebar/SearchBar.tsx` — Search input with Cmd+P / Cmd+Shift+F
- `src/renderer/components/sidebar/FileTree.tsx` — Recursive folder/file tree
- `src/renderer/components/sidebar/FileTreeItem.tsx` — Single tree node (folder or file)
- `src/renderer/components/sidebar/TagPanel.tsx` — Tag list with counts and filter
- `src/renderer/components/sidebar/ContextMenu.tsx` — Right-click menu for file operations
- `src/renderer/components/editor/Editor.tsx` — CodeMirror 6 wrapper
- `src/renderer/components/editor/extensions.ts` — CodeMirror extensions bundle
- `src/renderer/components/editor/inline-render.ts` — Decoration plugin for inline markdown rendering
- `src/renderer/components/editor/keymap.ts` — Custom keybindings
- `src/renderer/components/tabs/TabBar.tsx` — Tab bar with close/reorder
- `src/renderer/components/tabs/Tab.tsx` — Single tab
- `src/renderer/components/statusbar/StatusBar.tsx` — Line/col, word count, reading time
- `src/renderer/components/command-palette/CommandPalette.tsx` — Cmd+Shift+P overlay
- `src/renderer/components/settings/Settings.tsx` — Settings panel (themes, plugins, general)
- `src/renderer/themes/loader.ts` — Load theme JSON, inject CSS custom properties
- `src/renderer/themes/tokens.ts` — Default token definitions, CSS variable mapping
- `src/renderer/styles/global.css` — Base styles using CSS custom properties

### Shared (`src/shared/`)
- `src/shared/ipc-types.ts` — Typed IPC channel definitions
- `src/shared/models.ts` — Root, FileEntry, TreeNode, Tag, SearchResult types
- `src/shared/plugin-types.ts` — PluginManifest, InkuPlugin interface
- `src/shared/theme-types.ts` — ThemeManifest, ThemeColors type

### Preload
- `src/preload/index.ts` — contextBridge exposing typed electronAPI

### Built-in Plugins (`src/plugins/`)
- `src/plugins/gfm/index.ts` — GFM remark plugin + CM extension
- `src/plugins/gfm/manifest.json`
- `src/plugins/math/index.ts` — KaTeX remark plugin + CM extension
- `src/plugins/math/manifest.json`
- `src/plugins/mermaid/index.ts` — Mermaid remark plugin + CM extension
- `src/plugins/mermaid/manifest.json`
- `src/plugins/footnotes/index.ts` — Footnotes remark plugin
- `src/plugins/footnotes/manifest.json`

### Config / Build
- `package.json`
- `tsconfig.json`
- `tsconfig.node.json` — For main process / build config
- `vite.config.ts` — Vite config for renderer
- `electron-builder.yml`
- `themes/inku-dark.json`
- `themes/inku-light.json`
- `.gitignore`

### Tests
- `tests/main/db/queries.test.ts`
- `tests/main/watcher/index.test.ts`
- `tests/main/plugins/loader.test.ts`
- `tests/renderer/stores/files.test.ts`
- `tests/renderer/stores/editor.test.ts`
- `tests/renderer/components/sidebar/FileTree.test.tsx`
- `tests/renderer/components/editor/inline-render.test.ts`
- `tests/renderer/themes/loader.test.ts`

---

## Task 1: Project Scaffolding & Electron Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron-builder.yml`
- Create: `.gitignore`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles/global.css`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/emile/Projects/markdown-viewer
```

```json
{
  "name": "inku",
  "version": "0.1.0",
  "description": "The cleanest markdown editor",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "dev:electron": "electron .",
    "build": "tsc && vite build",
    "build:main": "tsc -p tsconfig.node.json",
    "start": "npm run build:main && electron .",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "electron-builder"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.0",
    "better-sqlite3": "^11.0.0",
    "chokidar": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/better-sqlite3": "^7.6.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json (renderer)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@renderer/*": ["src/renderer/*"]
    }
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 3: Create tsconfig.node.json (main process)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist/main",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 5: Create electron-builder.yml**

```yaml
appId: com.inku.app
productName: Inku
directories:
  output: release
mac:
  category: public.app-category.developer-tools
  target:
    - dmg
    - zip
files:
  - dist/**/*
  - node_modules/**/*
  - package.json
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
release/
.superpowers/
*.db
*.db-journal
.DS_Store
```

- [ ] **Step 7: Create src/shared/models.ts**

```typescript
export interface Root {
  id: string
  path: string
  name: string
  addedAt: number
}

export interface FileEntry {
  id: string
  rootId: string
  relativePath: string
  absolutePath: string
  name: string
  title: string | null
  modifiedAt: number
  size: number
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

export interface Tag {
  name: string
  count: number
}

export interface SearchResult {
  file: FileEntry
  matches: SearchMatch[]
}

export interface SearchMatch {
  line: number
  column: number
  text: string
  highlight: [number, number]
}
```

- [ ] **Step 8: Create src/shared/ipc-types.ts**

```typescript
import type { Root, FileEntry, TreeNode, Tag, SearchResult } from './models'
import type { PluginManifest } from './plugin-types'
import type { ThemeManifest } from './theme-types'

export type SearchOpts = {
  rootId?: string
  tag?: string
  maxResults?: number
}

export type FileChangeEvent = {
  type: 'change' | 'add' | 'unlink'
  path: string
  rootId: string
}

export type IpcInvokeChannels = {
  'fs:list-roots': { args: []; result: Root[] }
  'fs:add-root': { args: [path: string]; result: Root }
  'fs:remove-root': { args: [rootId: string]; result: void }
  'fs:read-file': { args: [path: string]; result: string }
  'fs:write-file': { args: [path: string, content: string]; result: void }
  'fs:create-file': { args: [rootId: string, relativePath: string]; result: FileEntry }
  'fs:delete-file': { args: [path: string]; result: void }
  'fs:move-file': { args: [from: string, to: string]; result: void }
  'fs:list-tree': { args: [rootId: string]; result: TreeNode[] }
  'search:files': { args: [query: string]; result: FileEntry[] }
  'search:content': { args: [query: string, opts?: SearchOpts]; result: SearchResult[] }
  'tags:list': { args: []; result: Tag[] }
  'tags:files-by-tag': { args: [tag: string]; result: FileEntry[] }
  'plugins:list': { args: []; result: PluginManifest[] }
  'plugins:toggle': { args: [id: string, enabled: boolean]; result: void }
  'themes:list': { args: []; result: ThemeManifest[] }
  'themes:set': { args: [id: string]; result: void }
}

export type IpcSendChannels = {
  'watch:file-changed': FileChangeEvent
  'watch:file-created': FileChangeEvent
  'watch:file-deleted': FileChangeEvent
}

export type IpcChannel = keyof IpcInvokeChannels
export type IpcSendChannel = keyof IpcSendChannels
```

- [ ] **Step 9: Create src/shared/theme-types.ts**

```typescript
export interface ThemeColors {
  'bg-primary': string
  'bg-secondary': string
  'bg-surface': string
  'border': string
  'text-primary': string
  'text-secondary': string
  'text-muted': string
  'accent': string
  'accent-strong': string
  'accent-muted': string
  'success': string
  'warning': string
  'error': string
}

export interface ThemeManifest {
  id: string
  name: string
  author: string
  colors: ThemeColors
}
```

- [ ] **Step 10: Create src/shared/plugin-types.ts**

```typescript
export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  type: 'markdown-extension'
  builtin: boolean
  enabled: boolean
  hooks: {
    remarkPlugin?: boolean
    codemirrorExtension?: boolean
  }
}
```

- [ ] **Step 11: Create src/preload/index.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { IpcInvokeChannels, IpcSendChannels } from '../shared/ipc-types'

type ChannelName = keyof IpcInvokeChannels
type SendChannelName = keyof IpcSendChannels

const electronAPI = {
  invoke: <C extends ChannelName>(
    channel: C,
    ...args: IpcInvokeChannels[C]['args']
  ): Promise<IpcInvokeChannels[C]['result']> => {
    return ipcRenderer.invoke(channel, ...args)
  },
  on: <C extends SendChannelName>(
    channel: C,
    callback: (data: IpcSendChannels[C]) => void
  ) => {
    const handler = (_event: Electron.IpcRendererEvent, data: IpcSendChannels[C]) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
```

- [ ] **Step 12: Create src/main/index.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
```

- [ ] **Step 13: Create src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inku</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 14: Create src/renderer/styles/global.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --color-bg-primary: #0a0a0b;
  --color-bg-secondary: #111113;
  --color-bg-surface: #1a1a1e;
  --color-border: #1e1e22;
  --color-text-primary: #e0e0e2;
  --color-text-secondary: #8a8a90;
  --color-text-muted: #4a4a4f;
  --color-accent: #c4b5fd;
  --color-accent-strong: #7c3aed;
  --color-accent-muted: #1a1a2e;
  --color-success: #86efac;
  --color-warning: #fcd34d;
  --color-error: #fca5a5;

  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

  --spacing-unit: 4px;
  --radius-sm: 4px;
  --radius-md: 6px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

::selection {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}
```

- [ ] **Step 15: Create src/renderer/main.tsx**

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 16: Create src/renderer/App.tsx**

```tsx
export function App() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      <div style={{
        width: 260,
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        padding: 12,
      }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Inku
        </div>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
      }}>
        Open a folder to get started
      </div>
    </div>
  )
}
```

- [ ] **Step 17: Install dependencies and verify the app launches**

Run:
```bash
cd /Users/emile/Projects/markdown-viewer
npm install
npm run build:main
npm run dev
```

In another terminal:
```bash
cd /Users/emile/Projects/markdown-viewer
npm run dev:electron
```

Expected: Electron window opens showing dark background with "Inku" sidebar label and "Open a folder to get started" in the center.

- [ ] **Step 18: Commit**

```bash
git add -A
git commit -m "feat: scaffold Inku Electron app with Vite, React, TypeScript, and typed IPC"
```

---

## Task 2: SQLite Database & Schema

**Files:**
- Create: `src/main/db/index.ts`
- Create: `src/main/db/schema.sql`
- Create: `src/main/db/queries.ts`
- Create: `tests/main/db/queries.test.ts`

- [ ] **Step 1: Write the failing test for DB initialization**

```typescript
// tests/main/db/queries.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '../../src/main/db/index'
import * as queries from '../../src/main/db/queries'

describe('Database', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initSchema(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('roots', () => {
    it('adds and lists roots', () => {
      const root = queries.addRoot(db, '/Users/test/notes', 'notes')
      expect(root.path).toBe('/Users/test/notes')
      expect(root.name).toBe('notes')

      const roots = queries.listRoots(db)
      expect(roots).toHaveLength(1)
      expect(roots[0].id).toBe(root.id)
    })

    it('removes a root and cascades file deletion', () => {
      const root = queries.addRoot(db, '/Users/test/notes', 'notes')
      queries.upsertFile(db, {
        rootId: root.id,
        relativePath: 'hello.md',
        absolutePath: '/Users/test/notes/hello.md',
        name: 'hello.md',
        title: 'Hello',
        content: 'Hello world',
        modifiedAt: Date.now(),
        size: 11,
      })
      queries.removeRoot(db, root.id)
      expect(queries.listRoots(db)).toHaveLength(0)
      expect(queries.searchFiles(db, 'hello')).toHaveLength(0)
    })
  })

  describe('files', () => {
    it('upserts a file and retrieves it', () => {
      const root = queries.addRoot(db, '/tmp/root', 'root')
      queries.upsertFile(db, {
        rootId: root.id,
        relativePath: 'doc.md',
        absolutePath: '/tmp/root/doc.md',
        name: 'doc.md',
        title: 'My Doc',
        content: 'Some content here',
        modifiedAt: Date.now(),
        size: 17,
      })
      const files = queries.searchFiles(db, 'doc')
      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('doc.md')
    })

    it('deletes a file', () => {
      const root = queries.addRoot(db, '/tmp/root', 'root')
      queries.upsertFile(db, {
        rootId: root.id,
        relativePath: 'doc.md',
        absolutePath: '/tmp/root/doc.md',
        name: 'doc.md',
        title: null,
        content: 'content',
        modifiedAt: Date.now(),
        size: 7,
      })
      queries.deleteFile(db, '/tmp/root/doc.md')
      expect(queries.searchFiles(db, 'doc')).toHaveLength(0)
    })
  })

  describe('tags', () => {
    it('syncs tags from frontmatter and inline hashtags', () => {
      const root = queries.addRoot(db, '/tmp/root', 'root')
      queries.upsertFile(db, {
        rootId: root.id,
        relativePath: 'tagged.md',
        absolutePath: '/tmp/root/tagged.md',
        name: 'tagged.md',
        title: null,
        content: 'hello #world',
        modifiedAt: Date.now(),
        size: 12,
      })
      queries.syncTags(db, '/tmp/root/tagged.md', ['work', 'world'])

      const tags = queries.listTags(db)
      expect(tags).toHaveLength(2)
      expect(tags.map(t => t.name).sort()).toEqual(['work', 'world'])
    })

    it('returns files by tag', () => {
      const root = queries.addRoot(db, '/tmp/root', 'root')
      queries.upsertFile(db, {
        rootId: root.id,
        relativePath: 'a.md',
        absolutePath: '/tmp/root/a.md',
        name: 'a.md',
        title: null,
        content: 'a',
        modifiedAt: Date.now(),
        size: 1,
      })
      queries.upsertFile(db, {
        rootId: root.id,
        relativePath: 'b.md',
        absolutePath: '/tmp/root/b.md',
        name: 'b.md',
        title: null,
        content: 'b',
        modifiedAt: Date.now(),
        size: 1,
      })
      queries.syncTags(db, '/tmp/root/a.md', ['shared', 'only-a'])
      queries.syncTags(db, '/tmp/root/b.md', ['shared'])

      const shared = queries.filesByTag(db, 'shared')
      expect(shared).toHaveLength(2)

      const onlyA = queries.filesByTag(db, 'only-a')
      expect(onlyA).toHaveLength(1)
      expect(onlyA[0].name).toBe('a.md')
    })
  })

  describe('full-text search', () => {
    it('searches file content', () => {
      const root = queries.addRoot(db, '/tmp/root', 'root')
      queries.upsertFile(db, {
        rootId: root.id,
        relativePath: 'alpha.md',
        absolutePath: '/tmp/root/alpha.md',
        name: 'alpha.md',
        title: 'Alpha',
        content: 'The quick brown fox jumps over the lazy dog',
        modifiedAt: Date.now(),
        size: 44,
      })
      queries.upsertFile(db, {
        rootId: root.id,
        relativePath: 'beta.md',
        absolutePath: '/tmp/root/beta.md',
        name: 'beta.md',
        title: 'Beta',
        content: 'A slow red cat sleeps on the mat',
        modifiedAt: Date.now(),
        size: 33,
      })

      const foxResults = queries.searchContent(db, 'quick fox')
      expect(foxResults).toHaveLength(1)
      expect(foxResults[0].absolutePath).toBe('/tmp/root/alpha.md')

      const catResults = queries.searchContent(db, 'red cat')
      expect(catResults).toHaveLength(1)
      expect(catResults[0].absolutePath).toBe('/tmp/root/beta.md')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/emile/Projects/markdown-viewer && npx vitest run tests/main/db/queries.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Create src/main/db/schema.sql**

```sql
CREATE TABLE IF NOT EXISTS roots (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  root_id TEXT NOT NULL REFERENCES roots(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL,
  absolute_path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  modified_at INTEGER NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  UNIQUE(root_id, relative_path)
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS file_tags (
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (file_id, tag_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  absolute_path,
  title,
  content,
  content=files,
  content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, absolute_path, title, content)
  VALUES (new.rowid, new.absolute_path, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, absolute_path, title, content)
  VALUES('delete', old.rowid, old.absolute_path, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, absolute_path, title, content)
  VALUES('delete', old.rowid, old.absolute_path, old.title, old.content);
  INSERT INTO files_fts(rowid, absolute_path, title, content)
  VALUES (new.rowid, new.absolute_path, new.title, new.content);
END;
```

- [ ] **Step 4: Create src/main/db/index.ts**

```typescript
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export function createDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  return db
}

export function initSchema(db: Database.Database): void {
  const schema = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf-8'
  )
  db.exec(schema)
}
```

- [ ] **Step 5: Create src/main/db/queries.ts**

```typescript
import Database from 'better-sqlite3'
import crypto from 'crypto'
import type { Root, FileEntry, Tag } from '../../shared/models'

function genId(): string {
  return crypto.randomUUID()
}

// -- Roots --

export function addRoot(db: Database.Database, rootPath: string, name: string): Root {
  const id = genId()
  const addedAt = Date.now()
  db.prepare(
    'INSERT INTO roots (id, path, name, added_at) VALUES (?, ?, ?, ?)'
  ).run(id, rootPath, name, addedAt)
  return { id, path: rootPath, name, addedAt }
}

export function listRoots(db: Database.Database): Root[] {
  return db.prepare('SELECT id, path, name, added_at as addedAt FROM roots ORDER BY added_at').all() as Root[]
}

export function removeRoot(db: Database.Database, rootId: string): void {
  db.prepare('DELETE FROM roots WHERE id = ?').run(rootId)
}

// -- Files --

export type UpsertFileInput = {
  rootId: string
  relativePath: string
  absolutePath: string
  name: string
  title: string | null
  content: string
  modifiedAt: number
  size: number
}

export function upsertFile(db: Database.Database, input: UpsertFileInput): FileEntry {
  const existing = db.prepare('SELECT id FROM files WHERE absolute_path = ?').get(input.absolutePath) as { id: string } | undefined

  const id = existing?.id ?? genId()

  db.prepare(`
    INSERT INTO files (id, root_id, relative_path, absolute_path, name, title, content, modified_at, size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(absolute_path) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      modified_at = excluded.modified_at,
      size = excluded.size
  `).run(id, input.rootId, input.relativePath, input.absolutePath, input.name, input.title, input.content, input.modifiedAt, input.size)

  return {
    id,
    rootId: input.rootId,
    relativePath: input.relativePath,
    absolutePath: input.absolutePath,
    name: input.name,
    title: input.title,
    modifiedAt: input.modifiedAt,
    size: input.size,
  }
}

export function deleteFile(db: Database.Database, absolutePath: string): void {
  db.prepare('DELETE FROM files WHERE absolute_path = ?').run(absolutePath)
}

export function getFileByPath(db: Database.Database, absolutePath: string): FileEntry | null {
  const row = db.prepare(
    'SELECT id, root_id as rootId, relative_path as relativePath, absolute_path as absolutePath, name, title, modified_at as modifiedAt, size FROM files WHERE absolute_path = ?'
  ).get(absolutePath) as FileEntry | undefined
  return row ?? null
}

// -- Tags --

export function syncTags(db: Database.Database, absolutePath: string, tagNames: string[]): void {
  const file = db.prepare('SELECT id FROM files WHERE absolute_path = ?').get(absolutePath) as { id: string } | undefined
  if (!file) return

  db.prepare('DELETE FROM file_tags WHERE file_id = ?').run(file.id)

  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)')
  const getTagId = db.prepare('SELECT id FROM tags WHERE name = ?')
  const insertFileTag = db.prepare('INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)')

  for (const name of tagNames) {
    insertTag.run(name)
    const tag = getTagId.get(name) as { id: number }
    insertFileTag.run(file.id, tag.id)
  }
}

export function listTags(db: Database.Database): Tag[] {
  return db.prepare(`
    SELECT t.name, COUNT(ft.file_id) as count
    FROM tags t
    JOIN file_tags ft ON ft.tag_id = t.id
    GROUP BY t.id
    ORDER BY count DESC
  `).all() as Tag[]
}

export function filesByTag(db: Database.Database, tagName: string): FileEntry[] {
  return db.prepare(`
    SELECT f.id, f.root_id as rootId, f.relative_path as relativePath,
           f.absolute_path as absolutePath, f.name, f.title,
           f.modified_at as modifiedAt, f.size
    FROM files f
    JOIN file_tags ft ON ft.file_id = f.id
    JOIN tags t ON t.id = ft.tag_id
    WHERE t.name = ?
    ORDER BY f.name
  `).all(tagName) as FileEntry[]
}

// -- Search --

export function searchFiles(db: Database.Database, query: string): FileEntry[] {
  return db.prepare(`
    SELECT id, root_id as rootId, relative_path as relativePath,
           absolute_path as absolutePath, name, title,
           modified_at as modifiedAt, size
    FROM files
    WHERE name LIKE ? OR title LIKE ?
    ORDER BY modified_at DESC
  `).all(`%${query}%`, `%${query}%`) as FileEntry[]
}

export function searchContent(db: Database.Database, query: string): FileEntry[] {
  return db.prepare(`
    SELECT f.id, f.root_id as rootId, f.relative_path as relativePath,
           f.absolute_path as absolutePath, f.name, f.title,
           f.modified_at as modifiedAt, f.size
    FROM files_fts fts
    JOIN files f ON f.absolute_path = fts.absolute_path
    WHERE files_fts MATCH ?
    ORDER BY rank
  `).all(query) as FileEntry[]
}
```

- [ ] **Step 6: Run the tests**

Run: `cd /Users/emile/Projects/markdown-viewer && npx vitest run tests/main/db/queries.test.ts`
Expected: All tests PASS

Note: The `initSchema` function reads `schema.sql` from `__dirname`. For tests, you may need to adjust the path or inline the schema. If the test fails because of the file read, update `initSchema` to accept an optional schema string parameter:

```typescript
export function initSchema(db: Database.Database, schemaOverride?: string): void {
  const schema = schemaOverride ?? fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf-8'
  )
  db.exec(schema)
}
```

And in tests, read the schema file explicitly:
```typescript
import { readFileSync } from 'fs'
import path from 'path'

const schema = readFileSync(path.join(__dirname, '../../../src/main/db/schema.sql'), 'utf-8')

beforeEach(() => {
  db = new Database(':memory:')
  initSchema(db, schema)
})
```

- [ ] **Step 7: Commit**

```bash
git add src/main/db/ src/shared/ tests/main/
git commit -m "feat: add SQLite database with schema, queries, FTS5 search, and tag support"
```

---

## Task 3: File Watcher & Indexer

**Files:**
- Create: `src/main/watcher/index.ts`
- Create: `tests/main/watcher/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/main/watcher/index.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { initSchema } from '../../src/main/db/index'
import * as queries from '../../src/main/db/queries'
import { indexFile, extractTags, extractTitle } from '../../src/main/watcher/index'

const schema = fs.readFileSync(path.join(__dirname, '../../src/main/db/schema.sql'), 'utf-8')

describe('File Watcher Utils', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    db = new Database(':memory:')
    initSchema(db, schema)
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inku-test-'))
  })

  afterEach(() => {
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('extractTitle', () => {
    it('extracts title from first h1', () => {
      expect(extractTitle('# Hello World\nsome content')).toBe('Hello World')
    })

    it('extracts title from frontmatter', () => {
      expect(extractTitle('---\ntitle: My Title\n---\ncontent')).toBe('My Title')
    })

    it('returns null when no title', () => {
      expect(extractTitle('just some text')).toBeNull()
    })
  })

  describe('extractTags', () => {
    it('extracts frontmatter tags', () => {
      const content = '---\ntags: [work, draft]\n---\ncontent'
      expect(extractTags(content).sort()).toEqual(['draft', 'work'])
    })

    it('extracts inline hashtags', () => {
      const content = 'hello #world and #coding stuff'
      expect(extractTags(content).sort()).toEqual(['coding', 'world'])
    })

    it('combines frontmatter and inline tags', () => {
      const content = '---\ntags: [work]\n---\nhello #coding'
      expect(extractTags(content).sort()).toEqual(['coding', 'work'])
    })

    it('deduplicates tags', () => {
      const content = '---\ntags: [work]\n---\nhello #work'
      expect(extractTags(content)).toEqual(['work'])
    })
  })

  describe('indexFile', () => {
    it('indexes a markdown file into the database', () => {
      const root = queries.addRoot(db, tmpDir, 'test')
      const filePath = path.join(tmpDir, 'hello.md')
      fs.writeFileSync(filePath, '# Hello\n\nSome content with #tag1')

      indexFile(db, root.id, tmpDir, filePath)

      const files = queries.searchFiles(db, 'hello')
      expect(files).toHaveLength(1)
      expect(files[0].title).toBe('Hello')

      const tags = queries.listTags(db)
      expect(tags).toHaveLength(1)
      expect(tags[0].name).toBe('tag1')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/emile/Projects/markdown-viewer && npx vitest run tests/main/watcher/index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement src/main/watcher/index.ts**

```typescript
import chokidar from 'chokidar'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import * as queries from '../db/queries'
import type { FileChangeEvent } from '../../shared/ipc-types'

export function extractTitle(content: string): string | null {
  // Check frontmatter title
  const fmMatch = content.match(/^---\n[\s\S]*?title:\s*(.+)\n[\s\S]*?---/)
  if (fmMatch) return fmMatch[1].trim()

  // Check first h1
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()

  return null
}

export function extractTags(content: string): string[] {
  const tags = new Set<string>()

  // Frontmatter tags
  const fmMatch = content.match(/^---\n([\s\S]*?)---/)
  if (fmMatch) {
    const tagLineMatch = fmMatch[1].match(/tags:\s*\[([^\]]*)\]/)
    if (tagLineMatch) {
      tagLineMatch[1].split(',').forEach(t => {
        const trimmed = t.trim().replace(/['"]/g, '')
        if (trimmed) tags.add(trimmed)
      })
    }
  }

  // Inline hashtags — match #word but not inside frontmatter or code blocks
  const contentWithoutFm = content.replace(/^---\n[\s\S]*?---\n?/, '')
  const hashtagRegex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_-]*)/g
  let match
  while ((match = hashtagRegex.exec(contentWithoutFm)) !== null) {
    tags.add(match[1])
  }

  return Array.from(tags)
}

export function indexFile(
  db: Database.Database,
  rootId: string,
  rootPath: string,
  filePath: string
): void {
  const content = fs.readFileSync(filePath, 'utf-8')
  const stat = fs.statSync(filePath)
  const relativePath = path.relative(rootPath, filePath)
  const name = path.basename(filePath)
  const title = extractTitle(content)
  const tags = extractTags(content)

  queries.upsertFile(db, {
    rootId,
    relativePath,
    absolutePath: filePath,
    name,
    title,
    content,
    modifiedAt: stat.mtimeMs,
    size: stat.size,
  })

  queries.syncTags(db, filePath, tags)
}

export type WatcherCallbacks = {
  onFileChange: (event: FileChangeEvent) => void
  onFileCreate: (event: FileChangeEvent) => void
  onFileDelete: (event: FileChangeEvent) => void
}

export function watchRoot(
  db: Database.Database,
  rootId: string,
  rootPath: string,
  callbacks: WatcherCallbacks
): chokidar.FSWatcher {
  const watcher = chokidar.watch(rootPath, {
    ignored: /(^|[\/\\])\.|node_modules/,
    persistent: true,
    ignoreInitial: false,
  })

  watcher.on('add', (filePath: string) => {
    if (!filePath.endsWith('.md')) return
    indexFile(db, rootId, rootPath, filePath)
    callbacks.onFileCreate({ type: 'add', path: filePath, rootId })
  })

  watcher.on('change', (filePath: string) => {
    if (!filePath.endsWith('.md')) return
    indexFile(db, rootId, rootPath, filePath)
    callbacks.onFileChange({ type: 'change', path: filePath, rootId })
  })

  watcher.on('unlink', (filePath: string) => {
    if (!filePath.endsWith('.md')) return
    queries.deleteFile(db, filePath)
    callbacks.onFileDelete({ type: 'unlink', path: filePath, rootId })
  })

  return watcher
}
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/emile/Projects/markdown-viewer && npx vitest run tests/main/watcher/index.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/watcher/ tests/main/watcher/
git commit -m "feat: add file watcher with indexing, tag extraction, and title extraction"
```

---

## Task 4: IPC Handlers

**Files:**
- Create: `src/main/ipc/index.ts`
- Create: `src/main/ipc/fs-handlers.ts`
- Create: `src/main/ipc/search-handlers.ts`
- Create: `src/main/ipc/tag-handlers.ts`
- Create: `src/main/ipc/theme-handlers.ts`
- Create: `src/main/ipc/plugin-handlers.ts`
- Modify: `src/main/index.ts`
- Create: `src/renderer/ipc.ts`

- [ ] **Step 1: Create src/main/ipc/index.ts**

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import type { IpcInvokeChannels, IpcSendChannel, IpcSendChannels } from '../../shared/ipc-types'

type HandlerMap = {
  [K in keyof IpcInvokeChannels]: (...args: IpcInvokeChannels[K]['args']) => IpcInvokeChannels[K]['result'] | Promise<IpcInvokeChannels[K]['result']>
}

export function registerHandlers(handlers: Partial<HandlerMap>): void {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (_event, ...args) => {
      return (handler as Function)(...args)
    })
  }
}

export function sendToRenderer<C extends IpcSendChannel>(
  win: BrowserWindow,
  channel: C,
  data: IpcSendChannels[C]
): void {
  win.webContents.send(channel, data)
}
```

- [ ] **Step 2: Create src/main/ipc/fs-handlers.ts**

```typescript
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import * as queries from '../db/queries'
import { indexFile, watchRoot, WatcherCallbacks } from '../watcher/index'
import type { Root, FileEntry, TreeNode } from '../../shared/ipc-types'

const watchers = new Map<string, ReturnType<typeof watchRoot>>()

export function createFsHandlers(db: Database.Database, callbacks: WatcherCallbacks) {
  return {
    'fs:list-roots': () => queries.listRoots(db),

    'fs:add-root': (rootPath: string) => {
      const name = path.basename(rootPath)
      const root = queries.addRoot(db, rootPath, name)
      const watcher = watchRoot(db, root.id, rootPath, callbacks)
      watchers.set(root.id, watcher)
      return root
    },

    'fs:remove-root': (rootId: string) => {
      const watcher = watchers.get(rootId)
      if (watcher) {
        watcher.close()
        watchers.delete(rootId)
      }
      queries.removeRoot(db, rootId)
    },

    'fs:read-file': (filePath: string) => {
      return fs.readFileSync(filePath, 'utf-8')
    },

    'fs:write-file': (filePath: string, content: string) => {
      fs.writeFileSync(filePath, content, 'utf-8')
    },

    'fs:create-file': (rootId: string, relativePath: string) => {
      const roots = queries.listRoots(db)
      const root = roots.find(r => r.id === rootId)
      if (!root) throw new Error(`Root not found: ${rootId}`)
      const absolutePath = path.join(root.path, relativePath)
      const dir = path.dirname(absolutePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(absolutePath, '', 'utf-8')
      // The watcher will pick it up and index it
      // But return a FileEntry immediately
      return {
        id: '',
        rootId,
        relativePath,
        absolutePath,
        name: path.basename(relativePath),
        title: null,
        modifiedAt: Date.now(),
        size: 0,
      } as FileEntry
    },

    'fs:delete-file': (filePath: string) => {
      fs.unlinkSync(filePath)
      // Watcher will pick up the unlink and clean DB
    },

    'fs:move-file': (from: string, to: string) => {
      const dir = path.dirname(to)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.renameSync(from, to)
      // Watcher picks up unlink + add
    },

    'fs:list-tree': (rootId: string) => {
      const roots = queries.listRoots(db)
      const root = roots.find(r => r.id === rootId)
      if (!root) return []
      return buildTree(root.path)
    },
  }
}

function buildTree(dirPath: string): TreeNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const nodes: TreeNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.name === 'node_modules') continue

    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children: buildTree(fullPath),
      })
    } else if (entry.name.endsWith('.md')) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
      })
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function closeAllWatchers(): void {
  for (const watcher of watchers.values()) {
    watcher.close()
  }
  watchers.clear()
}
```

- [ ] **Step 3: Create src/main/ipc/search-handlers.ts**

```typescript
import Database from 'better-sqlite3'
import * as queries from '../db/queries'
import type { SearchOpts } from '../../shared/ipc-types'

export function createSearchHandlers(db: Database.Database) {
  return {
    'search:files': (query: string) => queries.searchFiles(db, query),
    'search:content': (query: string, opts?: SearchOpts) => queries.searchContent(db, query),
  }
}
```

- [ ] **Step 4: Create src/main/ipc/tag-handlers.ts**

```typescript
import Database from 'better-sqlite3'
import * as queries from '../db/queries'

export function createTagHandlers(db: Database.Database) {
  return {
    'tags:list': () => queries.listTags(db),
    'tags:files-by-tag': (tag: string) => queries.filesByTag(db, tag),
  }
}
```

- [ ] **Step 5: Create src/main/ipc/theme-handlers.ts**

```typescript
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { ThemeManifest } from '../../shared/theme-types'

export function createThemeHandlers() {
  const builtinDir = path.join(app.getAppPath(), 'themes')
  const userDir = path.join(app.getPath('home'), '.inku', 'themes')

  return {
    'themes:list': (): ThemeManifest[] => {
      const themes: ThemeManifest[] = []
      for (const dir of [builtinDir, userDir]) {
        if (!fs.existsSync(dir)) continue
        for (const file of fs.readdirSync(dir)) {
          if (!file.endsWith('.json')) continue
          const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
          themes.push({
            id: path.basename(file, '.json'),
            name: content.name,
            author: content.author,
            colors: content.colors,
          })
        }
      }
      return themes
    },

    'themes:set': (id: string): void => {
      // Theme application is handled on the renderer side
      // This persists the user's choice
      const configPath = path.join(app.getPath('home'), '.inku', 'config.json')
      const dir = path.dirname(configPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      let config: Record<string, unknown> = {}
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      }
      config.theme = id
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    },
  }
}
```

- [ ] **Step 6: Create src/main/ipc/plugin-handlers.ts**

```typescript
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { PluginManifest } from '../../shared/plugin-types'

export function createPluginHandlers() {
  const builtinDir = path.join(app.getAppPath(), 'src', 'plugins')
  const userDir = path.join(app.getPath('home'), '.inku', 'plugins')
  const configPath = path.join(app.getPath('home'), '.inku', 'config.json')

  function getDisabledPlugins(): string[] {
    if (!fs.existsSync(configPath)) return []
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return config.disabledPlugins ?? []
  }

  function setDisabledPlugins(ids: string[]): void {
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    let config: Record<string, unknown> = {}
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
    config.disabledPlugins = ids
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  }

  return {
    'plugins:list': (): PluginManifest[] => {
      const disabled = getDisabledPlugins()
      const plugins: PluginManifest[] = []

      for (const [dir, builtin] of [[builtinDir, true], [userDir, false]] as const) {
        if (!fs.existsSync(dir)) continue
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue
          const manifestPath = path.join(dir, entry.name, 'manifest.json')
          if (!fs.existsSync(manifestPath)) continue

          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
          plugins.push({
            id: manifest.id ?? entry.name,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            type: manifest.type ?? 'markdown-extension',
            builtin: builtin as boolean,
            enabled: !disabled.includes(manifest.id ?? entry.name),
            hooks: manifest.hooks ?? {},
          })
        }
      }
      return plugins
    },

    'plugins:toggle': (id: string, enabled: boolean): void => {
      const disabled = getDisabledPlugins()
      if (enabled) {
        setDisabledPlugins(disabled.filter(d => d !== id))
      } else {
        if (!disabled.includes(id)) {
          setDisabledPlugins([...disabled, id])
        }
      }
    },
  }
}
```

- [ ] **Step 7: Create src/renderer/ipc.ts**

```typescript
import type { ElectronAPI } from '../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export const ipc = window.electronAPI
```

- [ ] **Step 8: Update src/main/index.ts to wire up IPC**

Replace the entire file with:

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { createDatabase } from './db/index'
import { registerHandlers, sendToRenderer } from './ipc/index'
import { createFsHandlers, closeAllWatchers } from './ipc/fs-handlers'
import { createSearchHandlers } from './ipc/search-handlers'
import { createTagHandlers } from './ipc/tag-handlers'
import { createThemeHandlers } from './ipc/theme-handlers'
import { createPluginHandlers } from './ipc/plugin-handlers'
import type { WatcherCallbacks } from './watcher/index'

let mainWindow: BrowserWindow | null = null

const dbPath = path.join(app.getPath('userData'), 'inku.db')

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const db = createDatabase(dbPath)

  const watcherCallbacks: WatcherCallbacks = {
    onFileChange: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-changed', event)
    },
    onFileCreate: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-created', event)
    },
    onFileDelete: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-deleted', event)
    },
  }

  registerHandlers({
    ...createFsHandlers(db, watcherCallbacks),
    ...createSearchHandlers(db),
    ...createTagHandlers(db),
    ...createThemeHandlers(),
    ...createPluginHandlers(),
  })

  // Restore previously opened roots
  const roots = db.prepare('SELECT id, path FROM roots').all() as { id: string; path: string }[]
  for (const root of roots) {
    const { watchRoot } = require('./watcher/index')
    watchRoot(db, root.id, root.path, watcherCallbacks)
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    closeAllWatchers()
    db.close()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
```

- [ ] **Step 9: Commit**

```bash
git add src/main/ipc/ src/renderer/ipc.ts
git commit -m "feat: add typed IPC handlers for files, search, tags, themes, and plugins"
```

---

## Task 5: Theme System

**Files:**
- Create: `themes/inku-dark.json`
- Create: `themes/inku-light.json`
- Create: `src/renderer/themes/tokens.ts`
- Create: `src/renderer/themes/loader.ts`
- Create: `src/renderer/stores/theme.ts`
- Create: `tests/renderer/themes/loader.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/renderer/themes/loader.test.ts
import { describe, it, expect } from 'vitest'
import { applyTheme, tokensToCssVars } from '../../src/renderer/themes/loader'
import type { ThemeColors } from '../../src/shared/theme-types'

describe('Theme Loader', () => {
  const testColors: ThemeColors = {
    'bg-primary': '#000000',
    'bg-secondary': '#111111',
    'bg-surface': '#222222',
    'border': '#333333',
    'text-primary': '#ffffff',
    'text-secondary': '#cccccc',
    'text-muted': '#999999',
    'accent': '#ff0000',
    'accent-strong': '#cc0000',
    'accent-muted': '#330000',
    'success': '#00ff00',
    'warning': '#ffff00',
    'error': '#ff0000',
  }

  it('converts tokens to CSS variable declarations', () => {
    const vars = tokensToCssVars(testColors)
    expect(vars).toContain('--color-bg-primary: #000000')
    expect(vars).toContain('--color-accent: #ff0000')
    expect(vars).toContain('--color-text-primary: #ffffff')
  })

  it('produces a valid CSS string for :root', () => {
    const css = tokensToCssVars(testColors)
    expect(css.startsWith(':root {')).toBe(true)
    expect(css.endsWith('}')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/emile/Projects/markdown-viewer && npx vitest run tests/renderer/themes/loader.test.ts`
Expected: FAIL

- [ ] **Step 3: Create themes/inku-dark.json**

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

- [ ] **Step 4: Create themes/inku-light.json**

```json
{
  "name": "Inku Light",
  "author": "inku",
  "colors": {
    "bg-primary": "#fafafa",
    "bg-secondary": "#f0f0f2",
    "bg-surface": "#ffffff",
    "border": "#e2e2e5",
    "text-primary": "#1a1a1e",
    "text-secondary": "#666666",
    "text-muted": "#b0b0b4",
    "accent": "#7c3aed",
    "accent-strong": "#6d28d9",
    "accent-muted": "#ede9fe",
    "success": "#16a34a",
    "warning": "#d97706",
    "error": "#dc2626"
  }
}
```

- [ ] **Step 5: Create src/renderer/themes/tokens.ts**

```typescript
import type { ThemeColors } from '@shared/theme-types'

export const defaultDarkColors: ThemeColors = {
  'bg-primary': '#0a0a0b',
  'bg-secondary': '#111113',
  'bg-surface': '#1a1a1e',
  'border': '#1e1e22',
  'text-primary': '#e0e0e2',
  'text-secondary': '#8a8a90',
  'text-muted': '#4a4a4f',
  'accent': '#c4b5fd',
  'accent-strong': '#7c3aed',
  'accent-muted': '#1a1a2e',
  'success': '#86efac',
  'warning': '#fcd34d',
  'error': '#fca5a5',
}
```

- [ ] **Step 6: Create src/renderer/themes/loader.ts**

```typescript
import type { ThemeColors } from '@shared/theme-types'

let styleElement: HTMLStyleElement | null = null

export function tokensToCssVars(colors: ThemeColors): string {
  const vars = Object.entries(colors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n')
  return `:root {\n${vars}\n}`
}

export function applyTheme(colors: ThemeColors): void {
  const css = tokensToCssVars(colors)

  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'inku-theme'
    document.head.appendChild(styleElement)
  }

  styleElement.textContent = css
}
```

- [ ] **Step 7: Create src/renderer/stores/theme.ts**

```typescript
import { create } from 'zustand'
import type { ThemeManifest, ThemeColors } from '@shared/theme-types'
import { defaultDarkColors } from '../themes/tokens'
import { applyTheme } from '../themes/loader'

interface ThemeStore {
  themes: ThemeManifest[]
  activeThemeId: string
  colors: ThemeColors
  loadThemes: () => Promise<void>
  setTheme: (id: string) => Promise<void>
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themes: [],
  activeThemeId: 'inku-dark',
  colors: defaultDarkColors,

  loadThemes: async () => {
    const themes = await window.electronAPI.invoke('themes:list')
    set({ themes })
    // Apply current theme
    const active = themes.find(t => t.id === get().activeThemeId)
    if (active) {
      applyTheme(active.colors)
      set({ colors: active.colors })
    }
  },

  setTheme: async (id: string) => {
    const { themes } = get()
    const theme = themes.find(t => t.id === id)
    if (!theme) return
    applyTheme(theme.colors)
    set({ activeThemeId: id, colors: theme.colors })
    await window.electronAPI.invoke('themes:set', id)
  },
}))
```

- [ ] **Step 8: Run tests**

Run: `cd /Users/emile/Projects/markdown-viewer && npx vitest run tests/renderer/themes/loader.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add themes/ src/renderer/themes/ src/renderer/stores/theme.ts tests/renderer/themes/
git commit -m "feat: add theme system with dark/light themes and CSS custom property injection"
```

---

## Task 6: Zustand Stores (Files, Editor, Tags, Search, Plugins)

**Files:**
- Create: `src/renderer/stores/files.ts`
- Create: `src/renderer/stores/editor.ts`
- Create: `src/renderer/stores/tags.ts`
- Create: `src/renderer/stores/search.ts`
- Create: `src/renderer/stores/plugins.ts`
- Create: `tests/renderer/stores/files.test.ts`
- Create: `tests/renderer/stores/editor.test.ts`

- [ ] **Step 1: Create src/renderer/stores/files.ts**

```typescript
import { create } from 'zustand'
import type { Root, TreeNode, FileEntry } from '@shared/models'

interface FilesStore {
  roots: Root[]
  trees: Record<string, TreeNode[]>
  selectedFile: FileEntry | null
  loadRoots: () => Promise<void>
  addRoot: (path: string) => Promise<void>
  removeRoot: (rootId: string) => Promise<void>
  loadTree: (rootId: string) => Promise<void>
  selectFile: (file: FileEntry) => void
  refreshTrees: () => Promise<void>
}

export const useFilesStore = create<FilesStore>((set, get) => ({
  roots: [],
  trees: {},
  selectedFile: null,

  loadRoots: async () => {
    const roots = await window.electronAPI.invoke('fs:list-roots')
    set({ roots })
    for (const root of roots) {
      await get().loadTree(root.id)
    }
  },

  addRoot: async (path: string) => {
    const root = await window.electronAPI.invoke('fs:add-root', path)
    set(s => ({ roots: [...s.roots, root] }))
    await get().loadTree(root.id)
  },

  removeRoot: async (rootId: string) => {
    await window.electronAPI.invoke('fs:remove-root', rootId)
    set(s => ({
      roots: s.roots.filter(r => r.id !== rootId),
      trees: Object.fromEntries(
        Object.entries(s.trees).filter(([k]) => k !== rootId)
      ),
    }))
  },

  loadTree: async (rootId: string) => {
    const tree = await window.electronAPI.invoke('fs:list-tree', rootId)
    set(s => ({ trees: { ...s.trees, [rootId]: tree } }))
  },

  selectFile: (file: FileEntry) => {
    set({ selectedFile: file })
  },

  refreshTrees: async () => {
    const { roots } = get()
    for (const root of roots) {
      await get().loadTree(root.id)
    }
  },
}))
```

- [ ] **Step 2: Create src/renderer/stores/editor.ts**

```typescript
import { create } from 'zustand'

export interface OpenTab {
  id: string
  filePath: string
  fileName: string
  content: string
  dirty: boolean
}

interface EditorStore {
  tabs: OpenTab[]
  activeTabId: string | null
  openFile: (filePath: string, fileName: string) => Promise<void>
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateContent: (tabId: string, content: string) => void
  saveTab: (tabId: string) => Promise<void>
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openFile: async (filePath: string, fileName: string) => {
    const { tabs } = get()
    const existing = tabs.find(t => t.filePath === filePath)
    if (existing) {
      set({ activeTabId: existing.id })
      return
    }

    const content = await window.electronAPI.invoke('fs:read-file', filePath)
    const id = crypto.randomUUID()
    const tab: OpenTab = { id, filePath, fileName, content, dirty: false }
    set(s => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }))
  },

  closeTab: (tabId: string) => {
    set(s => {
      const tabs = s.tabs.filter(t => t.id !== tabId)
      let activeTabId = s.activeTabId
      if (activeTabId === tabId) {
        const idx = s.tabs.findIndex(t => t.id === tabId)
        activeTabId = tabs[Math.min(idx, tabs.length - 1)]?.id ?? null
      }
      return { tabs, activeTabId }
    })
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId })
  },

  updateContent: (tabId: string, content: string) => {
    set(s => ({
      tabs: s.tabs.map(t =>
        t.id === tabId ? { ...t, content, dirty: true } : t
      ),
    }))
  },

  saveTab: async (tabId: string) => {
    const tab = get().tabs.find(t => t.id === tabId)
    if (!tab) return
    await window.electronAPI.invoke('fs:write-file', tab.filePath, tab.content)
    set(s => ({
      tabs: s.tabs.map(t =>
        t.id === tabId ? { ...t, dirty: false } : t
      ),
    }))
  },
}))
```

- [ ] **Step 3: Create src/renderer/stores/tags.ts**

```typescript
import { create } from 'zustand'
import type { Tag, FileEntry } from '@shared/models'

interface TagsStore {
  tags: Tag[]
  activeTag: string | null
  filteredFiles: FileEntry[]
  loadTags: () => Promise<void>
  filterByTag: (tag: string | null) => Promise<void>
}

export const useTagsStore = create<TagsStore>((set) => ({
  tags: [],
  activeTag: null,
  filteredFiles: [],

  loadTags: async () => {
    const tags = await window.electronAPI.invoke('tags:list')
    set({ tags })
  },

  filterByTag: async (tag: string | null) => {
    if (!tag) {
      set({ activeTag: null, filteredFiles: [] })
      return
    }
    const files = await window.electronAPI.invoke('tags:files-by-tag', tag)
    set({ activeTag: tag, filteredFiles: files })
  },
}))
```

- [ ] **Step 4: Create src/renderer/stores/search.ts**

```typescript
import { create } from 'zustand'
import type { FileEntry, SearchResult } from '@shared/models'

interface SearchStore {
  query: string
  mode: 'files' | 'content'
  fileResults: FileEntry[]
  contentResults: SearchResult[]
  isSearching: boolean
  setQuery: (query: string) => void
  searchFiles: (query: string) => Promise<void>
  searchContent: (query: string) => Promise<void>
  clear: () => void
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  mode: 'files',
  fileResults: [],
  contentResults: [],
  isSearching: false,

  setQuery: (query: string) => set({ query }),

  searchFiles: async (query: string) => {
    if (!query.trim()) {
      set({ fileResults: [], query, mode: 'files' })
      return
    }
    set({ isSearching: true, query, mode: 'files' })
    const fileResults = await window.electronAPI.invoke('search:files', query)
    set({ fileResults, isSearching: false })
  },

  searchContent: async (query: string) => {
    if (!query.trim()) {
      set({ contentResults: [], query, mode: 'content' })
      return
    }
    set({ isSearching: true, query, mode: 'content' })
    const contentResults = await window.electronAPI.invoke('search:content', query)
    set({ contentResults, isSearching: false })
  },

  clear: () => set({ query: '', fileResults: [], contentResults: [], isSearching: false }),
}))
```

- [ ] **Step 5: Create src/renderer/stores/plugins.ts**

```typescript
import { create } from 'zustand'
import type { PluginManifest } from '@shared/plugin-types'

interface PluginsStore {
  plugins: PluginManifest[]
  loadPlugins: () => Promise<void>
  togglePlugin: (id: string, enabled: boolean) => Promise<void>
}

export const usePluginsStore = create<PluginsStore>((set) => ({
  plugins: [],

  loadPlugins: async () => {
    const plugins = await window.electronAPI.invoke('plugins:list')
    set({ plugins })
  },

  togglePlugin: async (id: string, enabled: boolean) => {
    await window.electronAPI.invoke('plugins:toggle', id, enabled)
    set(s => ({
      plugins: s.plugins.map(p =>
        p.id === id ? { ...p, enabled } : p
      ),
    }))
  },
}))
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/stores/
git commit -m "feat: add Zustand stores for files, editor, tags, search, and plugins"
```

---

## Task 7: Sidebar UI (File Tree, Tags, Search)

**Files:**
- Create: `src/renderer/components/sidebar/Sidebar.tsx`
- Create: `src/renderer/components/sidebar/SearchBar.tsx`
- Create: `src/renderer/components/sidebar/FileTree.tsx`
- Create: `src/renderer/components/sidebar/FileTreeItem.tsx`
- Create: `src/renderer/components/sidebar/TagPanel.tsx`
- Create: `src/renderer/components/sidebar/ContextMenu.tsx`
- Create: `src/renderer/components/sidebar/sidebar.css`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Create src/renderer/components/sidebar/sidebar.css**

```css
.sidebar {
  width: 260px;
  min-width: 200px;
  max-width: 400px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  height: 100%;
  user-select: none;
}

.sidebar-header {
  padding: 12px 12px 0;
  -webkit-app-region: drag;
  height: 40px;
  display: flex;
  align-items: center;
}

.sidebar-brand {
  color: var(--color-text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.search-bar {
  margin: 8px 12px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: text;
}

.search-bar:focus-within {
  border-color: var(--color-accent);
}

.search-bar input {
  background: none;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: 12px;
  font-family: var(--font-ui);
  flex: 1;
}

.search-bar input::placeholder {
  color: var(--color-text-muted);
}

.search-bar-shortcut {
  color: var(--color-text-muted);
  font-size: 10px;
  white-space: nowrap;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.tree-section-label {
  color: var(--color-text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 12px 4px;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-secondary);
  border-radius: 0;
}

.tree-item:hover {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}

.tree-item.selected {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.tree-item-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.tree-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-item-indent {
  width: 16px;
  flex-shrink: 0;
}

.tag-panel {
  border-top: 1px solid var(--color-border);
  padding: 8px 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 12px;
}

.tag-pill {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.tag-pill:hover {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.tag-pill.active {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.context-menu {
  position: fixed;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px 0;
  min-width: 160px;
  z-index: 1000;
}

.context-menu-item {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-text-primary);
  cursor: pointer;
}

.context-menu-item:hover {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.context-menu-separator {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}
```

- [ ] **Step 2: Create src/renderer/components/sidebar/SearchBar.tsx**

```tsx
import { useRef } from 'react'
import { useSearchStore } from '../../stores/search'

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { query, searchFiles } = useSearchStore()

  return (
    <div className="search-bar" onClick={() => inputRef.current?.focus()}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>&#x1F50D;</span>
      <input
        ref={inputRef}
        value={query}
        onChange={e => searchFiles(e.target.value)}
        placeholder="Search files..."
      />
      <span className="search-bar-shortcut">&#x2318;P</span>
    </div>
  )
}
```

- [ ] **Step 3: Create src/renderer/components/sidebar/FileTreeItem.tsx**

```tsx
import { useState } from 'react'
import type { TreeNode } from '@shared/models'
import { useEditorStore } from '../../stores/editor'
import { useFilesStore } from '../../stores/files'

interface Props {
  node: TreeNode
  rootId: string
  depth: number
}

export function FileTreeItem({ node, rootId, depth }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { openFile } = useEditorStore()
  const { selectedFile, selectFile } = useFilesStore()

  const isSelected = selectedFile?.absolutePath === node.path

  const handleClick = () => {
    if (node.type === 'directory') {
      setExpanded(!expanded)
    } else {
      selectFile({
        id: '',
        rootId,
        relativePath: '',
        absolutePath: node.path,
        name: node.name,
        title: null,
        modifiedAt: 0,
        size: 0,
      })
      openFile(node.path, node.name)
    }
  }

  return (
    <>
      <div
        className={`tree-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={handleClick}
      >
        <span className="tree-item-icon">
          {node.type === 'directory' ? (expanded ? '▼' : '▶') : ''}
        </span>
        <span className="tree-item-name">{node.name}</span>
      </div>
      {node.type === 'directory' && expanded && node.children?.map(child => (
        <FileTreeItem
          key={child.path}
          node={child}
          rootId={rootId}
          depth={depth + 1}
        />
      ))}
    </>
  )
}
```

- [ ] **Step 4: Create src/renderer/components/sidebar/FileTree.tsx**

```tsx
import { useFilesStore } from '../../stores/files'
import { FileTreeItem } from './FileTreeItem'

export function FileTree() {
  const { roots, trees } = useFilesStore()

  if (roots.length === 0) {
    return (
      <div className="file-tree" style={{ padding: 12, color: 'var(--color-text-muted)', fontSize: 12 }}>
        No folders open. Use File &gt; Open Folder to get started.
      </div>
    )
  }

  return (
    <div className="file-tree">
      {roots.map(root => (
        <div key={root.id}>
          <div className="tree-section-label">{root.name}</div>
          {(trees[root.id] ?? []).map(node => (
            <FileTreeItem
              key={node.path}
              node={node}
              rootId={root.id}
              depth={0}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create src/renderer/components/sidebar/TagPanel.tsx**

```tsx
import { useTagsStore } from '../../stores/tags'

export function TagPanel() {
  const { tags, activeTag, filterByTag } = useTagsStore()

  if (tags.length === 0) return null

  return (
    <div className="tag-panel">
      <div className="tree-section-label">Tags</div>
      <div className="tag-list">
        {tags.map(tag => (
          <span
            key={tag.name}
            className={`tag-pill ${activeTag === tag.name ? 'active' : ''}`}
            onClick={() => filterByTag(activeTag === tag.name ? null : tag.name)}
          >
            {tag.name} {tag.count}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create src/renderer/components/sidebar/ContextMenu.tsx**

```tsx
import { useEffect } from 'react'

interface MenuItem {
  label: string
  action: () => void
  separator?: boolean
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div className="context-menu" style={{ left: x, top: y }}>
      {items.map((item, i) => (
        item.separator ? (
          <div key={i} className="context-menu-separator" />
        ) : (
          <div
            key={i}
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              item.action()
              onClose()
            }}
          >
            {item.label}
          </div>
        )
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Create src/renderer/components/sidebar/Sidebar.tsx**

```tsx
import { useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { FileTree } from './FileTree'
import { TagPanel } from './TagPanel'
import { useFilesStore } from '../../stores/files'
import { useTagsStore } from '../../stores/tags'
import './sidebar.css'

export function Sidebar() {
  const { loadRoots } = useFilesStore()
  const { loadTags } = useTagsStore()

  useEffect(() => {
    loadRoots()
    loadTags()
  }, [])

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-brand">Inku</span>
      </div>
      <SearchBar />
      <FileTree />
      <TagPanel />
    </div>
  )
}
```

- [ ] **Step 8: Update src/renderer/App.tsx**

```tsx
import { useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { useThemeStore } from './stores/theme'

export function App() {
  const { loadThemes } = useThemeStore()

  useEffect(() => {
    loadThemes()
  }, [])

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 14,
      }}>
        Open a file to start editing
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add src/renderer/components/sidebar/ src/renderer/App.tsx
git commit -m "feat: add sidebar with file tree, search bar, tag panel, and context menu"
```

---

## Task 8: Tab Bar & Status Bar

**Files:**
- Create: `src/renderer/components/tabs/TabBar.tsx`
- Create: `src/renderer/components/tabs/Tab.tsx`
- Create: `src/renderer/components/tabs/tabs.css`
- Create: `src/renderer/components/statusbar/StatusBar.tsx`
- Create: `src/renderer/components/statusbar/statusbar.css`

- [ ] **Step 1: Create src/renderer/components/tabs/tabs.css**

```css
.tab-bar {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  height: 36px;
  overflow-x: auto;
  -webkit-app-region: drag;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  font-size: 12px;
  color: var(--color-text-muted);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  -webkit-app-region: no-drag;
}

.tab:hover {
  color: var(--color-text-secondary);
}

.tab.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-accent);
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 10px;
  opacity: 0;
  color: var(--color-text-muted);
}

.tab:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}

.tab-dirty {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
}
```

- [ ] **Step 2: Create src/renderer/components/tabs/Tab.tsx**

```tsx
import type { OpenTab } from '../../stores/editor'

interface Props {
  tab: OpenTab
  active: boolean
  onSelect: () => void
  onClose: () => void
}

export function Tab({ tab, active, onSelect, onClose }: Props) {
  return (
    <div
      className={`tab ${active ? 'active' : ''}`}
      onClick={onSelect}
    >
      {tab.dirty && <span className="tab-dirty" />}
      <span>{tab.fileName}</span>
      <span
        className="tab-close"
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
      >
        &#x2715;
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Create src/renderer/components/tabs/TabBar.tsx**

```tsx
import { useEditorStore } from '../../stores/editor'
import { Tab } from './Tab'
import './tabs.css'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore()

  if (tabs.length === 0) return null

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          tab={tab}
          active={tab.id === activeTabId}
          onSelect={() => setActiveTab(tab.id)}
          onClose={() => closeTab(tab.id)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create src/renderer/components/statusbar/statusbar.css**

```css
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  height: 28px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.status-bar-left {
  display: flex;
  gap: 16px;
}

.status-bar-right {
  display: flex;
  gap: 16px;
}
```

- [ ] **Step 5: Create src/renderer/components/statusbar/StatusBar.tsx**

```tsx
import { useMemo } from 'react'
import { useEditorStore } from '../../stores/editor'
import './statusbar.css'

export function StatusBar() {
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  const stats = useMemo(() => {
    if (!activeTab) return null
    const words = activeTab.content.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(words / 200))
    const lines = activeTab.content.split('\n').length
    return { words, readingTime, lines }
  }, [activeTab?.content])

  if (!activeTab || !stats) return null

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span>{stats.lines} lines</span>
      </div>
      <div className="status-bar-right">
        <span>{stats.words} words</span>
        <span>{stats.readingTime} min read</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/tabs/ src/renderer/components/statusbar/
git commit -m "feat: add tab bar and status bar components"
```

---

## Task 9: CodeMirror 6 Editor with Inline Rendering

**Files:**
- Create: `src/renderer/components/editor/Editor.tsx`
- Create: `src/renderer/components/editor/extensions.ts`
- Create: `src/renderer/components/editor/inline-render.ts`
- Create: `src/renderer/components/editor/keymap.ts`
- Create: `src/renderer/components/editor/editor.css`
- Modify: `src/renderer/App.tsx`
- Modify: `package.json` (add codemirror dependencies)

- [ ] **Step 1: Add CodeMirror dependencies to package.json**

Add these to `dependencies`:
```json
{
  "@codemirror/lang-markdown": "^6.3.0",
  "@codemirror/language": "^6.10.0",
  "@codemirror/language-data": "^6.5.0",
  "@codemirror/state": "^6.5.0",
  "@codemirror/view": "^6.35.0",
  "@codemirror/commands": "^6.7.0",
  "@codemirror/search": "^6.5.0",
  "@codemirror/autocomplete": "^6.18.0",
  "@lezer/highlight": "^1.2.0",
  "codemirror": "^6.0.0"
}
```

Run: `cd /Users/emile/Projects/markdown-viewer && npm install`

- [ ] **Step 2: Create src/renderer/components/editor/editor.css**

```css
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-breadcrumb {
  padding: 6px 32px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.editor-breadcrumb span {
  color: var(--color-text-muted);
}

.editor-breadcrumb span:last-child {
  color: var(--color-text-secondary);
}

.editor-wrapper {
  flex: 1;
  overflow: hidden;
}

.editor-wrapper .cm-editor {
  height: 100%;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
}

.editor-wrapper .cm-editor.cm-focused {
  outline: none;
}

.editor-wrapper .cm-scroller {
  padding: 16px 32px;
  overflow: auto;
}

.editor-wrapper .cm-content {
  max-width: 720px;
}

.editor-wrapper .cm-line {
  padding: 0;
}

.editor-wrapper .cm-gutters {
  display: none;
}

.editor-wrapper .cm-cursor {
  border-left-color: var(--color-accent);
  border-left-width: 2px;
}

.editor-wrapper .cm-selectionBackground {
  background: var(--color-accent-muted) !important;
}

.editor-wrapper .cm-activeLine {
  background: transparent;
}

/* Inline rendering styles */
.cm-md-heading-1 {
  font-size: 1.8em;
  font-weight: 700;
  font-family: var(--font-ui);
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
}

.cm-md-heading-2 {
  font-size: 1.4em;
  font-weight: 700;
  font-family: var(--font-ui);
  color: var(--color-text-primary);
}

.cm-md-heading-3 {
  font-size: 1.15em;
  font-weight: 600;
  font-family: var(--font-ui);
  color: var(--color-text-primary);
}

.cm-md-bold {
  font-weight: 700;
  color: var(--color-text-primary);
}

.cm-md-italic {
  font-style: italic;
}

.cm-md-code {
  background: var(--color-bg-surface);
  color: var(--color-accent);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.cm-md-link {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.cm-md-syntax {
  color: var(--color-text-muted);
}

.cm-md-checkbox {
  color: var(--color-accent);
}

.cm-md-checkbox-checked {
  color: var(--color-accent);
  text-decoration: line-through;
  opacity: 0.6;
}

.cm-md-hr {
  display: block;
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 8px 0;
}

.cm-md-blockquote {
  border-left: 3px solid var(--color-accent);
  padding-left: 12px;
  color: var(--color-text-secondary);
}

.cm-md-image {
  max-width: 100%;
  border-radius: var(--radius-md);
  margin: 8px 0;
}
```

- [ ] **Step 3: Create src/renderer/components/editor/keymap.ts**

```typescript
import { keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import type { KeyBinding } from '@codemirror/view'

export function createInkuKeymap(callbacks: {
  onSave: () => void
  onBold: () => void
  onItalic: () => void
  onLink: () => void
}) {
  const inkuBindings: KeyBinding[] = [
    {
      key: 'Mod-s',
      run: () => {
        callbacks.onSave()
        return true
      },
    },
    {
      key: 'Mod-b',
      run: (view) => {
        wrapSelection(view, '**', '**')
        return true
      },
    },
    {
      key: 'Mod-i',
      run: (view) => {
        wrapSelection(view, '*', '*')
        return true
      },
    },
    {
      key: 'Mod-k',
      run: (view) => {
        const { from, to } = view.state.selection.main
        const selected = view.state.sliceDoc(from, to)
        const replacement = `[${selected}](url)`
        view.dispatch({
          changes: { from, to, insert: replacement },
          selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 },
        })
        return true
      },
    },
  ]

  return keymap.of([...inkuBindings, indentWithTab, ...defaultKeymap])
}

function wrapSelection(view: any, before: string, after: string) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: to + before.length },
  })
}
```

- [ ] **Step 4: Create src/renderer/components/editor/inline-render.ts**

```typescript
import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'

const headingClasses: Record<string, string> = {
  'ATXHeading1': 'cm-md-heading-1',
  'ATXHeading2': 'cm-md-heading-2',
  'ATXHeading3': 'cm-md-heading-3',
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        const line = view.state.doc.lineAt(node.from)

        // Don't decorate the line the cursor is on
        if (line.number === cursorLine) return

        // Headings
        const headingClass = headingClasses[node.name]
        if (headingClass) {
          builder.add(
            line.from,
            line.to,
            Decoration.line({ class: headingClass })
          )

          // Hide the # marks
          const headerMark = node.node.getChild('HeaderMark')
          if (headerMark) {
            builder.add(
              headerMark.from,
              headerMark.to + 1, // +1 for the space
              Decoration.replace({})
            )
          }
        }

        // Bold
        if (node.name === 'StrongEmphasis') {
          builder.add(node.from, node.to, Decoration.mark({ class: 'cm-md-bold' }))
          // Hide ** markers
          builder.add(node.from, node.from + 2, Decoration.replace({}))
          builder.add(node.to - 2, node.to, Decoration.replace({}))
        }

        // Italic
        if (node.name === 'Emphasis') {
          builder.add(node.from, node.to, Decoration.mark({ class: 'cm-md-italic' }))
          builder.add(node.from, node.from + 1, Decoration.replace({}))
          builder.add(node.to - 1, node.to, Decoration.replace({}))
        }

        // Inline code
        if (node.name === 'InlineCode') {
          builder.add(node.from, node.to, Decoration.mark({ class: 'cm-md-code' }))
          builder.add(node.from, node.from + 1, Decoration.replace({}))
          builder.add(node.to - 1, node.to, Decoration.replace({}))
        }

        // Links
        if (node.name === 'Link') {
          const linkMark = node.node.getChild('LinkMark')
          const url = node.node.getChild('URL')
          if (url) {
            // Show only the link text, styled as a link
            const textStart = node.from + 1 // after [
            const textEnd = url.from - 2 // before ](
            builder.add(textStart, textEnd, Decoration.mark({ class: 'cm-md-link' }))
            // Hide [ and ](url)
            builder.add(node.from, node.from + 1, Decoration.replace({}))
            builder.add(textEnd, node.to, Decoration.replace({}))
          }
        }

        // Blockquote
        if (node.name === 'Blockquote') {
          builder.add(line.from, line.to, Decoration.line({ class: 'cm-md-blockquote' }))
        }
      },
    })
  }

  return builder.finish()
}

export const inlineRenderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: any) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
)
```

- [ ] **Step 5: Create src/renderer/components/editor/extensions.ts**

```typescript
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { createInkuKeymap } from './keymap'
import { inlineRenderPlugin } from './inline-render'

const inkuTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
  },
  '.cm-content': {
    caretColor: 'var(--color-accent)',
    fontFamily: 'var(--font-ui)',
    fontSize: '15px',
    lineHeight: '1.7',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--color-accent-muted)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-accent)',
    borderLeftWidth: '2px',
  },
})

export function createExtensions(callbacks: {
  onSave: () => void
  onChange: (content: string) => void
}) {
  return [
    inkuTheme,
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
    }),
    createInkuKeymap({
      onSave: callbacks.onSave,
      onBold: () => {},
      onItalic: () => {},
      onLink: () => {},
    }),
    inlineRenderPlugin,
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        callbacks.onChange(update.state.doc.toString())
      }
    }),
    EditorView.lineWrapping,
  ]
}
```

- [ ] **Step 6: Create src/renderer/components/editor/Editor.tsx**

```tsx
import { useEffect, useRef, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEditorStore } from '../../stores/editor'
import { createExtensions } from './extensions'
import './editor.css'

export function Editor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { tabs, activeTabId, updateContent, saveTab } = useEditorStore()

  const activeTab = tabs.find(t => t.id === activeTabId)

  const onSave = useCallback(() => {
    if (activeTabId) saveTab(activeTabId)
  }, [activeTabId, saveTab])

  const onChange = useCallback(
    (content: string) => {
      if (activeTabId) updateContent(activeTabId, content)
    },
    [activeTabId, updateContent]
  )

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const onChangeWithAutosave = useCallback(
    (content: string) => {
      onChange(content)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (activeTabId) saveTab(activeTabId)
      }, 300)
    },
    [onChange, activeTabId, saveTab]
  )

  useEffect(() => {
    if (!containerRef.current || !activeTab) return

    // Clean up previous editor
    if (viewRef.current) {
      viewRef.current.destroy()
    }

    const state = EditorState.create({
      doc: activeTab.content,
      extensions: createExtensions({
        onSave,
        onChange: onChangeWithAutosave,
      }),
    })

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [activeTabId]) // Re-create when switching tabs

  if (!activeTab) {
    return (
      <div className="editor-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 14,
      }}>
        Open a file to start editing
      </div>
    )
  }

  // Extract breadcrumb from file path
  const pathParts = activeTab.filePath.split('/').slice(-3)

  return (
    <div className="editor-container">
      <div className="editor-breadcrumb">
        {pathParts.map((part, i) => (
          <span key={i}>
            {i > 0 && <span> / </span>}
            <span>{part}</span>
          </span>
        ))}
      </div>
      <div className="editor-wrapper" ref={containerRef} />
    </div>
  )
}
```

- [ ] **Step 7: Update src/renderer/App.tsx to include editor, tabs, and status bar**

```tsx
import { useEffect, useState } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TabBar } from './components/tabs/TabBar'
import { Editor } from './components/editor/Editor'
import { StatusBar } from './components/statusbar/StatusBar'
import { useThemeStore } from './stores/theme'

export function App() {
  const { loadThemes } = useThemeStore()
  const [sidebarVisible, setSidebarVisible] = useState(true)

  useEffect(() => {
    loadThemes()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '\\') {
        e.preventDefault()
        setSidebarVisible(v => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      {sidebarVisible && <Sidebar />}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <TabBar />
        <Editor />
        <StatusBar />
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Install new deps and verify**

Run: `cd /Users/emile/Projects/markdown-viewer && npm install`

- [ ] **Step 9: Commit**

```bash
git add src/renderer/components/editor/ src/renderer/App.tsx package.json package-lock.json
git commit -m "feat: add CodeMirror 6 editor with inline markdown rendering, keybindings, and auto-save"
```

---

## Task 10: Command Palette

**Files:**
- Create: `src/renderer/components/command-palette/CommandPalette.tsx`
- Create: `src/renderer/components/command-palette/command-palette.css`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Create src/renderer/components/command-palette/command-palette.css**

```css
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  padding-top: 20vh;
  z-index: 100;
}

.command-palette {
  width: 500px;
  max-height: 400px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.command-palette-input {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.command-palette-input input {
  width: 100%;
  background: none;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: var(--font-ui);
}

.command-palette-input input::placeholder {
  color: var(--color-text-muted);
}

.command-palette-results {
  overflow-y: auto;
  flex: 1;
}

.command-palette-item {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.command-palette-item:hover,
.command-palette-item.selected {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.command-palette-item-shortcut {
  font-size: 11px;
  color: var(--color-text-muted);
}
```

- [ ] **Step 2: Create src/renderer/components/command-palette/CommandPalette.tsx**

```tsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchStore } from '../../stores/search'
import { useEditorStore } from '../../stores/editor'
import './command-palette.css'

interface Command {
  id: string
  label: string
  shortcut?: string
  action: () => void
}

interface Props {
  onClose: () => void
  mode: 'files' | 'commands'
}

export function CommandPalette({ onClose, mode }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { fileResults, searchFiles } = useSearchStore()
  const { openFile } = useEditorStore()

  const commands: Command[] = useMemo(() => [
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', shortcut: '⌘\\', action: () => {} },
    { id: 'new-file', label: 'New File', shortcut: '⌘N', action: () => {} },
    { id: 'save', label: 'Save File', shortcut: '⌘S', action: () => {} },
  ], [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (mode === 'files') {
      searchFiles(query)
    }
  }, [query, mode])

  const items = mode === 'files'
    ? fileResults.map(f => ({
        id: f.absolutePath,
        label: f.name,
        action: () => {
          openFile(f.absolutePath, f.name)
          onClose()
        },
      }))
    : commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      items[selectedIndex]?.action()
    }
  }

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input">
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'files' ? 'Search files...' : 'Type a command...'}
          />
        </div>
        <div className="command-palette-results">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`command-palette-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={item.action}
            >
              <span>{item.label}</span>
              {'shortcut' in item && item.shortcut && (
                <span className="command-palette-item-shortcut">{item.shortcut}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update src/renderer/App.tsx to wire up command palette**

```tsx
import { useEffect, useState } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TabBar } from './components/tabs/TabBar'
import { Editor } from './components/editor/Editor'
import { StatusBar } from './components/statusbar/StatusBar'
import { CommandPalette } from './components/command-palette/CommandPalette'
import { useThemeStore } from './stores/theme'

export function App() {
  const { loadThemes } = useThemeStore()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [paletteMode, setPaletteMode] = useState<'files' | 'commands' | null>(null)

  useEffect(() => {
    loadThemes()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '\\') {
        e.preventDefault()
        setSidebarVisible(v => !v)
      }
      if (e.metaKey && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        setPaletteMode('files')
      }
      if (e.metaKey && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        setPaletteMode('commands')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      {sidebarVisible && <Sidebar />}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <TabBar />
        <Editor />
        <StatusBar />
      </div>
      {paletteMode && (
        <CommandPalette
          mode={paletteMode}
          onClose={() => setPaletteMode(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/command-palette/ src/renderer/App.tsx
git commit -m "feat: add command palette with file search and command modes"
```

---

## Task 11: Settings Panel

**Files:**
- Create: `src/renderer/components/settings/Settings.tsx`
- Create: `src/renderer/components/settings/settings.css`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Create src/renderer/components/settings/settings.css**

```css
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.settings-panel {
  width: 600px;
  max-height: 80vh;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 14px;
}

.settings-close:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.settings-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.settings-row-label {
  font-size: 13px;
  color: var(--color-text-primary);
}

.settings-row-description {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.settings-toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--color-border);
  cursor: pointer;
  position: relative;
  transition: background 0.15s;
}

.settings-toggle.on {
  background: var(--color-accent);
}

.settings-toggle-knob {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left 0.15s;
}

.settings-toggle.on .settings-toggle-knob {
  left: 18px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.theme-card {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: center;
}

.theme-card:hover {
  border-color: var(--color-text-muted);
}

.theme-card.active {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.theme-card-name {
  font-size: 12px;
  color: var(--color-text-primary);
  margin-top: 8px;
}

.theme-card-preview {
  height: 40px;
  border-radius: 3px;
  display: flex;
  gap: 2px;
}

.theme-card-preview-bar {
  flex: 1;
  border-radius: 2px;
}
```

- [ ] **Step 2: Create src/renderer/components/settings/Settings.tsx**

```tsx
import { useThemeStore } from '../../stores/theme'
import { usePluginsStore } from '../../stores/plugins'
import { useEffect } from 'react'
import './settings.css'

interface Props {
  onClose: () => void
}

export function Settings({ onClose }: Props) {
  const { themes, activeThemeId, setTheme } = useThemeStore()
  const { plugins, loadPlugins, togglePlugin } = usePluginsStore()

  useEffect(() => {
    loadPlugins()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <span className="settings-close" onClick={onClose}>&#x2715;</span>
        </div>
        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-section-title">Theme</div>
            <div className="theme-grid">
              {themes.map(theme => (
                <div
                  key={theme.id}
                  className={`theme-card ${theme.id === activeThemeId ? 'active' : ''}`}
                  onClick={() => setTheme(theme.id)}
                >
                  <div className="theme-card-preview">
                    <div className="theme-card-preview-bar" style={{ background: theme.colors['bg-secondary'] }} />
                    <div className="theme-card-preview-bar" style={{ background: theme.colors['bg-primary'] }} />
                    <div className="theme-card-preview-bar" style={{ background: theme.colors.accent }} />
                  </div>
                  <div className="theme-card-name">{theme.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Plugins</div>
            {plugins.map(plugin => (
              <div key={plugin.id} className="settings-row">
                <div>
                  <div className="settings-row-label">{plugin.name}</div>
                  <div className="settings-row-description">{plugin.description}</div>
                </div>
                <div
                  className={`settings-toggle ${plugin.enabled ? 'on' : ''}`}
                  onClick={() => togglePlugin(plugin.id, !plugin.enabled)}
                >
                  <div className="settings-toggle-knob" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update App.tsx to add settings shortcut and open folder dialog**

```tsx
import { useEffect, useState } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TabBar } from './components/tabs/TabBar'
import { Editor } from './components/editor/Editor'
import { StatusBar } from './components/statusbar/StatusBar'
import { CommandPalette } from './components/command-palette/CommandPalette'
import { Settings } from './components/settings/Settings'
import { useThemeStore } from './stores/theme'

export function App() {
  const { loadThemes } = useThemeStore()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [paletteMode, setPaletteMode] = useState<'files' | 'commands' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    loadThemes()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '\\') {
        e.preventDefault()
        setSidebarVisible(v => !v)
      }
      if (e.metaKey && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        setPaletteMode('files')
      }
      if (e.metaKey && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        setPaletteMode('commands')
      }
      if (e.metaKey && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      {sidebarVisible && <Sidebar />}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <TabBar />
        <Editor />
        <StatusBar />
      </div>
      {paletteMode && (
        <CommandPalette
          mode={paletteMode}
          onClose={() => setPaletteMode(null)}
        />
      )}
      {settingsOpen && (
        <Settings onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/settings/ src/renderer/App.tsx
git commit -m "feat: add settings panel with theme picker and plugin toggles"
```

---

## Task 12: Open Folder Dialog & File Watcher Events

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Add dialog IPC to preload**

Update `src/preload/index.ts` to add a `showOpenDialog` method:

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { IpcInvokeChannels, IpcSendChannels } from '../shared/ipc-types'

type ChannelName = keyof IpcInvokeChannels
type SendChannelName = keyof IpcSendChannels

const electronAPI = {
  invoke: <C extends ChannelName>(
    channel: C,
    ...args: IpcInvokeChannels[C]['args']
  ): Promise<IpcInvokeChannels[C]['result']> => {
    return ipcRenderer.invoke(channel, ...args)
  },
  on: <C extends SendChannelName>(
    channel: C,
    callback: (data: IpcSendChannels[C]) => void
  ) => {
    const handler = (_event: Electron.IpcRendererEvent, data: IpcSendChannels[C]) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  showOpenDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:open-folder')
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
```

- [ ] **Step 2: Add dialog handler in main/index.ts**

Add after `registerHandlers(...)`:

```typescript
import { dialog } from 'electron'

// Add this inside createWindow(), after registerHandlers:
ipcMain.handle('dialog:open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})
```

- [ ] **Step 3: Add open folder button to sidebar**

Update `src/renderer/components/sidebar/Sidebar.tsx`:

```tsx
import { useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { FileTree } from './FileTree'
import { TagPanel } from './TagPanel'
import { useFilesStore } from '../../stores/files'
import { useTagsStore } from '../../stores/tags'
import './sidebar.css'

export function Sidebar() {
  const { loadRoots, addRoot } = useFilesStore()
  const { loadTags } = useTagsStore()

  useEffect(() => {
    loadRoots()
    loadTags()

    // Listen for file change events to refresh
    const unsubChange = window.electronAPI.on('watch:file-changed', () => {
      loadTags()
    })
    const unsubCreate = window.electronAPI.on('watch:file-created', () => {
      loadRoots()
      loadTags()
    })
    const unsubDelete = window.electronAPI.on('watch:file-deleted', () => {
      loadRoots()
      loadTags()
    })

    return () => {
      unsubChange()
      unsubCreate()
      unsubDelete()
    }
  }, [])

  const handleOpenFolder = async () => {
    const folderPath = await window.electronAPI.showOpenDialog()
    if (folderPath) {
      await addRoot(folderPath)
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-brand">Inku</span>
        <button
          onClick={handleOpenFolder}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
          }}
          title="Open folder"
        >
          +
        </button>
      </div>
      <SearchBar />
      <FileTree />
      <TagPanel />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/main/index.ts src/preload/index.ts src/renderer/components/sidebar/Sidebar.tsx
git commit -m "feat: add open folder dialog and file watcher event listeners"
```

---

## Task 13: Built-in Plugins (GFM, Math, Mermaid, Footnotes)

**Files:**
- Create: `src/plugins/gfm/manifest.json`
- Create: `src/plugins/gfm/index.ts`
- Create: `src/plugins/math/manifest.json`
- Create: `src/plugins/math/index.ts`
- Create: `src/plugins/mermaid/manifest.json`
- Create: `src/plugins/mermaid/index.ts`
- Create: `src/plugins/footnotes/manifest.json`
- Create: `src/plugins/footnotes/index.ts`

- [ ] **Step 1: Add remark/plugin dependencies**

Add to `dependencies` in `package.json`:
```json
{
  "remark-gfm": "^4.0.0",
  "remark-math": "^6.0.0",
  "remark-footnotes": "^4.0.0",
  "katex": "^0.16.0",
  "mermaid": "^11.0.0"
}
```

Add to `devDependencies`:
```json
{
  "@types/katex": "^0.16.0"
}
```

Run: `npm install`

- [ ] **Step 2: Create src/plugins/gfm/manifest.json**

```json
{
  "id": "gfm",
  "name": "GitHub Flavored Markdown",
  "version": "1.0.0",
  "description": "Tables, strikethrough, autolinks, and task lists",
  "type": "markdown-extension",
  "hooks": {
    "remarkPlugin": true,
    "codemirrorExtension": false
  }
}
```

- [ ] **Step 3: Create src/plugins/gfm/index.ts**

```typescript
import remarkGfm from 'remark-gfm'

export const remarkPlugin = remarkGfm
```

- [ ] **Step 4: Create src/plugins/math/manifest.json**

```json
{
  "id": "math",
  "name": "Math (KaTeX)",
  "version": "1.0.0",
  "description": "Render LaTeX math expressions with KaTeX",
  "type": "markdown-extension",
  "hooks": {
    "remarkPlugin": true,
    "codemirrorExtension": false
  }
}
```

- [ ] **Step 5: Create src/plugins/math/index.ts**

```typescript
import remarkMath from 'remark-math'

export const remarkPlugin = remarkMath
```

- [ ] **Step 6: Create src/plugins/mermaid/manifest.json**

```json
{
  "id": "mermaid",
  "name": "Mermaid Diagrams",
  "version": "1.0.0",
  "description": "Render Mermaid diagrams from fenced code blocks",
  "type": "markdown-extension",
  "hooks": {
    "remarkPlugin": false,
    "codemirrorExtension": false
  }
}
```

- [ ] **Step 7: Create src/plugins/mermaid/index.ts**

```typescript
// Mermaid renders in the preview layer, not as a remark plugin.
// It intercepts fenced code blocks with language "mermaid" in the
// inline render plugin and renders them using the mermaid library.

import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#c4b5fd',
    primaryBorderColor: '#7c3aed',
    primaryTextColor: '#e0e0e2',
    lineColor: '#4a4a4f',
    secondaryColor: '#1a1a2e',
    tertiaryColor: '#111113',
  },
})

export async function renderMermaid(
  code: string,
  container: HTMLElement
): Promise<void> {
  const id = `mermaid-${crypto.randomUUID()}`
  const { svg } = await mermaid.render(id, code)
  container.innerHTML = svg
}
```

- [ ] **Step 8: Create src/plugins/footnotes/manifest.json**

```json
{
  "id": "footnotes",
  "name": "Footnotes",
  "version": "1.0.0",
  "description": "Support for footnote references and definitions",
  "type": "markdown-extension",
  "hooks": {
    "remarkPlugin": true,
    "codemirrorExtension": false
  }
}
```

- [ ] **Step 9: Create src/plugins/footnotes/index.ts**

```typescript
import remarkFootnotes from 'remark-footnotes'

export const remarkPlugin = remarkFootnotes
```

- [ ] **Step 10: Commit**

```bash
git add src/plugins/ package.json package-lock.json
git commit -m "feat: add built-in plugins for GFM, math, mermaid, and footnotes"
```

---

## Task 14: Electron Packaging & App Icon

**Files:**
- Modify: `electron-builder.yml`
- Create: `resources/icon.png` (placeholder — will be generated)
- Modify: `package.json`

- [ ] **Step 1: Update electron-builder.yml**

```yaml
appId: com.inku.app
productName: Inku
directories:
  output: release
  buildResources: resources
mac:
  category: public.app-category.developer-tools
  icon: resources/icon.icns
  target:
    - dmg
    - zip
  darkModeSupport: true
files:
  - dist/**/*
  - node_modules/**/*
  - themes/**/*
  - package.json
extraResources:
  - from: themes
    to: themes
```

- [ ] **Step 2: Update package.json scripts**

Add to `scripts`:
```json
{
  "package:mac": "npm run build && npm run build:main && electron-builder --mac"
}
```

- [ ] **Step 3: Create a placeholder icon**

For now, create a simple SVG that can be converted later:

```bash
# Create resources directory
mkdir -p /Users/emile/Projects/markdown-viewer/resources
```

The actual icon (ink drop character) will be designed later. For now the app will use Electron's default icon.

- [ ] **Step 4: Verify build**

Run: `cd /Users/emile/Projects/markdown-viewer && npm run build && npm run build:main`
Expected: No errors. `dist/` directory created with compiled output.

- [ ] **Step 5: Commit**

```bash
git add electron-builder.yml package.json resources/
git commit -m "feat: configure Electron packaging for macOS with electron-builder"
```

---

## Task 15: Wire Up File Watch Events & Final Integration

**Files:**
- Modify: `src/main/index.ts` — ensure imports are correct
- Modify: `src/renderer/ipc.ts` — update type

- [ ] **Step 1: Final review of src/main/index.ts**

Ensure the file imports `dialog` and `ipcMain` from electron, wires up all handlers, and the dialog handler is registered. Full final version:

```typescript
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'path'
import { createDatabase } from './db/index'
import { registerHandlers, sendToRenderer } from './ipc/index'
import { createFsHandlers, closeAllWatchers } from './ipc/fs-handlers'
import { createSearchHandlers } from './ipc/search-handlers'
import { createTagHandlers } from './ipc/tag-handlers'
import { createThemeHandlers } from './ipc/theme-handlers'
import { createPluginHandlers } from './ipc/plugin-handlers'
import { watchRoot } from './watcher/index'
import type { WatcherCallbacks } from './watcher/index'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const dbPath = path.join(app.getPath('userData'), 'inku.db')
  const db = createDatabase(dbPath)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const watcherCallbacks: WatcherCallbacks = {
    onFileChange: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-changed', event)
    },
    onFileCreate: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-created', event)
    },
    onFileDelete: (event) => {
      if (mainWindow) sendToRenderer(mainWindow, 'watch:file-deleted', event)
    },
  }

  registerHandlers({
    ...createFsHandlers(db, watcherCallbacks),
    ...createSearchHandlers(db),
    ...createTagHandlers(db),
    ...createThemeHandlers(),
    ...createPluginHandlers(),
  })

  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Restore previously opened roots
  const roots = db.prepare('SELECT id, path FROM roots').all() as { id: string; path: string }[]
  for (const root of roots) {
    watchRoot(db, root.id, root.path, watcherCallbacks)
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    closeAllWatchers()
    db.close()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
```

- [ ] **Step 2: End-to-end smoke test**

Run the full app:
```bash
cd /Users/emile/Projects/markdown-viewer
npm install
npm run build:main
# Terminal 1:
npm run dev
# Terminal 2:
npm run dev:electron
```

Verify:
1. Window opens with dark theme, sidebar shows "Inku"
2. Click "+" in sidebar → folder dialog opens
3. Select a folder with `.md` files → tree populates
4. Click a `.md` file → opens in editor tab with inline rendering
5. Type markdown → auto-saves after 300ms
6. `Cmd+P` → file search palette opens
7. `Cmd+Shift+P` → command palette opens
8. `Cmd+\` → sidebar toggles
9. `Cmd+,` → settings panel opens with theme picker
10. Tags appear in sidebar if files contain frontmatter tags or `#hashtags`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete Inku v1 integration — editor, sidebar, themes, plugins, and file management"
```
