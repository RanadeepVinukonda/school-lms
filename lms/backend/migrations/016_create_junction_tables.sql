-- Junction tables for many-to-many relationships
-- All soft-deletable with status/deleted_at columns

DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS teacher_class_subject_assignments CASCADE;
DROP TABLE IF EXISTS class_subjects CASCADE;
DROP TABLE IF EXISTS class_teachers CASCADE;
DROP TABLE IF EXISTS student_class_enrollments CASCADE;

-- Student-class enrollments (replaces user.class_ids[] array)
CREATE TABLE IF NOT EXISTS student_class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id, academic_year)
);

-- Teacher-class assignments (replaces class.teacherIds[] array)
CREATE TABLE IF NOT EXISTS class_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary','assistant','substitute')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

-- Class-subject offerings (replaces class.subjectIds[] array)
CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id)
);

-- Teacher-class-subject assignments (replaces nosql_docs teacherClassSubject collection)
CREATE TABLE IF NOT EXISTS teacher_class_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id, subject_id)
);

-- Timetable (typed table replacing nosql_docs timetable collection)
CREATE TABLE IF NOT EXISTS timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  subject_id UUID,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  room TEXT NOT NULL DEFAULT '',
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, day, period)
);

-- Indexes for junction tables
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_class_enrollments(student_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON student_class_enrollments(class_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher ON class_teachers(teacher_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_class_teachers_class ON class_teachers(class_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tcsa_teacher ON teacher_class_subject_assignments(teacher_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tcsa_class ON teacher_class_subject_assignments(class_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id) WHERE status = 'active';
