-- 043_fix_missing_columns.sql
-- Add columns that exist in Drizzle schema but missing from tables

-- fee_structures: missing updated_at (BaseService.create inserts it)
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- users: missing children_ids for parent/child relationship
ALTER TABLE users ADD COLUMN IF NOT EXISTS children_ids uuid[] DEFAULT '{}';

-- timetable: school_id might be missing if migration 001/038 didn't apply
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Ensure fee_structures has school_id set as NOT NULL
UPDATE fee_structures SET school_id = (SELECT id FROM schools LIMIT 1) WHERE school_id IS NULL;
ALTER TABLE fee_structures ALTER COLUMN school_id SET NOT NULL;

-- Backfill timetable.school_id from classes
UPDATE timetable SET school_id = c.school_id FROM classes c WHERE timetable.class_id = c.id AND timetable.school_id IS NULL;

-- Add children_ids index for parent lookup
CREATE INDEX IF NOT EXISTS idx_users_children_ids ON users USING gin(children_ids);
