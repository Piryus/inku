import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import * as queries from '../db/queries'
import { watchRoot, WatcherCallbacks } from '../watcher/index'
import type { FileEntry, TreeNode } from '../../shared/models'

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
    },

    'fs:move-file': (from: string, to: string) => {
      const dir = path.dirname(to)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.renameSync(from, to)
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
