-- 052 — Enable RLS on all direct-Supabase tables + create audit_logs table
-- Fixes 403 (RLS blocked) and 404 (audit_logs table missing) on admin portal

-- ── 1. Create audit_logs table (frontend uses this name, DB had auditlogs) ──
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  target_name TEXT,
  performed_by TEXT NOT NULL,
  performed_by_name TEXT,
  performed_by_role TEXT,
  old_value JSONB,
  new_value JSONB,
  summary TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. RLS helper: allow all for authenticated users ──
DO $$ BEGIN
  -- audit_logs
  ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_audit_logs') THEN
    CREATE POLICY authenticated_all_audit_logs ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Enable RLS and add policies for tables used by frontend dataService.ts
DO $$ BEGIN
  ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_classes') THEN
    CREATE POLICY authenticated_all_classes ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_subjects') THEN
    CREATE POLICY authenticated_all_subjects ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_timetable') THEN
    CREATE POLICY authenticated_all_timetable ON timetable FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_notifications') THEN
    CREATE POLICY authenticated_all_notifications ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_exams') THEN
    CREATE POLICY authenticated_all_exams ON exams FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_assignments') THEN
    CREATE POLICY authenticated_all_assignments ON assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_quizzes') THEN
    CREATE POLICY authenticated_all_quizzes ON quizzes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_lessons') THEN
    CREATE POLICY authenticated_all_lessons ON lessons FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_textbooks') THEN
    CREATE POLICY authenticated_all_textbooks ON textbooks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_submissions') THEN
    CREATE POLICY authenticated_all_submissions ON submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_corrections') THEN
    CREATE POLICY authenticated_all_corrections ON corrections FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_users') THEN
    CREATE POLICY authenticated_all_users ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
