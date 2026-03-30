import Database from 'better-sqlite3'
import * as queries from '../db/queries'
import type { SearchOpts } from '../../shared/ipc-types'
import type { SearchResult } from '../../shared/models'

export function createSearchHandlers(db: Database.Database) {
  return {
    'search:files': (query: string) => queries.searchFiles(db, query),

    'search:content': (query: string, _opts?: SearchOpts): SearchResult[] => {
      const files = queries.searchContent(db, query)
      return files.map(file => ({ file, matches: [] }))
    },
  }
}
