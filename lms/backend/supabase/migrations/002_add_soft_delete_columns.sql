-- Add soft-delete and archive columns to existing typed tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['users','textbooks','chapters','concepts','concept_notes','concept_videos','concept_questions','concept_resources','processing_jobs','raw_pages'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT ''active'' CHECK (status IN (''active'',''archived'',''deleted''))', tbl);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ', tbl);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tbl);
  END LOOP;
END $$;

-- Index for filtering active records efficiently
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_textbooks_status ON textbooks(status);
CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);
CREATE INDEX IF NOT EXISTS idx_concepts_status ON concepts(status);
