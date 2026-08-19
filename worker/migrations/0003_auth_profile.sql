ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'github';
ALTER TABLE users ADD COLUMN provider_user_id TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0;

UPDATE users SET provider_user_id = github_id WHERE provider_user_id IS NULL;
UPDATE users SET auth_provider = 'github' WHERE auth_provider IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_identity ON users(auth_provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
