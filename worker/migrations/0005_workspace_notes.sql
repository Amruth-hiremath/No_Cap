CREATE TABLE IF NOT EXISTS workspace_notes (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  blocks_json TEXT NOT NULL DEFAULT '[]',
  canvas_elements_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workspace_notes_user_updated ON workspace_notes(user_id, updated_at);
