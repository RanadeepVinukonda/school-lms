-- Migration 050: Comprehensive schema fix — handles both real tables and document-store views
-- Replaces 047 (will fail on views), 048 (fails on timetable which is a table), 049 (admin user)
-- Run this in Supabase SQL Editor. It's idempotent — safe to run multiple times.

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 1: Fix real tables — add missing columns the backend queries
-- ══════════════════════════════════════════════════════════════════════════════

-- 1a. classes — ensure all snake_case columns exist
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT '';
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS room_number TEXT DEFAULT '';
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS teacher_ids TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS subject_ids TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS teacher_count INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS end_date TEXT;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 1b. timetable — ensure school_id exists (table already has snake_case columns)
ALTER TABLE IF EXISTS timetable ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS timetable ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '';

-- 1c. Additional tables the backend queries with specific columns
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS credit_hours INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS exams ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS exams ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE IF EXISTS exams ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS exams ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS exams ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE IF EXISTS exams ADD COLUMN IF NOT EXISTS end_date TEXT;
ALTER TABLE IF EXISTS exams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS quizzes ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS quizzes ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE IF EXISTS quizzes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS lessons ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS lessons ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE IF EXISTS lessons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS submissions ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS submissions ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE IF EXISTS submissions ADD COLUMN IF NOT EXISTS student_id UUID;

ALTER TABLE IF EXISTS enrollments ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE IF EXISTS enrollments ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE IF EXISTS enrollments ADD COLUMN IF NOT EXISTS course_id UUID;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 2: Rebuild document-store views (skip if name is a real table)
-- Uses $view$ tag for function bodies (different from outer $$).
-- Each view block checks if the relation is NOT a table before creating.
-- ══════════════════════════════════════════════════════════════════════════════

-- | grades |
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grades' AND relkind = 'r') THEN
    DROP VIEW IF EXISTS grades CASCADE;
    CREATE OR REPLACE VIEW grades AS
    SELECT doc_id AS id,
      data->>'studentId' AS "studentId", data->>'student_id' AS "student_id",
      data->>'courseId' AS "courseId", data->>'course_id' AS "course_id",
      data->>'assignmentId' AS "assignmentId", data->>'assignment_id' AS "assignment_id",
      (data->>'score')::numeric AS "score",
      (data->>'maxScore')::numeric AS "maxScore", (data->>'max_score')::numeric AS "max_score",
      data->>'letterGrade' AS "letterGrade", data->>'letter_grade' AS "letter_grade",
      data->>'comments' AS "comments", data->>'date' AS "date",
      data->>'schoolId' AS "schoolId", data->>'school_id' AS "school_id",
      data->>'classId' AS "classId", data->>'class_id' AS "class_id",
      data->>'subjectId' AS "subjectId", data->>'subject_id' AS "subject_id",
      (data->>'totalPoints')::numeric AS "totalPoints", (data->>'total_points')::numeric AS "total_points",
      data->>'academicYear' AS "academicYear", data->>'academic_year' AS "academic_year",
      data->>'term' AS "term", data->>'feedback' AS "feedback",
      data->>'gradedBy' AS "gradedBy", data->>'graded_by' AS "graded_by",
      (data->>'percentage')::numeric AS "percentage",
      data->>'updatedAt' AS "updatedAt", data->>'updated_at' AS "updated_at",
      data->>'examDate' AS "examDate", data->>'exam_date' AS "exam_date",
      data->>'semester' AS "semester",
      data->>'createdAt' AS "createdAt", data->>'created_at' AS "created_at"
    FROM firestore_docs WHERE collection = 'grades';

    CREATE OR REPLACE FUNCTION grades_upsert() RETURNS TRIGGER AS $f$
    BEGIN
      IF NEW.id IS NULL THEN NEW.id := gen_random_uuid()::text; END IF;
      INSERT INTO firestore_docs (collection, doc_id, data)
      VALUES ('grades', NEW.id, row_to_json(NEW)::jsonb - 'id')
      ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_grades_upsert
      INSTEAD OF INSERT OR UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION grades_upsert();

    CREATE OR REPLACE FUNCTION grades_delete() RETURNS TRIGGER AS $f$
    BEGIN
      DELETE FROM firestore_docs WHERE collection = 'grades' AND doc_id = OLD.id;
      RETURN OLD;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_grades_delete
      INSTEAD OF DELETE ON grades FOR EACH ROW EXECUTE FUNCTION grades_delete();

    UPDATE firestore_docs SET data = data ||
      jsonb_build_object(
        'student_id', data->>'studentId', 'course_id', data->>'courseId',
        'assignment_id', data->>'assignmentId', 'max_score', data->>'maxScore',
        'letter_grade', data->>'letterGrade', 'school_id', data->>'schoolId',
        'class_id', data->>'classId', 'subject_id', data->>'subjectId',
        'total_points', data->>'totalPoints', 'academic_year', data->>'academicYear',
        'graded_by', data->>'gradedBy', 'exam_date', data->>'examDate',
        'updated_at', data->>'updatedAt', 'created_at', data->>'createdAt'
      )
    WHERE collection = 'grades' AND data->>'studentId' IS NOT NULL AND data->>'student_id' IS NULL;
  END IF;
END $$;

-- | enrollments |
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'enrollments' AND relkind = 'r') THEN
    DROP VIEW IF EXISTS enrollments CASCADE;
    CREATE OR REPLACE VIEW enrollments AS
    SELECT doc_id AS id,
      data->>'studentId' AS "studentId", data->>'student_id' AS "student_id",
      data->>'courseId' AS "courseId", data->>'course_id' AS "course_id",
      data->>'status' AS "status", data->>'role' AS "role",
      data->>'schoolId' AS "schoolId", data->>'school_id' AS "school_id",
      data->>'subjectId' AS "subjectId", data->>'subject_id' AS "subject_id",
      data->>'classId' AS "classId", data->>'class_id' AS "class_id",
      data->>'academicYear' AS "academicYear", data->>'academic_year' AS "academic_year"
    FROM firestore_docs WHERE collection = 'enrollments';

    CREATE OR REPLACE FUNCTION enrollments_upsert() RETURNS TRIGGER AS $f$
    BEGIN
      IF NEW.id IS NULL THEN NEW.id := gen_random_uuid()::text; END IF;
      INSERT INTO firestore_docs (collection, doc_id, data)
      VALUES ('enrollments', NEW.id, row_to_json(NEW)::jsonb - 'id')
      ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_enrollments_upsert
      INSTEAD OF INSERT OR UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION enrollments_upsert();

    CREATE OR REPLACE FUNCTION enrollments_delete() RETURNS TRIGGER AS $f$
    BEGIN
      DELETE FROM firestore_docs WHERE collection = 'enrollments' AND doc_id = OLD.id;
      RETURN OLD;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_enrollments_delete
      INSTEAD OF DELETE ON enrollments FOR EACH ROW EXECUTE FUNCTION enrollments_delete();

    UPDATE firestore_docs SET data = data ||
      jsonb_build_object(
        'student_id', data->>'studentId', 'course_id', data->>'courseId',
        'school_id', data->>'schoolId', 'subject_id', data->>'subjectId',
        'class_id', data->>'classId', 'academic_year', data->>'academicYear'
      )
    WHERE collection = 'enrollments' AND data->>'studentId' IS NOT NULL AND data->>'student_id' IS NULL;
  END IF;
END $$;

-- | submissions |
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'submissions' AND relkind = 'r') THEN
    DROP VIEW IF EXISTS submissions CASCADE;
    CREATE OR REPLACE VIEW submissions AS
    SELECT doc_id AS id,
      data->>'assignmentId' AS "assignmentId", data->>'assignment_id' AS "assignment_id",
      data->>'studentId' AS "studentId", data->>'student_id' AS "student_id",
      data->>'content' AS "content", data->'attachments' AS "attachments",
      data->>'submittedAt' AS "submittedAt", data->>'submitted_at' AS "submitted_at",
      data->>'status' AS "status",
      (data->>'attemptNumber')::numeric AS "attemptNumber", (data->>'attempt_number')::numeric AS "attempt_number",
      (data->>'grade')::numeric AS "grade", data->>'feedback' AS "feedback",
      data->>'gradedBy' AS "gradedBy", data->>'graded_by' AS "graded_by",
      data->>'gradedAt' AS "gradedAt", data->>'graded_at' AS "graded_at",
      data->>'schoolId' AS "schoolId", data->>'school_id' AS "school_id"
    FROM firestore_docs WHERE collection = 'submissions';

    CREATE OR REPLACE FUNCTION submissions_upsert() RETURNS TRIGGER AS $f$
    BEGIN
      IF NEW.id IS NULL THEN NEW.id := gen_random_uuid()::text; END IF;
      INSERT INTO firestore_docs (collection, doc_id, data)
      VALUES ('submissions', NEW.id, row_to_json(NEW)::jsonb - 'id')
      ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_submissions_upsert
      INSTEAD OF INSERT OR UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION submissions_upsert();

    CREATE OR REPLACE FUNCTION submissions_delete() RETURNS TRIGGER AS $f$
    BEGIN
      DELETE FROM firestore_docs WHERE collection = 'submissions' AND doc_id = OLD.id;
      RETURN OLD;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_submissions_delete
      INSTEAD OF DELETE ON submissions FOR EACH ROW EXECUTE FUNCTION submissions_delete();
  END IF;
END $$;

-- | corrections |
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'corrections' AND relkind = 'r') THEN
    DROP VIEW IF EXISTS corrections CASCADE;
    CREATE OR REPLACE VIEW corrections AS
    SELECT doc_id AS id,
      data->>'examId' AS "examId", data->>'exam_id' AS "exam_id",
      data->>'studentId' AS "studentId", data->>'student_id' AS "student_id",
      data->>'teacherId' AS "teacherId", data->>'teacher_id' AS "teacher_id",
      data->'questionMarks' AS "questionMarks", data->>'totalMarks' AS "totalMarks",
      data->>'overallFeedback' AS "overallFeedback", data->>'status' AS "status",
      data->>'correctedAt' AS "correctedAt", data->>'corrected_at' AS "corrected_at"
    FROM firestore_docs WHERE collection = 'corrections';

    CREATE OR REPLACE FUNCTION corrections_upsert() RETURNS TRIGGER AS $f$
    BEGIN
      IF NEW.id IS NULL THEN NEW.id := gen_random_uuid()::text; END IF;
      INSERT INTO firestore_docs (collection, doc_id, data)
      VALUES ('corrections', NEW.id, row_to_json(NEW)::jsonb - 'id')
      ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_corrections_upsert
      INSTEAD OF INSERT OR UPDATE ON corrections FOR EACH ROW EXECUTE FUNCTION corrections_upsert();

    CREATE OR REPLACE FUNCTION corrections_delete() RETURNS TRIGGER AS $f$
    BEGIN
      DELETE FROM firestore_docs WHERE collection = 'corrections' AND doc_id = OLD.id;
      RETURN OLD;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_corrections_delete
      INSTEAD OF DELETE ON corrections FOR EACH ROW EXECUTE FUNCTION corrections_delete();
  END IF;
END $$;

-- | quizV2 |
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'quizv2' AND relkind = 'r') THEN
    DROP VIEW IF EXISTS quizV2 CASCADE;
    CREATE OR REPLACE VIEW quizV2 AS
    SELECT doc_id AS id,
      data->>'title' AS "title", data->>'description' AS "description",
      data->>'lessonId' AS "lessonId", data->>'lesson_id' AS "lesson_id",
      data->>'chapterId' AS "chapterId", data->>'chapter_id' AS "chapter_id",
      data->>'textbookId' AS "textbookId", data->>'textbook_id' AS "textbook_id",
      data->>'subjectId' AS "subjectId", data->>'subject_id' AS "subject_id",
      data->>'subjectName' AS "subjectName", data->>'subject_name' AS "subject_name",
      (data->>'timeLimit')::numeric AS "timeLimit",
      data->'questions' AS "questions",
      (data->>'questionCount')::numeric AS "questionCount",
      data->>'status' AS "status"
    FROM firestore_docs WHERE collection = 'quizV2';

    CREATE OR REPLACE FUNCTION quizV2_upsert() RETURNS TRIGGER AS $f$
    BEGIN
      IF NEW.id IS NULL THEN NEW.id := gen_random_uuid()::text; END IF;
      INSERT INTO firestore_docs (collection, doc_id, data)
      VALUES ('quizV2', NEW.id, row_to_json(NEW)::jsonb - 'id')
      ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_quizV2_upsert
      INSTEAD OF INSERT OR UPDATE ON quizV2 FOR EACH ROW EXECUTE FUNCTION quizV2_upsert();

    CREATE OR REPLACE FUNCTION quizV2_delete() RETURNS TRIGGER AS $f$
    BEGIN
      DELETE FROM firestore_docs WHERE collection = 'quizV2' AND doc_id = OLD.id;
      RETURN OLD;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER trg_quizV2_delete
      INSTEAD OF DELETE ON quizV2 FOR EACH ROW EXECUTE FUNCTION quizV2_delete();
  END IF;
END $$;

-- | auditLogs | (may be a real table from migration 026 — skip if so)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'auditlogs' AND relkind = 'r') THEN
    DROP VIEW IF EXISTS "auditLogs" CASCADE;
    CREATE OR REPLACE VIEW "auditLogs" AS
    SELECT doc_id AS id,
      data->>'action' AS "action", data->>'targetId' AS "targetId",
      data->>'targetType' AS "targetType", data->>'targetName' AS "targetName",
      data->>'performedBy' AS "performedBy", data->>'performedByName' AS "performedByName",
      data->>'performedByRole' AS "performedByRole",
      data->'oldValue' AS "oldValue", data->'newValue' AS "newValue",
      data->>'summary' AS "summary", data->>'timestamp' AS "timestamp"
    FROM firestore_docs WHERE collection = 'auditLogs';

    CREATE OR REPLACE FUNCTION "auditLogs_upsert"() RETURNS TRIGGER AS $f$
    BEGIN
      IF NEW.id IS NULL THEN NEW.id := gen_random_uuid()::text; END IF;
      INSERT INTO firestore_docs (collection, doc_id, data)
      VALUES ('auditLogs', NEW.id, row_to_json(NEW)::jsonb - 'id')
      ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER "trg_auditLogs_upsert"
      INSTEAD OF INSERT OR UPDATE ON "auditLogs" FOR EACH ROW EXECUTE FUNCTION "auditLogs_upsert"();

    CREATE OR REPLACE FUNCTION "auditLogs_delete"() RETURNS TRIGGER AS $f$
    BEGIN
      DELETE FROM firestore_docs WHERE collection = 'auditLogs' AND doc_id = OLD.id;
      RETURN OLD;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE OR REPLACE TRIGGER "trg_auditLogs_delete"
      INSTEAD OF DELETE ON "auditLogs" FOR EACH ROW EXECUTE FUNCTION "auditLogs_delete"();
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 3: Fix role constraint and create admin user
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'super_admin', 'teacher', 'student', 'parent'));

DO $$
DECLARE
  _uid UUID := gen_random_uuid();
  _now TIMESTAMPTZ := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@school.edu') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      role, aud, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      _uid, '00000000-0000-0000-0000-000000000000',
      'admin@school.edu',
      crypt('admin123', gen_salt('bf')),
      _now,
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Admin"}',
      _now, _now,
      'authenticated', 'authenticated',
      '', '', true
    );

    INSERT INTO users (
      id, email, display_name, role, is_active,
      phone_number, photo_url, class_ids, created_at, updated_at
    ) VALUES (
      _uid, 'admin@school.edu', 'Admin', 'super_admin', true,
      '', '', '{}', _now, _now
    );
    RAISE NOTICE 'Admin user created: admin@school.edu / admin123';
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 4: Ensure default school exists (for tenant context)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO schools (id, name, subdomain, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default School', 'default', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 5: Track migration
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO _migrations (filename, checksum, duration_ms)
SELECT '050_comprehensive_fix.sql', 'sha256-placeholder', 0
WHERE NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '050_comprehensive_fix.sql');
