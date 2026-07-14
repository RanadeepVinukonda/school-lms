const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const VIEWS = {
  classes: ['name', 'code', 'description', 'grade', 'section', 'academicYear', 'roomNumber', 'teacherIds', 'subjectIds', 'studentCount', 'teacherCount', 'maxStudents', 'startDate', 'endDate', 'status', 'isActive', 'createdAt', 'updatedAt'],
  grades: ['studentId', 'courseId', 'assignmentId', 'score', 'maxScore', 'letterGrade', 'comments', 'date', 'semester'],
  assignments: ['title', 'description', 'subjectId', 'subjectName', 'chapterId', 'textbookId', 'lessonId', 'courseId', 'dueDate', 'points', 'maxAttempts', 'allowLateSubmission', 'latePenaltyPercent', 'passingGrade', 'status', 'submissionCount', 'isPublished', 'createdAt', 'updatedAt'],
  exams: ['title', 'description', 'subjectId', 'subjectName', 'courseId', 'duration', 'totalPoints', 'passingScore', 'questions', 'status', 'startDate', 'endDate', 'isProctored', 'shuffleQuestions', 'showResults', 'createdAt', 'updatedAt'],
  subjects: ['name', 'code', 'description', 'type', 'creditHours', 'icon', 'color', 'classId', 'teacherId', 'isActive', 'createdAt', 'updatedAt', 'category'],
  enrollments: ['studentId', 'courseId', 'status', 'role'],
  notifications: ['userId', 'title', 'message', 'type', 'read', 'readAt', 'createdAt'],
  submissions: ['assignmentId', 'studentId', 'content', 'attachments', 'submittedAt', 'status', 'attemptNumber', 'grade', 'feedback', 'gradedBy', 'gradedAt'],
  corrections: ['examId', 'studentId', 'teacherId', 'questionMarks', 'totalMarks', 'overallFeedback', 'status', 'correctedAt'],
  quizzes: ['title', 'description', 'lessonId', 'chapterId', 'textbookId', 'subjectId', 'subjectName', 'timeLimit', 'questions', 'questionCount', 'status'],
  quizV2: ['title', 'description', 'lessonId', 'chapterId', 'textbookId', 'subjectId', 'subjectName', 'timeLimit', 'questions', 'questionCount', 'status'],
  timetable: ['classId', 'day', 'period', 'subjectId', 'teacherId', 'room', 'startTime', 'endTime', 'createdAt', 'updatedAt'],
  lessons: ['textbookId', 'chapterId', 'title', 'contentType', 'videoUrl', 'content', 'duration', 'order', 'quizId', 'assignmentId'],
  auditLogs: ['action', 'targetId', 'targetType', 'targetName', 'performedBy', 'performedByName', 'performedByRole', 'oldValue', 'newValue', 'summary', 'timestamp']
};

let sql = '';

for (const col of Object.keys(VIEWS)) {
  sql += `DROP VIEW IF EXISTS ${col} CASCADE;\n`;
}

for (const [col, fields] of Object.entries(VIEWS)) {
  sql += `CREATE OR REPLACE VIEW ${col} AS SELECT doc_id AS id`;
  for (const f of fields) {
    if (f === 'studentCount' || f === 'teacherCount' || f === 'maxStudents' || f === 'score' || f === 'maxScore' || f === 'duration' || f === 'totalPoints' || f === 'passingScore' || f === 'timeLimit' || f === 'questionCount' || f === 'period' || f === 'order' || f === 'attemptNumber' || f === 'grade') {
      sql += `, (data->>'${f}')::numeric AS "${f}"`;
    } else if (f === 'isActive' || f === 'isProctored' || f === 'shuffleQuestions' || f === 'showResults' || f === 'isPublished' || f === 'allowLateSubmission' || f === 'read') {
      sql += `, (data->>'${f}')::boolean AS "${f}"`;
    } else if (f === 'teacherIds' || f === 'subjectIds') {
      sql += `, CASE WHEN jsonb_typeof(data->'${f}') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(data->'${f}')) ELSE ARRAY[]::text[] END AS "${f}"`;
    } else if (f === 'questions' || f === 'attachments' || f === 'questionMarks' || f === 'oldValue' || f === 'newValue') {
      sql += `, data->'${f}' AS "${f}"`;
    } else {
      sql += `, data->>'${f}' AS "${f}"`;
    }
  }
  sql += ` FROM firestore_docs WHERE collection = '${col}';\n\n`;

  sql += `
CREATE OR REPLACE FUNCTION ${col}_upsert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  INSERT INTO firestore_docs (collection, doc_id, data)
  VALUES ('${col}', NEW.id, row_to_json(NEW)::jsonb - 'id')
  ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_${col}_upsert
INSTEAD OF INSERT OR UPDATE ON ${col}
FOR EACH ROW EXECUTE FUNCTION ${col}_upsert();

CREATE OR REPLACE FUNCTION ${col}_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = '${col}' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_${col}_delete
INSTEAD OF DELETE ON ${col}
FOR EACH ROW EXECUTE FUNCTION ${col}_delete();
`;
}


fs.writeFileSync('create_views.sql', sql);
console.log('Generated create_views.sql');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(sql);
  console.log('Applied views to database!');
  process.exit(0);
}
run().catch(console.error);
