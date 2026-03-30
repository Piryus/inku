import Database from 'better-sqlite3'
import * as queries from '../db/queries'

export function createTagHandlers(db: Database.Database) {
  return {
    'tags:list': () => queries.listTags(db),
    'tags:files-by-tag': (tag: string) => queries.filesByTag(db, tag),
  }
}
