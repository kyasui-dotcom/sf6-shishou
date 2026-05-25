-- コンボメモを公開可能に（デフォルト公開）
ALTER TABLE combo_memos ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1;

-- コンボ評価テーブル（つながるよ / つながらないよ）
CREATE TABLE IF NOT EXISTS combo_ratings (
  id TEXT PRIMARY KEY,
  combo_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('works', 'doesnt_work')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (combo_id) REFERENCES combo_memos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(combo_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_combo_ratings_combo ON combo_ratings(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_ratings_user ON combo_ratings(user_id);
