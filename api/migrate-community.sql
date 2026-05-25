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
CREATE INDEX IF NOT EXISTS idx_translation_cache_memo_lang ON translation_cache(memo_id, target_lang);

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

-- Creator subscriptions
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
CREATE INDEX IF NOT EXISTS idx_creator_subs_subscriber ON creator_subscriptions(subscriber_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_subs_creator ON creator_subscriptions(creator_id, status);
