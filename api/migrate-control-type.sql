-- コンボにクラシック/モダン操作タイプを追加
ALTER TABLE combo_memos ADD COLUMN control_type TEXT NOT NULL DEFAULT 'classic' CHECK (control_type IN ('classic', 'modern'));
