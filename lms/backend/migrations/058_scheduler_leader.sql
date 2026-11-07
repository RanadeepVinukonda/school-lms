-- Migration 058: Single scheduler leader across API replicas.
-- Instances renew a short lease; only the leaseholder runs setInterval jobs.

CREATE TABLE IF NOT EXISTS scheduler_leader (
  id INTEGER PRIMARY KEY,
  instance_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scheduler_leader ENABLE ROW LEVEL SECURITY;
-- No policies: accessed only by the backend's service-role/database connection.
