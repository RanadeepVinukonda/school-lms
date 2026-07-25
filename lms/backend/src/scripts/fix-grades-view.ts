import { getSupabaseAdmin } from '../services/supabase';

const sql = `DROP VIEW IF EXISTS grades CASCADE;
CREATE OR REPLACE VIEW grades AS
SELECT doc_id AS id,
       data->>'studentId' AS "studentId",
       data->>'courseId' AS "courseId",
       data->>'assignmentId' AS "assignmentId",
       (data->>'score')::numeric AS "score",
       (data->>'maxScore')::numeric AS "maxScore",
       data->>'letterGrade' AS "letterGrade",
       data->>'comments' AS "comments",
       data->>'date' AS "date",
       data->>'schoolId' AS "schoolId",
       data->>'classId' AS "classId",
       data->>'subjectId' AS "subjectId",
       data->>'itemName' AS "itemName",
       (data->>'totalPoints')::numeric AS "totalPoints",
       data->>'academicYear' AS "academicYear",
       data->>'term' AS "term",
       data->>'feedback' AS "feedback",
       data->>'gradedBy' AS "gradedBy",
       (data->>'percentage')::numeric AS "percentage",
       data->>'updatedAt' AS "updatedAt",
       data->>'examDate' AS "examDate",
       data->>'semester' AS "semester",
       data->>'createdAt' AS "createdAt",
       created_at
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

DROP TRIGGER IF EXISTS trg_grades_upsert ON grades;
CREATE OR REPLACE TRIGGER trg_grades_upsert
INSTEAD OF INSERT OR UPDATE ON grades
FOR EACH ROW EXECUTE FUNCTION grades_upsert();

CREATE OR REPLACE FUNCTION grades_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM firestore_docs WHERE collection = 'grades' AND doc_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grades_delete ON grades;
CREATE OR REPLACE TRIGGER trg_grades_delete
INSTEAD OF DELETE ON grades
FOR EACH ROW EXECUTE FUNCTION grades_delete();`;

async function main() {
  const sup = getSupabaseAdmin();
  if (!sup) {
    console.error('No Supabase admin client');
    process.exit(1);
  }
  const { data, error } = await sup.rpc('exec_sql', { sql });
  if (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
  console.log('Grades view updated successfully');
}

main();
