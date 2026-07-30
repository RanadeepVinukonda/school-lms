-- 053 — Close RLS gaps: concept_releases, concept_progress, enrollment table
-- Frontend accesses these via direct Supabase from dataService.ts / textbookService.ts / uploadStore.ts

-- ── 1. Create enrollment table (frontend expects this, referenced as 'enrollment') ──
CREATE TABLE IF NOT EXISTS enrollment (
  id TEXT PRIMARY KEY,
  "studentId" UUID NOT NULL,
  "courseId" UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  progress REAL NOT NULL DEFAULT 0,
  "enrolledAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_student_id ON enrollment("studentId");
CREATE INDEX IF NOT EXISTS idx_enrollment_course_id ON enrollment("courseId");

-- ── 2. RLS on enrollment ──
DO $$ BEGIN
  ALTER TABLE enrollment ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_enrollment') THEN
    CREATE POLICY authenticated_all_enrollment ON enrollment FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 3. RLS on concept_releases (exists from 022, no RLS yet) ──
DO $$ BEGIN
  ALTER TABLE concept_releases ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_concept_releases') THEN
    CREATE POLICY authenticated_all_concept_releases ON concept_releases FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 4. RLS on concept_progress (used by frontend textbookService, may or may not exist) ──
DO $$ BEGIN
  ALTER TABLE concept_progress ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_concept_progress') THEN
    CREATE POLICY authenticated_all_concept_progress ON concept_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 5. RLS on firestore_docs (backing table for grades/enrollments views) ──
DO $$ BEGIN
  ALTER TABLE firestore_docs ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_firestore_docs') THEN
    CREATE POLICY authenticated_all_firestore_docs ON firestore_docs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
