-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  main_character TEXT NOT NULL DEFAULT '',
  sub_characters TEXT NOT NULL DEFAULT '[]',
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
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
  replay_id TEXT,
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

-- Character matchup notes
CREATE TABLE IF NOT EXISTS character_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  my_character TEXT NOT NULL,
  opponent_character TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, my_character, opponent_character)
);

-- Combo memos
CREATE TABLE IF NOT EXISTS combo_memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  character TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  command TEXT NOT NULL DEFAULT '',
  damage INTEGER,
  memo TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Translation cache
CREATE TABLE IF NOT EXISTS translation_cache (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
  UNIQUE(memo_id, target_lang)
);

-- Creator profiles
CREATE TABLE IF NOT EXISTS creators (
  user_id TEXT PRIMARY KEY,
  stripe_account_id TEXT,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  monthly_price INTEGER NOT NULL DEFAULT 500,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Creator subscriptions (subscriber -> creator)
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (subscriber_id) REFERENCES users(id),
  FOREIGN KEY (creator_id) REFERENCES users(id),
  UNIQUE(subscriber_id, creator_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_memos_opponent_character ON memos(opponent_character);
CREATE INDEX IF NOT EXISTS idx_memos_is_public ON memos(is_public);
CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at);
CREATE INDEX IF NOT EXISTS idx_memos_replay_id ON memos(replay_id);
CREATE INDEX IF NOT EXISTS idx_character_notes_user ON character_notes(user_id, my_character, opponent_character);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_feedback_id ON feedback_votes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_combo_memos_user_char ON combo_memos(user_id, character);
CREATE INDEX IF NOT EXISTS idx_translation_cache_memo_lang ON translation_cache(memo_id, target_lang);
CREATE INDEX IF NOT EXISTS idx_creator_subs_subscriber ON creator_subscriptions(subscriber_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_subs_creator ON creator_subscriptions(creator_id, status);
