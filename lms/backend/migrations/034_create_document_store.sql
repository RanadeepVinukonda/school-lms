-- 034_create_document_store.sql
-- Unified document store replacing firestore_docs.
-- All statements use IF NOT EXISTS / IF EXISTS guards for idempotency.

CREATE TABLE IF NOT EXISTS document_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE document_store IS 'Unified document store replacing firestore_docs';

-- Unique constraint on collection + doc_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'document_store_collection_doc_id_key'
      AND table_name = 'document_store'
  ) THEN
    ALTER TABLE document_store
      ADD CONSTRAINT document_store_collection_doc_id_key
      UNIQUE (collection, doc_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_document_store_collection_doc_id ON document_store (collection, doc_id);
CREATE INDEX IF NOT EXISTS idx_document_store_collection_school_id ON document_store (collection, school_id);
CREATE INDEX IF NOT EXISTS idx_document_store_deleted_at ON document_store (deleted_at);

-- Trigger function to auto-set updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to document_store
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_document_store_updated_at'
      AND event_object_table = 'document_store'
  ) THEN
    CREATE TRIGGER trg_document_store_updated_at
      BEFORE UPDATE ON document_store
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
