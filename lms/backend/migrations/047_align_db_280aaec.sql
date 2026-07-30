-- Migration 047: Align deployed DB schema with application code at 280aaec
-- Safe to run multiple times (all IF NOT EXISTS)

-- =========================================================================
-- Part 1: 040 - Academic year columns
-- =========================================================================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_attendance_academic_year ON attendance (academic_year);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS "academicYear" TEXT DEFAULT '';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';

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

ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_textbooks_academic_year ON textbooks (academic_year);

ALTER TABLE grades ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_grades_academic_year ON grades (academic_year);

ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_exams_academic_year ON exams (academic_year);

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_assignments_academic_year ON assignments (academic_year);

ALTER TABLE timetable ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_timetable_academic_year ON timetable (academic_year);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_subjects_academic_year ON subjects (academic_year);

-- =========================================================================
-- Part 2: 046 - Missing tables and columns
-- =========================================================================

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID,
  subject_id UUID,
  class_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  role TEXT NOT NULL DEFAULT 'student',
  academic_year TEXT,
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject_id ON enrollments(subject_id);

-- Grades
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID,
  subject_id UUID,
  assignment_id UUID,
  exam_id UUID,
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 100,
  letter_grade TEXT,
  comments TEXT,
  semester TEXT,
  academic_year TEXT,
  academic_year_col TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  school_id UUID
);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_assignment_id ON grades(assignment_id);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  attachments JSONB DEFAULT '[]',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'late')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  grade NUMERIC,
  feedback TEXT,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  school_id UUID
);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);

-- Corrections
CREATE TABLE IF NOT EXISTS corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  question_marks JSONB DEFAULT '{}',
  total_marks NUMERIC DEFAULT 0,
  overall_feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'corrected', 'reviewed')),
  corrected_at TIMESTAMPTZ,
  school_id UUID
);
CREATE INDEX IF NOT EXISTS idx_corrections_exam_id ON corrections(exam_id);
CREATE INDEX IF NOT EXISTS idx_corrections_student_id ON corrections(student_id);

-- QuizV2
CREATE TABLE IF NOT EXISTS quizv2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  lesson_id UUID,
  chapter_id UUID,
  textbook_id UUID,
  subject_id UUID,
  subject_name TEXT,
  time_limit INTEGER,
  questions JSONB DEFAULT '[]',
  question_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quizv2_chapter_id ON quizv2(chapter_id);
CREATE INDEX IF NOT EXISTS idx_quizv2_subject_id ON quizv2(subject_id);
CREATE INDEX IF NOT EXISTS idx_quizv2_textbook_id ON quizv2(textbook_id);

-- =========================================================================
-- Part 3: 046 - Missing columns on existing tables
-- =========================================================================

-- concept_releases
ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS notes_released BOOLEAN DEFAULT false;
ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS lecture_released BOOLEAN DEFAULT false;
ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS test_released BOOLEAN DEFAULT false;
ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS school_id UUID;

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_seen BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instance_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- textbooks
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS school_id UUID;

-- chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS school_id UUID;

-- concepts
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS school_id UUID;

-- concept_notes, concept_videos, concept_questions, concept_resources
ALTER TABLE concept_notes ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE concept_videos ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE concept_questions ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE concept_resources ADD COLUMN IF NOT EXISTS school_id UUID;

-- classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS grade INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_ids TEXT[] DEFAULT '{}';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS subject_ids TEXT[] DEFAULT '{}';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_count INTEGER DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS credit_hours INTEGER;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS teacher_id UUID;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id UUID;

-- assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS chapter_id UUID;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS textbook_id UUID;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS lesson_id UUID;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN DEFAULT true;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS late_penalty_percent NUMERIC DEFAULT 0;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS passing_grade NUMERIC DEFAULT 50;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS school_id UUID;

-- exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_points NUMERIC DEFAULT 100;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS passing_score NUMERIC DEFAULT 50;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_proctored BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_results BOOLEAN DEFAULT true;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS school_id UUID;

-- notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- timetable
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS school_id UUID;

-- lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS chapter_id UUID;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS quiz_id UUID;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS assignment_id UUID;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS school_id UUID;

-- quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS lesson_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS chapter_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS textbook_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]';
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS school_id UUID;

-- =========================================================================
-- Part 4: 013 - student_count column
-- =========================================================================
ALTER TABLE classes ADD COLUMN IF NOT EXISTS student_count INTEGER DEFAULT 0 NOT NULL;

CREATE OR REPLACE FUNCTION increment_student_count(class_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE classes SET student_count = student_count + delta, updated_at = NOW()
  WHERE id = class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- Track this migration
-- =========================================================================
INSERT INTO _migrations (filename, checksum, duration_ms)
SELECT '047_align_db_280aaec.sql', 'sha256-placeholder', 0
WHERE NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '047_align_db_280aaec.sql');
