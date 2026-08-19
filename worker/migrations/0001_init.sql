-- ═══════════════════════════════════════════════════════════════════
-- NO CAP D1 Schema v0.1 — Production (with auth + sync)
-- ═══════════════════════════════════════════════════════════════════

-- ── Users ──
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferences_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ── Sessions (cookie-based auth) ──
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ── Mastery ──
CREATE TABLE IF NOT EXISTS mastery (
  user_id INTEGER NOT NULL REFERENCES users(id),
  concept_slug TEXT NOT NULL,
  learn_score REAL DEFAULT 0,
  recall_score REAL DEFAULT 0,
  apply_score REAL DEFAULT 0,
  explain_score REAL DEFAULT 0,
  interview_score REAL DEFAULT 0,
  state TEXT DEFAULT 'not_started',
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, concept_slug)
);

-- ── Review items (spaced repetition) ──
CREATE TABLE IF NOT EXISTS review_items (
  user_id INTEGER NOT NULL REFERENCES users(id),
  concept_slug TEXT NOT NULL,
  due_at TEXT NOT NULL,
  interval_days REAL DEFAULT 0.04,
  ease REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  last_quality INTEGER,
  PRIMARY KEY (user_id, concept_slug)
);
CREATE INDEX IF NOT EXISTS idx_review_due ON review_items(due_at);

-- ── Attempts (quiz, scenario, simulation) ──
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  concept_slug TEXT,
  score REAL,
  response_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, created_at);

-- ── Notes ──
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  concept_slug TEXT NOT NULL,
  block_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notes_user_concept ON notes(user_id, concept_slug);

-- ── Highlights ──
CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  concept_slug TEXT NOT NULL,
  block_id TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  color TEXT DEFAULT 'amber',
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_highlights_user_concept ON highlights(user_id, concept_slug);

-- ── Bookmarks ──
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  concept_slug TEXT NOT NULL,
  block_id TEXT,
  label TEXT NOT NULL,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_concept ON bookmarks(user_id, concept_slug);

-- ── Learning events (audit log) ──
CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  concept_slug TEXT,
  payload_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_user ON learning_events(user_id, created_at);
