-- Migration 040: Add academic_year columns to tables that are missing them
-- This enables academic year data isolation across the entire system.
-- Uses IF NOT EXISTS guards so it's safe to run multiple times.

-- 1. attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_attendance_academic_year ON attendance (academic_year);

-- 2. classes (already has academicYear TEXT from migration 026)
-- Add snake_case alias for consistency, but keep camelCase as the canonical column
ALTER TABLE classes ADD COLUMN IF NOT EXISTS "academicYear" TEXT DEFAULT '';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';

-- Sync the two columns (both should stay in sync)
CREATE OR REPLACE FUNCTION sync_classes_academic_year()
RETURNS trigger AS $$
BEGIN
  NEW.academic_year := COALESCE(NEW."academicYear", NEW.academic_year, '');
  NEW."academicYear" := NEW.academic_year;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_classes_academic_year_sync ON classes;
CREATE TRIGGER trg_classes_academic_year_sync
  BEFORE INSERT OR UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION sync_classes_academic_year();

-- 3. textbooks
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_textbooks_academic_year ON textbooks (academic_year);

-- 4. grades
ALTER TABLE grades ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_grades_academic_year ON grades (academic_year);

-- 5. exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_exams_academic_year ON exams (academic_year);

-- 6. assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_assignments_academic_year ON assignments (academic_year);

-- 7. timetable
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_timetable_academic_year ON timetable (academic_year);

-- 8. subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_subjects_academic_year ON subjects (academic_year);

-- Standardize naming: ensure all tables have both camelCase and snake_case aliases
-- for backward compatibility with existing code that uses either convention.
-- The snake_case column (academic_year) is the canonical one going forward.
