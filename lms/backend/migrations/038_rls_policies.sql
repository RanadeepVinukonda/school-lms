ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS salary_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notice_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher_class_subject_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE timetable ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE teacher_class_subject_assignments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable' AND column_name = 'school_id') THEN
    UPDATE timetable t SET school_id = c.school_id FROM classes c WHERE t.class_id = c.id AND t.school_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_class_subject_assignments' AND column_name = 'school_id') THEN
    UPDATE teacher_class_subject_assignments t SET school_id = c.school_id FROM classes c WHERE t.class_id = c.id AND t.school_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable' AND column_name = 'school_id' AND is_nullable = 'YES') THEN
    ALTER TABLE timetable ALTER COLUMN school_id SET NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_class_subject_assignments' AND column_name = 'school_id' AND is_nullable = 'YES') THEN
    ALTER TABLE teacher_class_subject_assignments ALTER COLUMN school_id SET NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_timetable_school_id ON timetable(school_id);
CREATE INDEX IF NOT EXISTS idx_tcsa_school_id ON teacher_class_subject_assignments(school_id);

DROP POLICY IF EXISTS school_scoped_select ON subscriptions;
CREATE POLICY school_scoped_select ON subscriptions FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON subscriptions;
CREATE POLICY school_scoped_insert ON subscriptions FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON subscriptions;
CREATE POLICY school_scoped_update ON subscriptions FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON subscriptions;
CREATE POLICY school_scoped_delete ON subscriptions FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');

DROP POLICY IF EXISTS school_scoped_select ON salary_config;
CREATE POLICY school_scoped_select ON salary_config FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON salary_config;
CREATE POLICY school_scoped_insert ON salary_config FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON salary_config;
CREATE POLICY school_scoped_update ON salary_config FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON salary_config;
CREATE POLICY school_scoped_delete ON salary_config FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');

DROP POLICY IF EXISTS school_scoped_select ON payroll_runs;
CREATE POLICY school_scoped_select ON payroll_runs FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON payroll_runs;
CREATE POLICY school_scoped_insert ON payroll_runs FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON payroll_runs;
CREATE POLICY school_scoped_update ON payroll_runs FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON payroll_runs;
CREATE POLICY school_scoped_delete ON payroll_runs FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');

DROP POLICY IF EXISTS school_scoped_select ON leave_requests;
CREATE POLICY school_scoped_select ON leave_requests FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON leave_requests;
CREATE POLICY school_scoped_insert ON leave_requests FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON leave_requests;
CREATE POLICY school_scoped_update ON leave_requests FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON leave_requests;
CREATE POLICY school_scoped_delete ON leave_requests FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');

DROP POLICY IF EXISTS school_scoped_select ON staff_records;
CREATE POLICY school_scoped_select ON staff_records FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON staff_records;
CREATE POLICY school_scoped_insert ON staff_records FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON staff_records;
CREATE POLICY school_scoped_update ON staff_records FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON staff_records;
CREATE POLICY school_scoped_delete ON staff_records FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');

DROP POLICY IF EXISTS school_scoped_select ON timetable;
CREATE POLICY school_scoped_select ON timetable FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON timetable;
CREATE POLICY school_scoped_insert ON timetable FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON timetable;
CREATE POLICY school_scoped_update ON timetable FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON timetable;
CREATE POLICY school_scoped_delete ON timetable FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');

DROP POLICY IF EXISTS school_scoped_select ON notice_board;
CREATE POLICY school_scoped_select ON notice_board FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON notice_board;
CREATE POLICY school_scoped_insert ON notice_board FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON notice_board;
CREATE POLICY school_scoped_update ON notice_board FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON notice_board;
CREATE POLICY school_scoped_delete ON notice_board FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');

DROP POLICY IF EXISTS school_scoped_select ON device_tokens;
CREATE POLICY school_scoped_select ON device_tokens FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON device_tokens;
CREATE POLICY school_scoped_insert ON device_tokens FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON device_tokens;
CREATE POLICY school_scoped_update ON device_tokens FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON device_tokens;
CREATE POLICY school_scoped_delete ON device_tokens FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');

DROP POLICY IF EXISTS school_scoped_select ON teacher_class_subject_assignments;
CREATE POLICY school_scoped_select ON teacher_class_subject_assignments FOR SELECT USING (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_insert ON teacher_class_subject_assignments;
CREATE POLICY school_scoped_insert ON teacher_class_subject_assignments FOR INSERT WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_update ON teacher_class_subject_assignments;
CREATE POLICY school_scoped_update ON teacher_class_subject_assignments FOR UPDATE USING (school_id = auth.jwt() ->> 'school_id') WITH CHECK (school_id = auth.jwt() ->> 'school_id');
DROP POLICY IF EXISTS school_scoped_delete ON teacher_class_subject_assignments;
CREATE POLICY school_scoped_delete ON teacher_class_subject_assignments FOR DELETE USING (school_id = auth.jwt() ->> 'school_id');
