-- 020_meta_migration.sql
-- Create physical tables for view-backed collections that are referenced as tables.
-- These were previously only views over firestore_docs, but migrations (001_multi_tenant)
-- need them as real tables for ALTER TABLE ADD COLUMN, FK references, etc.

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY,
  textbook_id UUID,
  chapter_id UUID,
  title TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  duration REAL DEFAULT 0,
  ordinal INTEGER DEFAULT 0,
  quiz_id TEXT,
  assignment_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  subject_id UUID,
  subject_name TEXT NOT NULL DEFAULT '',
  chapter_id UUID,
  textbook_id UUID,
  lesson_id UUID,
  course_id TEXT,
  due_date TEXT,
  points REAL DEFAULT 0,
  max_attempts INTEGER DEFAULT 0,
  allow_late_submission BOOLEAN DEFAULT false,
  late_penalty_percent REAL DEFAULT 0,
  passing_grade REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  submission_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  lesson_id UUID,
  chapter_id UUID,
  textbook_id UUID,
  subject_id UUID,
  subject_name TEXT NOT NULL DEFAULT '',
  time_limit INTEGER DEFAULT 0,
  questions JSONB DEFAULT '[]'::jsonb,
  question_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  subject_id UUID,
  subject_name TEXT NOT NULL DEFAULT '',
  course_id TEXT,
  duration INTEGER DEFAULT 0,
  total_points REAL DEFAULT 0,
  passing_score REAL DEFAULT 0,
  questions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TEXT,
  end_date TEXT,
  is_proctored BOOLEAN DEFAULT false,
  shuffle_questions BOOLEAN DEFAULT false,
  show_results BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
