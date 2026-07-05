-- 012_create_attendance_table.sql
-- Create attendance table with RLS

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'holiday')),
  marked_by UUID REFERENCES users(id),
  note TEXT DEFAULT '',
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_class_date ON attendance(student_id, class_id, date);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Allow admin/service role full access (will be used by getSupabaseAdmin)
CREATE POLICY attendance_admin_all ON attendance FOR ALL USING (true) WITH CHECK (true);
