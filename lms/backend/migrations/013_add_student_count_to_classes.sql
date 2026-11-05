-- 013_add_student_count_to_classes.sql
-- Add student_count column to classes table for tracking enrollment

ALTER TABLE classes ADD COLUMN IF NOT EXISTS student_count INTEGER DEFAULT 0 NOT NULL;

-- Also add RPC for atomic increment (used by user.service.ts createUser)
CREATE OR REPLACE FUNCTION increment_student_count(class_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE classes SET student_count = student_count + delta, updated_at = NOW()
  WHERE id = class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
