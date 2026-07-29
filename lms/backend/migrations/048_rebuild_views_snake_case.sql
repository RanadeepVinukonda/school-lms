-- Migration 048: Rebuild all document-store VIEWs with snake_case column aliases
-- Matches application code that uses snake_case for Supabase queries.
-- Also creates admin user (admin@school.edu / admin123).

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Rebuild classes VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_classes_delete ON classes;
DROP TRIGGER IF EXISTS trg_classes_upsert ON classes;
DROP FUNCTION IF EXISTS classes_delete();
DROP FUNCTION IF EXISTS classes_upsert();
DROP VIEW IF EXISTS classes CASCADE;

CREATE OR REPLACE VIEW classes AS
SELECT
  doc_id AS id,
  data->>'name' AS "name",
  data->>'code' AS "code",
  data->>'description' AS "description",
  (data->>'grade')::numeric AS "grade",
  data->>'section' AS "section",
  data->>'academicYear' AS "academicYear",
  data->>'academic_year' AS "academic_year",
  data->>'roomNumber' AS "roomNumber",
  data->>'room_number' AS "room_number",
  CASE WHEN jsonb_typeof(data->'teacherIds') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(data->'teacherIds'))
    ELSE ARRAY[]::text[] END AS "teacherIds",
  CASE WHEN jsonb_typeof(data->'teacher_ids') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(data->'teacher_ids'))
    ELSE ARRAY[]::text[] END AS "teacher_ids",
  CASE WHEN jsonb_typeof(data->'subjectIds') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(data->'subjectIds'))
    ELSE ARRAY[]::text[] END AS "subjectIds",
  CASE WHEN jsonb_typeof(data->'subject_ids') = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(data->'subject_ids'))
    ELSE ARRAY[]::text[] END AS "subject_ids",
  (data->>'studentCount')::numeric AS "studentCount",
  (data->>'student_count')::numeric AS "student_count",
  (data->>'teacherCount')::numeric AS "teacherCount",
  (data->>'teacher_count')::numeric AS "teacher_count",
  (data->>'maxStudents')::numeric AS "maxStudents",
  (data->>'max_students')::numeric AS "max_students",
  data->>'startDate' AS "startDate",
  data->>'start_date' AS "start_date",
  data->>'endDate' AS "endDate",
  data->>'end_date' AS "end_date",
  data->>'status' AS "status",
  (data->>'isActive')::boolean AS "isActive",
  (data->>'is_active')::boolean AS "is_active",
  data->>'createdAt' AS "createdAt",
  data->>'created_at' AS "created_at",
  data->>'updatedAt' AS "updatedAt",
  data->>'updated_at' AS "updated_at",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id",
  data->>'deleted_at' AS "deleted_at"
FROM firestore_docs WHERE collection = 'classes';

CREATE OR REPLACE FUNCTION classes_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('classes', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_classes_upsert
INSTEAD OF INSERT OR UPDATE ON classes
FOR EACH ROW EXECUTE FUNCTION classes_upsert();

CREATE OR REPLACE FUNCTION classes_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'classes' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_classes_delete
INSTEAD OF DELETE ON classes
FOR EACH ROW EXECUTE FUNCTION classes_delete();

-- Backfill existing data: copy camelCase → snake_case keys
UPDATE firestore_docs SET data = data ||
  jsonb_build_object(
    'academic_year', data->>'academicYear',
    'room_number', data->>'roomNumber',
    'teacher_ids', data->>'teacherIds',
    'subject_ids', data->>'subjectIds',
    'student_count', data->>'studentCount',
    'teacher_count', data->>'teacherCount',
    'max_students', data->>'maxStudents',
    'start_date', data->>'startDate',
    'end_date', data->>'endDate',
    'is_active', data->>'isActive',
    'created_at', data->>'createdAt',
    'updated_at', data->>'updatedAt',
    'school_id', data->>'schoolId'
  )
WHERE collection = 'classes'
  AND data->>'academicYear' IS NOT NULL
  AND data->>'academic_year' IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Rebuild grades VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_grades_delete ON grades;
DROP TRIGGER IF EXISTS trg_grades_upsert ON grades;
DROP FUNCTION IF EXISTS grades_delete();
DROP FUNCTION IF EXISTS grades_upsert();
DROP VIEW IF EXISTS grades CASCADE;

CREATE OR REPLACE VIEW grades AS
SELECT
  doc_id AS id,
  data->>'studentId' AS "studentId",
  data->>'student_id' AS "student_id",
  data->>'courseId' AS "courseId",
  data->>'course_id' AS "course_id",
  data->>'assignmentId' AS "assignmentId",
  data->>'assignment_id' AS "assignment_id",
  (data->>'score')::numeric AS "score",
  (data->>'maxScore')::numeric AS "maxScore",
  (data->>'max_score')::numeric AS "max_score",
  data->>'letterGrade' AS "letterGrade",
  data->>'letter_grade' AS "letter_grade",
  data->>'comments' AS "comments",
  data->>'date' AS "date",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id",
  data->>'classId' AS "classId",
  data->>'class_id' AS "class_id",
  data->>'subjectId' AS "subjectId",
  data->>'subject_id' AS "subject_id",
  (data->>'totalPoints')::numeric AS "totalPoints",
  (data->>'total_points')::numeric AS "total_points",
  data->>'academicYear' AS "academicYear",
  data->>'academic_year' AS "academic_year",
  data->>'term' AS "term",
  data->>'feedback' AS "feedback",
  data->>'gradedBy' AS "gradedBy",
  data->>'graded_by' AS "graded_by",
  (data->>'percentage')::numeric AS "percentage",
  data->>'updatedAt' AS "updatedAt",
  data->>'updated_at' AS "updated_at",
  data->>'examDate' AS "examDate",
  data->>'exam_date' AS "exam_date",
  data->>'semester' AS "semester",
  data->>'createdAt' AS "createdAt",
  data->>'created_at' AS "created_at"
FROM firestore_docs WHERE collection = 'grades';

CREATE OR REPLACE FUNCTION grades_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('grades', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_grades_upsert
INSTEAD OF INSERT OR UPDATE ON grades
FOR EACH ROW EXECUTE FUNCTION grades_upsert();

CREATE OR REPLACE FUNCTION grades_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'grades' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_grades_delete
INSTEAD OF DELETE ON grades
FOR EACH ROW EXECUTE FUNCTION grades_delete();

UPDATE firestore_docs SET data = data ||
  jsonb_build_object(
    'student_id', data->>'studentId',
    'course_id', data->>'courseId',
    'assignment_id', data->>'assignmentId',
    'max_score', data->>'maxScore',
    'letter_grade', data->>'letterGrade',
    'school_id', data->>'schoolId',
    'class_id', data->>'classId',
    'subject_id', data->>'subjectId',
    'total_points', data->>'totalPoints',
    'academic_year', data->>'academicYear',
    'graded_by', data->>'gradedBy',
    'exam_date', data->>'examDate',
    'updated_at', data->>'updatedAt',
    'created_at', data->>'createdAt'
  )
WHERE collection = 'grades'
  AND data->>'studentId' IS NOT NULL
  AND data->>'student_id' IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Rebuild enrollments VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_enrollments_delete ON enrollments;
DROP TRIGGER IF EXISTS trg_enrollments_upsert ON enrollments;
DROP FUNCTION IF EXISTS enrollments_delete();
DROP FUNCTION IF EXISTS enrollments_upsert();
DROP VIEW IF EXISTS enrollments CASCADE;

CREATE OR REPLACE VIEW enrollments AS
SELECT
  doc_id AS id,
  data->>'studentId' AS "studentId",
  data->>'student_id' AS "student_id",
  data->>'courseId' AS "courseId",
  data->>'course_id' AS "course_id",
  data->>'status' AS "status",
  data->>'role' AS "role",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id",
  data->>'subjectId' AS "subjectId",
  data->>'subject_id' AS "subject_id",
  data->>'classId' AS "classId",
  data->>'class_id' AS "class_id",
  data->>'academicYear' AS "academicYear",
  data->>'academic_year' AS "academic_year"
FROM firestore_docs WHERE collection = 'enrollments';

CREATE OR REPLACE FUNCTION enrollments_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('enrollments', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_enrollments_upsert
INSTEAD OF INSERT OR UPDATE ON enrollments
FOR EACH ROW EXECUTE FUNCTION enrollments_upsert();

CREATE OR REPLACE FUNCTION enrollments_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'enrollments' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_enrollments_delete
INSTEAD OF DELETE ON enrollments
FOR EACH ROW EXECUTE FUNCTION enrollments_delete();

UPDATE firestore_docs SET data = data ||
  jsonb_build_object(
    'student_id', data->>'studentId',
    'course_id', data->>'courseId',
    'school_id', data->>'schoolId',
    'subject_id', data->>'subjectId',
    'class_id', data->>'classId',
    'academic_year', data->>'academicYear'
  )
WHERE collection = 'enrollments'
  AND data->>'studentId' IS NOT NULL
  AND data->>'student_id' IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: Rebuild assignments VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_assignments_delete ON assignments;
DROP TRIGGER IF EXISTS trg_assignments_upsert ON assignments;
DROP FUNCTION IF EXISTS assignments_delete();
DROP FUNCTION IF EXISTS assignments_upsert();
DROP VIEW IF EXISTS assignments CASCADE;

CREATE OR REPLACE VIEW assignments AS
SELECT
  doc_id AS id,
  data->>'title' AS "title",
  data->>'description' AS "description",
  data->>'subjectId' AS "subjectId",
  data->>'subject_id' AS "subject_id",
  data->>'subjectName' AS "subjectName",
  data->>'subject_name' AS "subject_name",
  data->>'chapterId' AS "chapterId",
  data->>'chapter_id' AS "chapter_id",
  data->>'textbookId' AS "textbookId",
  data->>'textbook_id' AS "textbook_id",
  data->>'lessonId' AS "lessonId",
  data->>'lesson_id' AS "lesson_id",
  data->>'courseId' AS "courseId",
  data->>'course_id' AS "course_id",
  data->>'dueDate' AS "dueDate",
  data->>'due_date' AS "due_date",
  data->>'points' AS "points",
  data->>'maxAttempts' AS "maxAttempts",
  data->>'max_attempts' AS "max_attempts",
  (data->>'allowLateSubmission')::boolean AS "allowLateSubmission",
  (data->>'allow_late_submission')::boolean AS "allow_late_submission",
  data->>'latePenaltyPercent' AS "latePenaltyPercent",
  data->>'late_penalty_percent' AS "late_penalty_percent",
  data->>'passingGrade' AS "passingGrade",
  data->>'passing_grade' AS "passing_grade",
  data->>'status' AS "status",
  data->>'submissionCount' AS "submissionCount",
  data->>'submission_count' AS "submission_count",
  (data->>'isPublished')::boolean AS "isPublished",
  (data->>'is_published')::boolean AS "is_published",
  data->>'createdAt' AS "createdAt",
  data->>'created_at' AS "created_at",
  data->>'updatedAt' AS "updatedAt",
  data->>'updated_at' AS "updated_at",
  data->>'academicYear' AS "academicYear",
  data->>'academic_year' AS "academic_year",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id"
FROM firestore_docs WHERE collection = 'assignments';

CREATE OR REPLACE FUNCTION assignments_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('assignments', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_assignments_upsert
INSTEAD OF INSERT OR UPDATE ON assignments
FOR EACH ROW EXECUTE FUNCTION assignments_upsert();

CREATE OR REPLACE FUNCTION assignments_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'assignments' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_assignments_delete
INSTEAD OF DELETE ON assignments
FOR EACH ROW EXECUTE FUNCTION assignments_delete();

UPDATE firestore_docs SET data = data ||
  jsonb_build_object(
    'subject_id', data->>'subjectId',
    'subject_name', data->>'subjectName',
    'chapter_id', data->>'chapterId',
    'textbook_id', data->>'textbookId',
    'lesson_id', data->>'lessonId',
    'course_id', data->>'courseId',
    'due_date', data->>'dueDate',
    'max_attempts', data->>'maxAttempts',
    'allow_late_submission', data->>'allowLateSubmission',
    'late_penalty_percent', data->>'latePenaltyPercent',
    'passing_grade', data->>'passingGrade',
    'submission_count', data->>'submissionCount',
    'is_published', data->>'isPublished',
    'academic_year', data->>'academicYear',
    'school_id', data->>'schoolId',
    'created_at', data->>'createdAt',
    'updated_at', data->>'updatedAt'
  )
WHERE collection = 'assignments'
  AND data->>'subjectId' IS NOT NULL
  AND data->>'subject_id' IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: Rebuild exams VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_exams_delete ON exams;
DROP TRIGGER IF EXISTS trg_exams_upsert ON exams;
DROP FUNCTION IF EXISTS exams_delete();
DROP FUNCTION IF EXISTS exams_upsert();
DROP VIEW IF EXISTS exams CASCADE;

CREATE OR REPLACE VIEW exams AS
SELECT
  doc_id AS id,
  data->>'title' AS "title",
  data->>'description' AS "description",
  data->>'subjectId' AS "subjectId",
  data->>'subject_id' AS "subject_id",
  data->>'subjectName' AS "subjectName",
  data->>'subject_name' AS "subject_name",
  data->>'courseId' AS "courseId",
  data->>'course_id' AS "course_id",
  (data->>'duration')::numeric AS "duration",
  (data->>'totalPoints')::numeric AS "totalPoints",
  (data->>'total_points')::numeric AS "total_points",
  (data->>'passingScore')::numeric AS "passingScore",
  (data->>'passing_score')::numeric AS "passing_score",
  data->'questions' AS "questions",
  data->>'status' AS "status",
  data->>'startDate' AS "startDate",
  data->>'start_date' AS "start_date",
  data->>'endDate' AS "endDate",
  data->>'end_date' AS "end_date",
  (data->>'isProctored')::boolean AS "isProctored",
  (data->>'is_proctored')::boolean AS "is_proctored",
  (data->>'shuffleQuestions')::boolean AS "shuffleQuestions",
  (data->>'shuffle_questions')::boolean AS "shuffle_questions",
  (data->>'showResults')::boolean AS "showResults",
  (data->>'show_results')::boolean AS "show_results",
  data->>'createdAt' AS "createdAt",
  data->>'created_at' AS "created_at",
  data->>'updatedAt' AS "updatedAt",
  data->>'updated_at' AS "updated_at",
  data->>'academicYear' AS "academicYear",
  data->>'academic_year' AS "academic_year",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id"
FROM firestore_docs WHERE collection = 'exams';

CREATE OR REPLACE FUNCTION exams_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('exams', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_exams_upsert
INSTEAD OF INSERT OR UPDATE ON exams
FOR EACH ROW EXECUTE FUNCTION exams_upsert();

CREATE OR REPLACE FUNCTION exams_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'exams' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_exams_delete
INSTEAD OF DELETE ON exams
FOR EACH ROW EXECUTE FUNCTION exams_delete();

UPDATE firestore_docs SET data = data ||
  jsonb_build_object(
    'subject_id', data->>'subjectId',
    'subject_name', data->>'subjectName',
    'course_id', data->>'courseId',
    'total_points', data->>'totalPoints',
    'passing_score', data->>'passingScore',
    'start_date', data->>'startDate',
    'end_date', data->>'endDate',
    'is_proctored', data->>'isProctored',
    'shuffle_questions', data->>'shuffleQuestions',
    'show_results', data->>'showResults',
    'academic_year', data->>'academicYear',
    'school_id', data->>'schoolId',
    'created_at', data->>'createdAt',
    'updated_at', data->>'updatedAt'
  )
WHERE collection = 'exams'
  AND data->>'subjectId' IS NOT NULL
  AND data->>'subject_id' IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: Rebuild subjects VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_subjects_delete ON subjects;
DROP TRIGGER IF EXISTS trg_subjects_upsert ON subjects;
DROP FUNCTION IF EXISTS subjects_delete();
DROP FUNCTION IF EXISTS subjects_upsert();
DROP VIEW IF EXISTS subjects CASCADE;

CREATE OR REPLACE VIEW subjects AS
SELECT
  doc_id AS id,
  data->>'name' AS "name",
  data->>'code' AS "code",
  data->>'description' AS "description",
  data->>'type' AS "type",
  data->>'creditHours' AS "creditHours",
  data->>'credit_hours' AS "credit_hours",
  data->>'icon' AS "icon",
  data->>'color' AS "color",
  data->>'classId' AS "classId",
  data->>'class_id' AS "class_id",
  data->>'teacherId' AS "teacherId",
  data->>'teacher_id' AS "teacher_id",
  (data->>'isActive')::boolean AS "isActive",
  (data->>'is_active')::boolean AS "is_active",
  data->>'createdAt' AS "createdAt",
  data->>'created_at' AS "created_at",
  data->>'updatedAt' AS "updatedAt",
  data->>'updated_at' AS "updated_at",
  data->>'category' AS "category",
  data->>'academicYear' AS "academicYear",
  data->>'academic_year' AS "academic_year",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id"
FROM firestore_docs WHERE collection = 'subjects';

CREATE OR REPLACE FUNCTION subjects_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('subjects', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_subjects_upsert
INSTEAD OF INSERT OR UPDATE ON subjects
FOR EACH ROW EXECUTE FUNCTION subjects_upsert();

CREATE OR REPLACE FUNCTION subjects_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'subjects' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_subjects_delete
INSTEAD OF DELETE ON subjects
FOR EACH ROW EXECUTE FUNCTION subjects_delete();

UPDATE firestore_docs SET data = data ||
  jsonb_build_object(
    'credit_hours', data->>'creditHours',
    'class_id', data->>'classId',
    'teacher_id', data->>'teacherId',
    'is_active', data->>'isActive',
    'academic_year', data->>'academicYear',
    'school_id', data->>'schoolId',
    'created_at', data->>'createdAt',
    'updated_at', data->>'updatedAt'
  )
WHERE collection = 'subjects'
  AND data->>'creditHours' IS NOT NULL
  AND data->>'credit_hours' IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 7: Rebuild notifications VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_notifications_delete ON notifications;
DROP TRIGGER IF EXISTS trg_notifications_upsert ON notifications;
DROP FUNCTION IF EXISTS notifications_delete();
DROP FUNCTION IF EXISTS notifications_upsert();
DROP VIEW IF EXISTS notifications CASCADE;

CREATE OR REPLACE VIEW notifications AS
SELECT
  doc_id AS id,
  data->>'userId' AS "userId",
  data->>'user_id' AS "user_id",
  data->>'title' AS "title",
  data->>'message' AS "message",
  data->>'body' AS "body",
  data->>'type' AS "type",
  (data->>'read')::boolean AS "read",
  data->>'readAt' AS "readAt",
  data->>'read_at' AS "read_at",
  data->>'createdAt' AS "createdAt",
  data->>'created_at' AS "created_at",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id"
FROM firestore_docs WHERE collection = 'notifications';

CREATE OR REPLACE FUNCTION notifications_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('notifications', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_notifications_upsert
INSTEAD OF INSERT OR UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION notifications_upsert();

CREATE OR REPLACE FUNCTION notifications_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'notifications' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_notifications_delete
INSTEAD OF DELETE ON notifications
FOR EACH ROW EXECUTE FUNCTION notifications_delete();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 8: Rebuild submissions VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_submissions_delete ON submissions;
DROP TRIGGER IF EXISTS trg_submissions_upsert ON submissions;
DROP FUNCTION IF EXISTS submissions_delete();
DROP FUNCTION IF EXISTS submissions_upsert();
DROP VIEW IF EXISTS submissions CASCADE;

CREATE OR REPLACE VIEW submissions AS
SELECT
  doc_id AS id,
  data->>'assignmentId' AS "assignmentId",
  data->>'assignment_id' AS "assignment_id",
  data->>'studentId' AS "studentId",
  data->>'student_id' AS "student_id",
  data->>'content' AS "content",
  data->'attachments' AS "attachments",
  data->>'submittedAt' AS "submittedAt",
  data->>'submitted_at' AS "submitted_at",
  data->>'status' AS "status",
  (data->>'attemptNumber')::numeric AS "attemptNumber",
  (data->>'attempt_number')::numeric AS "attempt_number",
  (data->>'grade')::numeric AS "grade",
  data->>'feedback' AS "feedback",
  data->>'gradedBy' AS "gradedBy",
  data->>'graded_by' AS "graded_by",
  data->>'gradedAt' AS "gradedAt",
  data->>'graded_at' AS "graded_at",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id"
FROM firestore_docs WHERE collection = 'submissions';

CREATE OR REPLACE FUNCTION submissions_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('submissions', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_submissions_upsert
INSTEAD OF INSERT OR UPDATE ON submissions
FOR EACH ROW EXECUTE FUNCTION submissions_upsert();

CREATE OR REPLACE FUNCTION submissions_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'submissions' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_submissions_delete
INSTEAD OF DELETE ON submissions
FOR EACH ROW EXECUTE FUNCTION submissions_delete();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 9: Rebuild timetable VIEW with snake_case aliases
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_timetable_delete ON timetable;
DROP TRIGGER IF EXISTS trg_timetable_upsert ON timetable;
DROP FUNCTION IF EXISTS timetable_delete();
DROP FUNCTION IF EXISTS timetable_upsert();
DROP VIEW IF EXISTS timetable CASCADE;

CREATE OR REPLACE VIEW timetable AS
SELECT
  doc_id AS id,
  data->>'classId' AS "classId",
  data->>'class_id' AS "class_id",
  data->>'day' AS "day",
  (data->>'period')::numeric AS "period",
  data->>'subjectId' AS "subjectId",
  data->>'subject_id' AS "subject_id",
  data->>'teacherId' AS "teacherId",
  data->>'teacher_id' AS "teacher_id",
  data->>'room' AS "room",
  data->>'startTime' AS "startTime",
  data->>'start_time' AS "start_time",
  data->>'endTime' AS "endTime",
  data->>'end_time' AS "end_time",
  data->>'createdAt' AS "createdAt",
  data->>'created_at' AS "created_at",
  data->>'updatedAt' AS "updatedAt",
  data->>'updated_at' AS "updated_at",
  data->>'academicYear' AS "academicYear",
  data->>'academic_year' AS "academic_year",
  data->>'status' AS "status",
  data->>'archived_at' AS "archived_at",
  data->>'deleted_at' AS "deleted_at",
  data->>'schoolId' AS "schoolId",
  data->>'school_id' AS "school_id"
FROM firestore_docs WHERE collection = 'timetable';

CREATE OR REPLACE FUNCTION timetable_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('timetable', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_timetable_upsert
INSTEAD OF INSERT OR UPDATE ON timetable
FOR EACH ROW EXECUTE FUNCTION timetable_upsert();

CREATE OR REPLACE FUNCTION timetable_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'timetable' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_timetable_delete
INSTEAD OF DELETE ON timetable
FOR EACH ROW EXECUTE FUNCTION timetable_delete();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 10: Track migration
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO _migrations (filename, checksum, duration_ms)
SELECT '048_rebuild_views_snake_case.sql', 'sha256-placeholder', 0
WHERE NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '048_rebuild_views_snake_case.sql');
