DROP VIEW IF EXISTS grades CASCADE;

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
