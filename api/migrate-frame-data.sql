CREATE TABLE IF NOT EXISTS frame_data (
  id TEXT PRIMARY KEY,
  character TEXT NOT NULL,
  move_name TEXT NOT NULL,
  move_name_jp TEXT NOT NULL DEFAULT '',
  input TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'normal'
    CHECK (category IN ('normal','special','super','throw','unique','target_combo','command_normal')),
  startup INTEGER,
  active INTEGER,
  recovery INTEGER,
  on_block INTEGER,
  on_hit INTEGER,
  damage INTEGER,
  guard TEXT NOT NULL DEFAULT '',
  cancel_into TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(character, move_name)
);
CREATE INDEX IF NOT EXISTS idx_frame_data_char ON frame_data(character);
CREATE INDEX IF NOT EXISTS idx_frame_data_cat ON frame_data(character, category);
