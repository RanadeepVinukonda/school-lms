-- 001_multi_tenant.sql
-- Multi-tenant SaaS migration

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  student_limit INT DEFAULT 100,
  teacher_limit INT DEFAULT 10,
  features JSONB DEFAULT '{}',
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  revoked_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_mfa (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add school_id to entity tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE concept_notes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE concept_videos ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE concept_questions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE concept_resources ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Backfill with default school
INSERT INTO schools (id, name, subdomain, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default School', 'default', 'enterprise')
ON CONFLICT (id) DO NOTHING;

UPDATE users SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE subjects SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE classes SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE textbooks SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE chapters SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE concepts SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE concept_notes SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE concept_videos SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE concept_questions SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE concept_resources SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE lessons SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE assignments SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE quizzes SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE exams SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE notifications SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE timetable SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE concept_releases SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE users ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE subjects ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE classes ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE textbooks ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE lessons ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE quizzes ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE exams ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN school_id SET NOT NULL;

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY school_isolation ON schools
  FOR ALL USING (id = (auth.jwt() ->> 'school_id')::UUID);

CREATE POLICY subscription_isolation ON subscriptions
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_subjects_school_id ON subjects(school_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_textbooks_school_id ON textbooks(school_id);
CREATE INDEX idx_lessons_school_id ON lessons(school_id);
CREATE INDEX idx_assignments_school_id ON assignments(school_id);
CREATE INDEX idx_subscriptions_school_id ON subscriptions(school_id);
