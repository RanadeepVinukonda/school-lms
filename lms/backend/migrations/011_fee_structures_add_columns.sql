-- 011_fee_structures_add_columns.sql
-- Add class_id, academic_year, and description columns to fee_structures

ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_fee_structures_class_id ON fee_structures(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_academic_year ON fee_structures(academic_year);
