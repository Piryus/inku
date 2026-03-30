import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { initSchema } from '../../../src/main/db/index'
import * as queries from '../../../src/main/db/queries'
import { indexFile, extractTags, extractTitle } from '../../../src/main/watcher/index'

const schema = fs.readFileSync(path.join(__dirname, '../../../src/main/db/schema.sql'), 'utf-8')

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
