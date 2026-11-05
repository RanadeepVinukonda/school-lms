-- Create the classes table (missing from initial schema)
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT '',
  academicYear TEXT NOT NULL DEFAULT '',
  roomNumber TEXT NOT NULL DEFAULT '',
  teacherIds TEXT[] NOT NULL DEFAULT '{}',
  subjectIds TEXT[] NOT NULL DEFAULT '{}',
  studentCount INTEGER NOT NULL DEFAULT 0,
  teacherCount INTEGER NOT NULL DEFAULT 0,
  maxStudents INTEGER NOT NULL DEFAULT 0,
  startDate TEXT,
  endDate TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Subjects table (also missing)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'core',
  creditHours INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  classId TEXT,
  teacherId TEXT,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT NOT NULL DEFAULT ''
);

-- Notifications table (missing)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  readAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table (missing)
CREATE TABLE IF NOT EXISTS auditLogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  targetId TEXT,
  targetType TEXT,
  targetName TEXT,
  performedBy TEXT NOT NULL,
  performedByName TEXT,
  performedByRole TEXT,
  oldValue JSONB,
  newValue JSONB,
  summary TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
