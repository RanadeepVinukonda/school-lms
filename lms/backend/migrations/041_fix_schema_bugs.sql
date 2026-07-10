-- 041_fix_schema_bugs.sql
-- Fixes 3 schema bugs found during audit

-- =========================================================================
-- FIX 1: Add school_id to processing_jobs and raw_pages (missing column
-- referenced by RLS policies in 021_schema_integrity.sql)
-- =========================================================================
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

ALTER TABLE raw_pages ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Backfill school_id for existing rows via the textbook -> subject -> class -> school chain
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'processing_jobs' AND column_name = 'school_id') THEN
    UPDATE processing_jobs pj
    SET school_id = sub.school_id
    FROM (
      SELECT t.id AS textbook_id, c.school_id
      FROM textbooks t
      JOIN classes c ON c.id = t.class_id
    ) sub
    WHERE pj.textbook_id = sub.textbook_id AND pj.school_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_pages' AND column_name = 'school_id') THEN
    UPDATE raw_pages rp
    SET school_id = sub.school_id
    FROM (
      SELECT t.id AS textbook_id, c.school_id
      FROM textbooks t
      JOIN classes c ON c.id = t.class_id
    ) sub
    WHERE rp.textbook_id = sub.textbook_id AND rp.school_id IS NULL;
  END IF;
END $$;

-- =========================================================================
-- FIX 2: Fix sync_user_class_ids() type mismatch — jsonb_agg returns jsonb
-- but class_ids is TEXT[]. Use array_agg(DISTINCT ...::text) instead.
-- =========================================================================
CREATE OR REPLACE FUNCTION sync_user_class_ids()
RETURNS TRIGGER AS $$
DECLARE
  affected_teacher_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    affected_teacher_id := NEW.teacher_id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_teacher_id := OLD.teacher_id;
  END IF;

  UPDATE users u
  SET class_ids = (
    SELECT COALESCE(array_agg(DISTINCT tcs.class_id::text), ARRAY[]::text[])
    FROM teacher_class_subject_assignments tcs
    WHERE tcs.teacher_id = affected_teacher_id AND tcs.status = 'active'
  ), updated_at = now()
  WHERE u.id = affected_teacher_id AND u.role = 'teacher';

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- FIX 3: attendance.date type inconsistency — schema.sql defines it as DATE,
-- but migrations 012/022/032 all use TEXT. Standardize to DATE.
-- =========================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'date' AND data_type = 'text'
  ) THEN
    ALTER TABLE attendance ALTER COLUMN date TYPE DATE USING date::DATE;
  END IF;
END $$;
