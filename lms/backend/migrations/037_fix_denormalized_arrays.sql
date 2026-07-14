-- Trigger function to sync users.class_ids when teacher_class_subject_assignments changes
CREATE OR REPLACE FUNCTION sync_user_class_ids()
RETURNS TRIGGER AS $$
DECLARE
  affected_teacher_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    affected_teacher_id := NEW.teacher_id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_teacher_id := OLD.teacher_id;
  END IF;

  UPDATE users u
  SET class_ids = (
    SELECT COALESCE(jsonb_agg(DISTINCT tcs.class_id), '[]'::jsonb)
    FROM teacher_class_subject_assignments tcs
    WHERE tcs.teacher_id = affected_teacher_id AND tcs.status = 'active'
  ), updated_at = now()
  WHERE u.id = affected_teacher_id AND u.role = 'teacher';

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_class_ids_insert ON teacher_class_subject_assignments;
CREATE TRIGGER trg_sync_user_class_ids_insert
  AFTER INSERT ON teacher_class_subject_assignments
  FOR EACH ROW EXECUTE FUNCTION sync_user_class_ids();

DROP TRIGGER IF EXISTS trg_sync_user_class_ids_update ON teacher_class_subject_assignments;
CREATE TRIGGER trg_sync_user_class_ids_update
  AFTER UPDATE OF teacher_id, class_id, status ON teacher_class_subject_assignments
  FOR EACH ROW EXECUTE FUNCTION sync_user_class_ids();

DROP TRIGGER IF EXISTS trg_sync_user_class_ids_delete ON teacher_class_subject_assignments;
CREATE TRIGGER trg_sync_user_class_ids_delete
  AFTER DELETE ON teacher_class_subject_assignments
  FOR EACH ROW EXECUTE FUNCTION sync_user_class_ids();

-- One-time rebuild of class_ids from actual data

-- Teachers: from teacher_class_subject_assignments
UPDATE users u
SET class_ids = (
  SELECT COALESCE(jsonb_agg(DISTINCT tcs.class_id), '[]'::jsonb)
  FROM teacher_class_subject_assignments tcs
  WHERE tcs.teacher_id = u.id::text
), updated_at = now()
WHERE u.role = 'teacher';

-- Students: from firestore_docs enrollment records
UPDATE users u
SET class_ids = (
  SELECT COALESCE(jsonb_agg(DISTINCT e.data->>'classId'), '[]'::jsonb)
  FROM firestore_docs e
  WHERE e.collection = 'enrollment' AND e.data->>'studentId' = u.id::text AND e.data->>'status' = 'active'
), updated_at = now()
WHERE u.role = 'student';
