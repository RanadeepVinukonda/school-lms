CREATE TABLE IF NOT EXISTS report_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  user_role TEXT NOT NULL DEFAULT '',
  class_name TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'feedback',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  assigned_teacher_name TEXT,
  remarks TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE report_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports"
  ON report_feedback FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can read all reports"
  ON report_feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Users can read their own reports"
  ON report_feedback FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can update reports"
  ON report_feedback FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE INDEX IF NOT EXISTS idx_report_feedback_status ON report_feedback(status);
CREATE INDEX IF NOT EXISTS idx_report_feedback_category ON report_feedback(category);
CREATE INDEX IF NOT EXISTS idx_report_feedback_user_role ON report_feedback(user_role);
CREATE INDEX IF NOT EXISTS idx_report_feedback_created_at ON report_feedback(created_at DESC);
