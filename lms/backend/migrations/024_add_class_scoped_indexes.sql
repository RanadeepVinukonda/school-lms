-- Indexes for class-scoped queries
-- These indexes improve query performance for the class management and teacher workflow features

-- Textbooks by subject
CREATE INDEX IF NOT EXISTS idx_textbooks_subject_id ON textbooks(subject_id);

-- Textbooks by class
CREATE INDEX IF NOT EXISTS idx_textbooks_class_id ON textbooks(class_id);

-- Users by role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Concept releases by class
CREATE INDEX IF NOT EXISTS idx_concept_releases_class_id ON concept_releases(class_id);

-- Timetable by class
CREATE INDEX IF NOT EXISTS idx_timetable_class_id ON timetable(class_id);
