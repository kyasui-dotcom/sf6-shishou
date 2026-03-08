-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  main_character TEXT NOT NULL DEFAULT '',
  sub_characters TEXT NOT NULL DEFAULT '[]',
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Memos table
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  my_character TEXT NOT NULL,
  opponent_character TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  memo TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Feedback votes table
CREATE TABLE IF NOT EXISTS feedback_votes (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (feedback_id) REFERENCES feedback(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(feedback_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_memos_opponent_character ON memos(opponent_character);
CREATE INDEX IF NOT EXISTS idx_memos_is_public ON memos(is_public);
CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_feedback_id ON feedback_votes(feedback_id);
