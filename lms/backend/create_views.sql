DROP VIEW IF EXISTS classes CASCADE;
DROP VIEW IF EXISTS grades CASCADE;
DROP VIEW IF EXISTS assignments CASCADE;
DROP VIEW IF EXISTS exams CASCADE;
DROP VIEW IF EXISTS subjects CASCADE;
DROP VIEW IF EXISTS enrollments CASCADE;
DROP VIEW IF EXISTS notifications CASCADE;
DROP VIEW IF EXISTS submissions CASCADE;
DROP VIEW IF EXISTS corrections CASCADE;
DROP VIEW IF EXISTS quizzes CASCADE;
DROP VIEW IF EXISTS quizV2 CASCADE;
DROP VIEW IF EXISTS timetable CASCADE;
DROP VIEW IF EXISTS lessons CASCADE;
DROP VIEW IF EXISTS auditLogs CASCADE;
CREATE OR REPLACE VIEW classes AS SELECT doc_id AS id, data->>'name' AS "name", data->>'code' AS "code", data->>'description' AS "description", (data->>'grade')::numeric AS "grade", data->>'section' AS "section", data->>'academicYear' AS "academicYear", data->>'roomNumber' AS "roomNumber", CASE WHEN jsonb_typeof(data->'teacherIds') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(data->'teacherIds')) ELSE ARRAY[]::text[] END AS "teacherIds", CASE WHEN jsonb_typeof(data->'subjectIds') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(data->'subjectIds')) ELSE ARRAY[]::text[] END AS "subjectIds", (data->>'studentCount')::numeric AS "studentCount", (data->>'teacherCount')::numeric AS "teacherCount", (data->>'maxStudents')::numeric AS "maxStudents", data->>'startDate' AS "startDate", data->>'endDate' AS "endDate", data->>'status' AS "status", (data->>'isActive')::boolean AS "isActive", data->>'createdAt' AS "createdAt", data->>'updatedAt' AS "updatedAt" FROM firestore_docs WHERE collection = 'classes';


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
CREATE OR REPLACE VIEW grades AS SELECT doc_id AS id, data->>'studentId' AS "studentId", data->>'courseId' AS "courseId", data->>'assignmentId' AS "assignmentId", (data->>'score')::numeric AS "score", (data->>'maxScore')::numeric AS "maxScore", data->>'letterGrade' AS "letterGrade", data->>'comments' AS "comments", data->>'date' AS "date", data->>'semester' AS "semester" FROM firestore_docs WHERE collection = 'grades';


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
CREATE OR REPLACE VIEW assignments AS SELECT doc_id AS id, data->>'title' AS "title", data->>'description' AS "description", data->>'subjectId' AS "subjectId", data->>'subjectName' AS "subjectName", data->>'chapterId' AS "chapterId", data->>'textbookId' AS "textbookId", data->>'lessonId' AS "lessonId", data->>'courseId' AS "courseId", data->>'dueDate' AS "dueDate", data->>'points' AS "points", data->>'maxAttempts' AS "maxAttempts", (data->>'allowLateSubmission')::boolean AS "allowLateSubmission", data->>'latePenaltyPercent' AS "latePenaltyPercent", data->>'passingGrade' AS "passingGrade", data->>'status' AS "status", data->>'submissionCount' AS "submissionCount", (data->>'isPublished')::boolean AS "isPublished", data->>'createdAt' AS "createdAt", data->>'updatedAt' AS "updatedAt" FROM firestore_docs WHERE collection = 'assignments';


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
CREATE OR REPLACE VIEW exams AS SELECT doc_id AS id, data->>'title' AS "title", data->>'description' AS "description", data->>'subjectId' AS "subjectId", data->>'subjectName' AS "subjectName", data->>'courseId' AS "courseId", (data->>'duration')::numeric AS "duration", (data->>'totalPoints')::numeric AS "totalPoints", (data->>'passingScore')::numeric AS "passingScore", data->'questions' AS "questions", data->>'status' AS "status", data->>'startDate' AS "startDate", data->>'endDate' AS "endDate", (data->>'isProctored')::boolean AS "isProctored", (data->>'shuffleQuestions')::boolean AS "shuffleQuestions", (data->>'showResults')::boolean AS "showResults", data->>'createdAt' AS "createdAt", data->>'updatedAt' AS "updatedAt" FROM firestore_docs WHERE collection = 'exams';


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
CREATE OR REPLACE VIEW subjects AS SELECT doc_id AS id, data->>'name' AS "name", data->>'code' AS "code", data->>'description' AS "description", data->>'type' AS "type", data->>'creditHours' AS "creditHours", data->>'icon' AS "icon", data->>'color' AS "color", data->>'classId' AS "classId", data->>'teacherId' AS "teacherId", (data->>'isActive')::boolean AS "isActive", data->>'createdAt' AS "createdAt", data->>'updatedAt' AS "updatedAt", data->>'category' AS "category" FROM firestore_docs WHERE collection = 'subjects';


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
CREATE OR REPLACE VIEW enrollments AS SELECT doc_id AS id, data->>'studentId' AS "studentId", data->>'courseId' AS "courseId", data->>'status' AS "status", data->>'role' AS "role" FROM firestore_docs WHERE collection = 'enrollments';


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
CREATE OR REPLACE VIEW notifications AS SELECT doc_id AS id, data->>'userId' AS "userId", data->>'title' AS "title", data->>'message' AS "message", data->>'type' AS "type", (data->>'read')::boolean AS "read", data->>'readAt' AS "readAt", data->>'createdAt' AS "createdAt" FROM firestore_docs WHERE collection = 'notifications';


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
CREATE OR REPLACE VIEW submissions AS SELECT doc_id AS id, data->>'assignmentId' AS "assignmentId", data->>'studentId' AS "studentId", data->>'content' AS "content", data->'attachments' AS "attachments", data->>'submittedAt' AS "submittedAt", data->>'status' AS "status", (data->>'attemptNumber')::numeric AS "attemptNumber", (data->>'grade')::numeric AS "grade", data->>'feedback' AS "feedback", data->>'gradedBy' AS "gradedBy", data->>'gradedAt' AS "gradedAt" FROM firestore_docs WHERE collection = 'submissions';


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
CREATE OR REPLACE VIEW corrections AS SELECT doc_id AS id, data->>'examId' AS "examId", data->>'studentId' AS "studentId", data->>'teacherId' AS "teacherId", data->'questionMarks' AS "questionMarks", data->>'totalMarks' AS "totalMarks", data->>'overallFeedback' AS "overallFeedback", data->>'status' AS "status", data->>'correctedAt' AS "correctedAt" FROM firestore_docs WHERE collection = 'corrections';


CREATE OR REPLACE FUNCTION corrections_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('corrections', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_corrections_upsert
INSTEAD OF INSERT OR UPDATE ON corrections
FOR EACH ROW EXECUTE FUNCTION corrections_upsert();

CREATE OR REPLACE FUNCTION corrections_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'corrections' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_corrections_delete
INSTEAD OF DELETE ON corrections
FOR EACH ROW EXECUTE FUNCTION corrections_delete();
CREATE OR REPLACE VIEW quizzes AS SELECT doc_id AS id, data->>'title' AS "title", data->>'description' AS "description", data->>'lessonId' AS "lessonId", data->>'chapterId' AS "chapterId", data->>'textbookId' AS "textbookId", data->>'subjectId' AS "subjectId", data->>'subjectName' AS "subjectName", (data->>'timeLimit')::numeric AS "timeLimit", data->'questions' AS "questions", (data->>'questionCount')::numeric AS "questionCount", data->>'status' AS "status" FROM firestore_docs WHERE collection = 'quizzes';


CREATE OR REPLACE FUNCTION quizzes_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('quizzes', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_quizzes_upsert
INSTEAD OF INSERT OR UPDATE ON quizzes
FOR EACH ROW EXECUTE FUNCTION quizzes_upsert();

CREATE OR REPLACE FUNCTION quizzes_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'quizzes' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_quizzes_delete
INSTEAD OF DELETE ON quizzes
FOR EACH ROW EXECUTE FUNCTION quizzes_delete();
CREATE OR REPLACE VIEW quizV2 AS SELECT doc_id AS id, data->>'title' AS "title", data->>'description' AS "description", data->>'lessonId' AS "lessonId", data->>'chapterId' AS "chapterId", data->>'textbookId' AS "textbookId", data->>'subjectId' AS "subjectId", data->>'subjectName' AS "subjectName", (data->>'timeLimit')::numeric AS "timeLimit", data->'questions' AS "questions", (data->>'questionCount')::numeric AS "questionCount", data->>'status' AS "status" FROM firestore_docs WHERE collection = 'quizV2';


CREATE OR REPLACE FUNCTION quizV2_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('quizV2', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_quizV2_upsert
INSTEAD OF INSERT OR UPDATE ON quizV2
FOR EACH ROW EXECUTE FUNCTION quizV2_upsert();

CREATE OR REPLACE FUNCTION quizV2_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'quizV2' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_quizV2_delete
INSTEAD OF DELETE ON quizV2
FOR EACH ROW EXECUTE FUNCTION quizV2_delete();
CREATE OR REPLACE VIEW timetable AS SELECT doc_id AS id, data->>'classId' AS "classId", data->>'day' AS "day", (data->>'period')::numeric AS "period", data->>'subjectId' AS "subjectId", data->>'teacherId' AS "teacherId", data->>'room' AS "room", data->>'startTime' AS "startTime", data->>'endTime' AS "endTime", data->>'createdAt' AS "createdAt", data->>'updatedAt' AS "updatedAt" FROM firestore_docs WHERE collection = 'timetable';


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
CREATE OR REPLACE VIEW lessons AS SELECT doc_id AS id, data->>'textbookId' AS "textbookId", data->>'chapterId' AS "chapterId", data->>'title' AS "title", data->>'contentType' AS "contentType", data->>'videoUrl' AS "videoUrl", data->>'content' AS "content", (data->>'duration')::numeric AS "duration", (data->>'order')::numeric AS "order", data->>'quizId' AS "quizId", data->>'assignmentId' AS "assignmentId" FROM firestore_docs WHERE collection = 'lessons';


CREATE OR REPLACE FUNCTION lessons_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('lessons', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lessons_upsert
INSTEAD OF INSERT OR UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION lessons_upsert();

CREATE OR REPLACE FUNCTION lessons_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'lessons' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lessons_delete
INSTEAD OF DELETE ON lessons
FOR EACH ROW EXECUTE FUNCTION lessons_delete();
CREATE OR REPLACE VIEW auditLogs AS SELECT doc_id AS id, data->>'action' AS "action", data->>'targetId' AS "targetId", data->>'targetType' AS "targetType", data->>'targetName' AS "targetName", data->>'performedBy' AS "performedBy", data->>'performedByName' AS "performedByName", data->>'performedByRole' AS "performedByRole", data->'oldValue' AS "oldValue", data->'newValue' AS "newValue", data->>'summary' AS "summary", data->>'timestamp' AS "timestamp" FROM firestore_docs WHERE collection = 'auditLogs';


CREATE OR REPLACE FUNCTION auditLogs_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('auditLogs', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_auditLogs_upsert
INSTEAD OF INSERT OR UPDATE ON auditLogs
FOR EACH ROW EXECUTE FUNCTION auditLogs_upsert();

CREATE OR REPLACE FUNCTION auditLogs_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'auditLogs' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_auditLogs_delete
INSTEAD OF DELETE ON auditLogs
FOR EACH ROW EXECUTE FUNCTION auditLogs_delete();
