ALTER TABLE concept_notes DROP CONSTRAINT IF EXISTS concept_notes_concept_id_fkey;
ALTER TABLE concept_notes ADD CONSTRAINT concept_notes_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE SET NULL;

ALTER TABLE concept_videos DROP CONSTRAINT IF EXISTS concept_videos_concept_id_fkey;
ALTER TABLE concept_videos ADD CONSTRAINT concept_videos_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE SET NULL;

ALTER TABLE concept_questions DROP CONSTRAINT IF EXISTS concept_questions_concept_id_fkey;
ALTER TABLE concept_questions ADD CONSTRAINT concept_questions_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'document_store'
  ) THEN
    ALTER TABLE document_store DROP CONSTRAINT IF EXISTS document_store_school_id_fkey;
    ALTER TABLE document_store ADD CONSTRAINT document_store_school_id_fkey
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
  END IF;
END $$;
