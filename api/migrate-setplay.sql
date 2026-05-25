CREATE TABLE IF NOT EXISTS setplays (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  character TEXT NOT NULL,
  name TEXT NOT NULL,
  situation TEXT NOT NULL DEFAULT '',
  tree TEXT NOT NULL DEFAULT '{}',
  is_public INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_setplays_user ON setplays(user_id, character);
CREATE INDEX IF NOT EXISTS idx_setplays_public ON setplays(is_public, character);
