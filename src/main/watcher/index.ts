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
