-- ============================================================================
-- GENESIS LMS — SCHEMA FIX SCRIPT (Tasks 1.2 – 1.8)
-- Run this in Supabase SQL Editor after applying all migration files.
-- Safe to run multiple times (all statements use IF NOT EXISTS / IF EXISTS guards).
-- ============================================================================

-- ============================================================================
-- FIX 1.2: Create VIEW for backward compatibility (nosql_docs → firestore_docs)
-- ============================================================================
CREATE OR REPLACE VIEW nosql_docs AS
SELECT collection, doc_id, data, created_at, updated_at
FROM firestore_docs;

-- ============================================================================
-- FIX 1.3: Fix missing columns on concept_questions
-- ============================================================================
ALTER TABLE concept_questions ADD COLUMN IF NOT EXISTS points REAL NOT NULL DEFAULT 2;
ALTER TABLE concept_questions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE concept_questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ============================================================================
-- FIX 1.4: Fix textbooks status CHECK to include 'error'
-- ============================================================================
ALTER TABLE textbooks DROP CONSTRAINT IF EXISTS textbooks_status_check;
ALTER TABLE textbooks ADD CONSTRAINT textbooks_status_check
  CHECK (status IN ('processing', 'ready', 'failed', 'error'));

-- ============================================================================
-- FIX 1.5: Fix grades view — ensure all columns exist
-- ============================================================================
-- Drop grades view if exists (CASCADE is safe here since we immediately recreate it)
DROP VIEW IF EXISTS grades CASCADE;

CREATE OR REPLACE VIEW grades AS
SELECT
  doc_id AS id,
  data->>'studentId' AS "studentId",
  data->>'courseId' AS "courseId",
  data->>'assignmentId' AS "assignmentId",
  (data->>'score')::numeric AS "score",
  (data->>'maxScore')::numeric AS "maxScore",
  (data->>'totalPoints')::numeric AS "totalPoints",
  data->>'letterGrade' AS "letterGrade",
  data->>'comments' AS "comments",
  data->>'date' AS "date",
  data->>'schoolId' AS "schoolId",
  data->>'classId' AS "classId",
  data->>'subjectId' AS "subjectId",
  data->>'academicYear' AS "academicYear",
  data->>'term' AS "term",
  data->>'feedback' AS "feedback",
  data->>'gradedBy' AS "gradedBy",
  (data->>'percentage')::numeric AS "percentage",
  data->>'remarks' AS "remarks",
  data->>'updatedAt' AS "updatedAt",
  data->>'semester' AS "semester",
  data->>'createdAt' AS "createdAt",
  created_at
FROM firestore_docs WHERE collection = 'grades';

-- Upsert trigger for grades view
CREATE OR REPLACE FUNCTION grades_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('grades', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grades_upsert ON grades;
CREATE TRIGGER trg_grades_upsert
  INSTEAD OF INSERT OR UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION grades_upsert();

-- Delete trigger for grades view
CREATE OR REPLACE FUNCTION grades_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'grades' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grades_delete ON grades;
CREATE TRIGGER trg_grades_delete
  INSTEAD OF DELETE ON grades
  FOR EACH ROW EXECUTE FUNCTION grades_delete();

-- ============================================================================
-- FIX 1.6: Ensure all RPC functions exist
-- ============================================================================

-- increment_student_count
CREATE OR REPLACE FUNCTION increment_student_count(class_id UUID, delta INT DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE classes
  SET student_count = COALESCE(student_count, 0) + delta,
      updated_at = now()
  WHERE id = class_id;
END;
$$;

-- increment_completed_concepts
CREATE OR REPLACE FUNCTION increment_completed_concepts(t_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE textbooks
  SET completed_concepts = completed_concepts + 1,
      updated_at = now()
  WHERE id = t_id
  RETURNING completed_concepts INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- delete_textbook_cascade
CREATE OR REPLACE FUNCTION delete_textbook_cascade(tid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM concept_questions WHERE textbook_id = tid;
  DELETE FROM concept_resources WHERE textbook_id = tid;
  DELETE FROM concept_videos WHERE textbook_id = tid;
  DELETE FROM concept_notes WHERE textbook_id = tid;
  DELETE FROM raw_pages WHERE textbook_id = tid;
  DELETE FROM processing_jobs WHERE textbook_id = tid;
  DELETE FROM concepts WHERE textbook_id = tid;
  DELETE FROM chapters WHERE textbook_id = tid;
  DELETE FROM textbooks WHERE id = tid;
END;
$$;

-- ============================================================================
-- FIX 1.7: Fix RLS policies
-- ============================================================================

-- Tighten attendance policy
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_admin_all ON attendance;
DROP POLICY IF EXISTS "attendance_admin_all" ON attendance;
CREATE POLICY "School-scoped attendance" ON attendance
  FOR ALL USING (class_id IN (
    SELECT id FROM classes WHERE school_id = (auth.jwt() ->> 'school_id')::UUID
  ));

-- concept_releases RLS
ALTER TABLE concept_releases ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'concept_releases' AND policyname = 'School-scoped concept_releases'
  ) THEN
    CREATE POLICY "School-scoped concept_releases" ON concept_releases
      FOR ALL USING (class_id::text IN (
        SELECT id::text FROM classes WHERE school_id = (auth.jwt() ->> 'school_id')::UUID
      ));
  END IF;
END $$;

-- notice_board RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notice_board' AND policyname = 'School-scoped notice_board'
  ) THEN
    ALTER TABLE notice_board ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "School-scoped notice_board" ON notice_board
      FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
  END IF;
END $$;

-- Service role bypass (wrapped for Supabase managed Postgres compatibility)
DO $$ BEGIN
  ALTER ROLE service_role BYPASSRLS;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- FIX 1.8: Seed default data
-- ============================================================================

-- Default school
INSERT INTO schools (id, name, subdomain, plan, primary_color)
SELECT '00000000-0000-0000-0000-000000000001', 'Default School', 'default', 'enterprise', '#6366f1'
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE id = '00000000-0000-0000-0000-000000000001');

-- Admin user (only seeds if no admin exists)
INSERT INTO users (id, email, display_name, role, is_active, school_id, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000002',
  'admin@school.edu',
  'System Admin',
  'admin',
  true,
  '00000000-0000-0000-0000-000000000001',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' AND email = 'admin@school.edu');

-- Boards
INSERT INTO boards (name, code)
SELECT name, code FROM (VALUES
  ('CBSE', 'CBSE'),
  ('ICSE', 'ICSE'),
  ('AP State Board', 'AP'),
  ('Telangana State Board', 'TS'),
  ('Cambridge IGCSE', 'CAMBRIDGE')
) AS b(name, code)
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE b.code = boards.code);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after the script to verify:
-- SELECT * FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT * FROM pg_proc WHERE proname IN ('increment_student_count','increment_completed_concepts','delete_textbook_cascade','pgvector_search') ORDER BY proname;
-- SELECT * FROM pg_policies ORDER BY tablename, policyname;
-- SELECT * FROM schools;
-- SELECT * FROM boards;
