-- Indexes for class-scoped queries
-- These indexes improve query performance for the class management and teacher workflow features

-- Subjects by class
-- CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(classId);

-- Textbooks by subject
CREATE INDEX IF NOT EXISTS idx_textbooks_subject_id ON textbooks(subject_id);

-- Textbooks by class
CREATE INDEX IF NOT EXISTS idx_textbooks_class_id ON textbooks(class_id);

-- Mindmaps by class
CREATE INDEX IF NOT EXISTS idx_mindmaps_class_id ON nosql_docs(doc_id) WHERE collection = 'mindmaps';

-- Question bank by class
CREATE INDEX IF NOT EXISTS idx_question_bank_class_id ON nosql_docs(doc_id) WHERE collection = 'questionBank';

-- Test templates by class
CREATE INDEX IF NOT EXISTS idx_test_templates_class_id ON nosql_docs(doc_id) WHERE collection = 'testTemplates';

-- Test schedule by class
CREATE INDEX IF NOT EXISTS idx_test_schedule_class_id ON nosql_docs(doc_id) WHERE collection = 'testSchedule';

-- Teacher class subject assignments by class
CREATE INDEX IF NOT EXISTS idx_tcs_class_id ON nosql_docs(doc_id) WHERE collection = 'teacherClassSubject';

-- Teacher class subject assignments by teacher
CREATE INDEX IF NOT EXISTS idx_tcs_teacher_id ON nosql_docs(doc_id) WHERE collection = 'teacherClassSubject';

-- Users by role and class_ids
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Concept releases by class
CREATE INDEX IF NOT EXISTS idx_concept_releases_class_id ON concept_releases(class_id);

-- Quizzes by class
CREATE INDEX IF NOT EXISTS idx_quizzes_class_id ON nosql_docs(doc_id) WHERE collection = 'quizzes';

-- Grades by class
-- CREATE INDEX IF NOT EXISTS idx_grades_class_id ON grades(classId);

-- Attendance by class
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON nosql_docs(doc_id) WHERE collection = 'attendance';

-- Timetable by class
CREATE INDEX IF NOT EXISTS idx_timetable_class_id ON timetable(class_id);
