-- Create the exec_sql RPC function for running migrations
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Migration tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64) NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0
);

-- Seed the tracking table
INSERT INTO _migrations (filename, checksum, duration_ms)
SELECT '000_initial_schema.sql', 'seed', 0
WHERE NOT EXISTS (SELECT 1 FROM _migrations WHERE filename = '000_initial_schema.sql');
