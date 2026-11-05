-- Enable RLS on schools table and add school-scoped policy
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own school
CREATE POLICY "School-scoped schools read"
  ON schools FOR SELECT
  USING (
    id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- Only admins can write schools (already handled by controller role middleware)
CREATE POLICY "Admin write schools"
  ON schools FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Admin update schools"
  ON schools FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Admin delete schools"
  ON schools FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );
