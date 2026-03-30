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
