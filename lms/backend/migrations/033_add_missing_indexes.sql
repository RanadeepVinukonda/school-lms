-- 033_add_missing_indexes.sql
-- Adds commonly needed indexes for query performance.
-- All statements use IF NOT EXISTS guards for idempotency.

-- Multi-tenant school_id indexes (most services filter by school_id)
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_textbooks_school_id ON textbooks(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_concept_releases_school_id ON concept_releases(school_id);

-- Subject and curriculum lookups
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);

-- Coding challenges and virtual labs
CREATE INDEX IF NOT EXISTS idx_coding_challenges_school_id ON coding_challenges(school_id);
CREATE INDEX IF NOT EXISTS idx_virtual_lab_progress_student_id ON virtual_lab_progress(student_id);
