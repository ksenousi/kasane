-- Rows are stored as the same JSON objects the app uses, so the shapes in
-- src/db/index.ts stay the single source of truth.

CREATE TABLE progress (
  item_id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE synonyms (
  item_id TEXT PRIMARY KEY,
  list TEXT NOT NULL
);
