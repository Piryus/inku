// tests/main/db/queries.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import path from 'path'
import { initSchema } from '../../../src/main/db/index'
import * as queries from '../../../src/main/db/queries'

const schema = readFileSync(path.join(__dirname, '../../../src/main/db/schema.sql'), 'utf-8')

describe('Database', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initSchema(db, schema)
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
