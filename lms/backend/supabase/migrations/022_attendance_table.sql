-- Migration: 022_attendance_table.sql
-- Ensures the attendance table exists with all required columns.
-- Safe to run multiple times (all statements use IF NOT EXISTS / IF EXISTS guards).

-- Create attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'holiday')),
  marked_by UUID,
  note TEXT DEFAULT '',
  marked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  school_id UUID
);

-- Add missing columns if they were omitted in earlier schema versions
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS marked_by UUID;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance (class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON attendance (school_id);

-- Add foreign key constraints only if the referenced tables exist
-- (guards prevent failure when running in environments where these tables may not exist yet)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'attendance_student_id_fkey'
      AND table_name = 'attendance'
  ) THEN
    ALTER TABLE attendance
      ADD CONSTRAINT attendance_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Silently skip if users table doesn't exist
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'attendance_class_id_fkey'
      AND table_name = 'attendance'
  ) THEN
    ALTER TABLE attendance
      ADD CONSTRAINT attendance_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Silently skip if classes table doesn't exist
  NULL;
END $$;

-- Unique constraint to prevent duplicate attendance records per student per date
-- Required by exam.service.ts pattern (and attendance duplicate guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'uq_attendance_student_class_date'
      AND table_name = 'attendance'
  ) THEN
    ALTER TABLE attendance
      ADD CONSTRAINT uq_attendance_student_class_date
      UNIQUE (student_id, class_id, date);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Atomic student count increment function (used by user.service.ts Task 3)
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

-- Transactional textbook cascade delete function (used by textbook.service.ts Task 10)
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

-- Unique partial index on exam_attempts to prevent concurrent in-progress attempts (Task 11)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uk_exam_student_in_progress'
  ) THEN
    CREATE UNIQUE INDEX uk_exam_student_in_progress
      ON exam_attempts (exam_id, student_id)
      WHERE status = 'in_progress';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
