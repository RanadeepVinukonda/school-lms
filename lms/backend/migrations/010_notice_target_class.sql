ALTER TABLE notice_board ADD COLUMN IF NOT EXISTS target_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notice_target_class ON notice_board(target_class_id);
