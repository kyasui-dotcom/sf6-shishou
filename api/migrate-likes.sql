CREATE TABLE IF NOT EXISTS memo_likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  memo_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
  UNIQUE(user_id, memo_id)
);
CREATE INDEX IF NOT EXISTS idx_memo_likes_memo ON memo_likes(memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_likes_user ON memo_likes(user_id);
