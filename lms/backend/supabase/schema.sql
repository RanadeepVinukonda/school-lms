-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users (mirrors Firebase Auth + Firestore user doc)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  phone_number TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  class_ids TEXT[] NOT NULL DEFAULT '{}',
  class_id TEXT,
  student_id TEXT,
  roll_no INTEGER,
  academic_year TEXT,
  children_ids TEXT[] NOT NULL DEFAULT '{}',
  gender TEXT,
  password TEXT,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Textbooks
CREATE TABLE IF NOT EXISTS textbooks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  subject_id UUID NOT NULL,
  class_id UUID NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  pdf_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  chapter_count INTEGER NOT NULL DEFAULT 0,
  total_concepts INTEGER NOT NULL DEFAULT 0,
  completed_concepts INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  logs TEXT[] NOT NULL DEFAULT '{}',
  processing_stage TEXT,
  processing_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chapters
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Concepts
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  notes TEXT,
  video_links TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Concept notes (enriched AI content + embedding)
CREATE TABLE IF NOT EXISTS concept_notes (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL UNIQUE REFERENCES concepts(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  key_points TEXT NOT NULL DEFAULT '',
  formulas TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '',
  learning_objectives TEXT NOT NULL DEFAULT '',
  embedding VECTOR(384),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Concept videos (youtube recommendations + embedding)
CREATE TABLE IF NOT EXISTS concept_videos (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT '',
  thumbnail TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL DEFAULT 0,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Concept questions
CREATE TABLE IF NOT EXISTS concept_questions (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  options TEXT[],
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  passage_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Concept resources
-- =========================================================================
-- Classes
-- =========================================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT,
  room TEXT,
  capacity INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  school_id UUID,
  student_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- Attendance
-- =========================================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'holiday')),
  marked_by UUID REFERENCES users(id),
  note TEXT DEFAULT '',
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_class_date ON attendance(student_id, class_id, date);

-- =========================================================================
-- Fee structures
-- =========================================================================
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date TIMESTAMPTZ,
  class_id UUID REFERENCES classes(id),
  academic_year TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_id ON fee_structures(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_academic_year ON fee_structures(academic_year);

-- =========================================================================
-- Fee payments
-- =========================================================================
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id),
  amount NUMERIC NOT NULL,
  school_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add student_count to classes if missing (table may already exist without it)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS student_count INTEGER DEFAULT 0 NOT NULL;
-- Add academic_year, class_id, description to fee_structures if missing
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS description TEXT;

-- =========================================================================
-- RPC: increment_student_count (used by user.service.ts)
-- =========================================================================
CREATE OR REPLACE FUNCTION increment_student_count(class_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE classes SET student_count = student_count + delta, updated_at = NOW()
  WHERE id = class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS concept_resources (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL DEFAULT 0,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Processing jobs (transient progress tracking)
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY,
  textbook_id UUID NOT NULL UNIQUE REFERENCES textbooks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT NOT NULL DEFAULT '',
  error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Raw pages (extracted PDF text)
CREATE TABLE IF NOT EXISTS raw_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  page_num INTEGER,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_textbooks_teacher_id ON textbooks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_textbooks_status ON textbooks(status);
CREATE INDEX IF NOT EXISTS idx_chapters_textbook_id ON chapters(textbook_id);
CREATE INDEX IF NOT EXISTS idx_concepts_chapter_id ON concepts(chapter_id);
CREATE INDEX IF NOT EXISTS idx_concepts_textbook_id ON concepts(textbook_id);
CREATE INDEX IF NOT EXISTS idx_concept_notes_concept_id ON concept_notes(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_videos_concept_id ON concept_videos(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_questions_concept_id ON concept_questions(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_resources_concept_id ON concept_resources(concept_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_textbook_id ON processing_jobs(textbook_id);
CREATE INDEX IF NOT EXISTS idx_raw_pages_textbook_id ON raw_pages(textbook_id);

-- pgvector indexes for similarity search
CREATE INDEX IF NOT EXISTS idx_concept_notes_embedding ON concept_notes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_concept_videos_embedding ON concept_videos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_concept_resources_embedding ON concept_resources USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Generic JSONB document store for non-pipeline collections (Firestore adapter)
CREATE TABLE IF NOT EXISTS firestore_docs (
  collection TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, doc_id)
);
CREATE INDEX IF NOT EXISTS idx_firestore_docs_collection ON firestore_docs(collection);

-- Add data JSONB column to typed tables for adapter compatibility (stores extra fields not in typed schema)
ALTER TABLE users ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE concept_notes ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE concept_videos ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE concept_questions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE concept_resources ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE raw_pages ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';

-- pgvector search function for concept videos
CREATE OR REPLACE FUNCTION pgvector_search(
  query_embedding VECTOR(384),
  match_threshold REAL DEFAULT 0.5,
  match_count INTEGER DEFAULT 5,
  input_concept_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  concept_id UUID,
  textbook_id UUID,
  chapter_id UUID,
  video_id TEXT,
  title TEXT,
  description TEXT,
  channel TEXT,
  thumbnail TEXT,
  duration TEXT,
  score REAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT cv.id, cv.concept_id, cv.textbook_id, cv.chapter_id,
         cv.video_id, cv.title, cv.description, cv.channel,
         cv.thumbnail, cv.duration,
         1 - (cv.embedding <=> query_embedding)::REAL AS score,
         cv.created_at
  FROM concept_videos cv
  WHERE cv.embedding IS NOT NULL
    AND (input_concept_id IS NULL OR cv.concept_id = input_concept_id)
    AND 1 - (cv.embedding <=> query_embedding) > match_threshold
  ORDER BY cv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
-- =========================================================================
-- SECURITY POLICIES (Row Level Security - RLS)
-- =========================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_pages ENABLE ROW LEVEL SECURITY;

-- Fallback default policies (Admins have full access to everything)
CREATE POLICY "Admins have full access to all tables" ON users FOR ALL USING (auth.role() = 'authenticated' AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Users Policy: Users can only read their own profile, or admins can read all
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (id = auth.uid());

-- Textbooks Policy: Teachers can read/write their own textbooks
CREATE POLICY "Teachers can manage own textbooks" ON textbooks FOR ALL USING (auth.uid() = teacher_id);
-- Textbooks Policy: Students can read textbooks for their class
CREATE POLICY "Students can read assigned textbooks" ON textbooks FOR SELECT USING (class_id::text IN (SELECT unnest(class_ids) FROM users WHERE id = auth.uid()));

-- Add similar read policies for chapters, concepts, questions, videos
CREATE POLICY "Public read for concepts if textbook is visible" ON concepts FOR SELECT USING (true);
CREATE POLICY "Public read for chapters if textbook is visible" ON chapters FOR SELECT USING (true);
CREATE POLICY "Public read for concept questions" ON concept_questions FOR SELECT USING (true);
CREATE POLICY "Public read for concept videos" ON concept_videos FOR SELECT USING (true);
CREATE POLICY "Public read for concept notes" ON concept_notes FOR SELECT USING (true);
CREATE POLICY "Public read for concept resources" ON concept_resources FOR SELECT USING (true);

-- =========================================================================
-- UTILITY FUNCTIONS
-- =========================================================================
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
