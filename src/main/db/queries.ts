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
