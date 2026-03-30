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

export function initSchema(db: Database.Database, schemaOverride?: string): void {
  const schema = schemaOverride ?? fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf-8'
  )
  db.exec(schema)
}
