-- ═══════════════════════════════════════════════════════════════════
-- NO CAP D1 Schema v0.1 (Tier A MVP)
-- SQLite (Cloudflare D1). Single-user: user_id omitted from MVP tables.
-- Run: wrangler d1 migrations apply nocap --local
-- ═══════════════════════════════════════════════════════════════════

-- ── Users (single row in MVP, id=1) ──
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  github_id TEXT UNIQUE NOT NULL,
  email TEXT,
  timezone TEXT,
  preferences_json TEXT DEFAULT '{}',
  target_role TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ── Mastery (5 dimensions in Tier A; 7 in Tier B v1.0) ──
CREATE TABLE IF NOT EXISTS mastery (
  concept_slug TEXT PRIMARY KEY,
  learn_score REAL DEFAULT 0,
  recall_score REAL DEFAULT 0,
  apply_score REAL DEFAULT 0,
  explain_score REAL DEFAULT 0,
  interview_score REAL DEFAULT 0,
  -- Tier B (v1.0): cost_score REAL DEFAULT 0, code_score REAL DEFAULT 0,
  state TEXT DEFAULT 'not_started',
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mastery_state ON mastery(state);

-- ── Review items (SM-2-like spaced repetition) ──
CREATE TABLE IF NOT EXISTS review_items (
  concept_slug TEXT PRIMARY KEY,
  due_at TEXT NOT NULL,
  interval_days REAL DEFAULT 0.04,
  ease REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  last_quality INTEGER,
  source_type TEXT DEFAULT 'concept',
  source_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_review_due ON review_items(due_at) WHERE due_at IS NOT NULL;

-- ── Learning events (append-only, partitioned by month via view) ──
CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  concept_slug TEXT,
  payload_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_created ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_concept ON learning_events(concept_slug);

-- ── Attempts (quiz, simulation, architecture) ──
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  concept_slug TEXT,
  concept_version INTEGER,
  response_json TEXT,
  score REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_type_ref ON attempts(type, ref_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_concept ON attempts(concept_slug);

-- ── Interview sessions ──
CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT DEFAULT 'text',
  prompt_slug TEXT,
  state_json TEXT,
  score_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ── Achievements (definition is static in git; only earned records here) ──
CREATE TABLE IF NOT EXISTS user_achievements (
  achievement_slug TEXT PRIMARY KEY,
  earned_at TEXT DEFAULT (datetime('now')),
  payload_json TEXT
);

-- ── Quota usage (reset daily by Cron) ──
CREATE TABLE IF NOT EXISTS quota_usage (
  date TEXT NOT NULL,
  service TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (date, service)
);

-- ═══════════════════════════════════════════════════════════════════
-- Seed: single user row
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO users (id, github_id, email, timezone)
VALUES (1, 'personal', 'you@nocap.dev', 'UTC');
