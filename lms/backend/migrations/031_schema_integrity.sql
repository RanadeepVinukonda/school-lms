-- 021_schema_integrity.sql
-- Sprint 1: FK constraints, RLS policies, indexes, CHECK constraints, cleanup

-- =========================================================================
-- 1.4 — FK constraints on concept_releases
-- =========================================================================
-- Convert TEXT columns to UUID for FK compatibility
ALTER TABLE concept_releases ALTER COLUMN id TYPE UUID USING id::UUID;
ALTER TABLE concept_releases ALTER COLUMN class_id TYPE UUID USING class_id::UUID;
ALTER TABLE concept_releases ALTER COLUMN textbook_id TYPE UUID USING textbook_id::UUID;
ALTER TABLE concept_releases ALTER COLUMN chapter_id TYPE UUID USING chapter_id::UUID;
ALTER TABLE concept_releases ALTER COLUMN concept_id TYPE UUID USING concept_id::UUID;
ALTER TABLE concept_releases ALTER COLUMN teacher_id TYPE UUID USING teacher_id::UUID;

ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE concept_releases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE concept_releases ADD CONSTRAINT fk_concept_releases_class
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE concept_releases ADD CONSTRAINT fk_concept_releases_textbook
  FOREIGN KEY (textbook_id) REFERENCES textbooks(id) ON DELETE CASCADE;
ALTER TABLE concept_releases ADD CONSTRAINT fk_concept_releases_chapter
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE;
ALTER TABLE concept_releases ADD CONSTRAINT fk_concept_releases_concept
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE;
ALTER TABLE concept_releases ADD CONSTRAINT fk_concept_releases_teacher
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- =========================================================================
-- 1.5 — FK constraints on junction tables
-- =========================================================================
ALTER TABLE student_class_enrollments ADD CONSTRAINT fk_enrollments_class
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_teachers ADD CONSTRAINT fk_class_teachers_class
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_class
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_subject
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE teacher_class_subject_assignments ADD CONSTRAINT fk_tcsa_class
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE teacher_class_subject_assignments ADD CONSTRAINT fk_tcsa_subject
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE timetable ADD CONSTRAINT fk_timetable_class
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE timetable ADD CONSTRAINT fk_timetable_subject
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

-- =========================================================================
-- 1.6 — FK constraints on typed tables
-- =========================================================================
ALTER TABLE textbooks ADD CONSTRAINT fk_textbooks_subject
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT;
ALTER TABLE textbooks ADD CONSTRAINT fk_textbooks_class
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT;

-- notifications.userId is TEXT, convert to UUID then add FK
ALTER TABLE notifications ALTER COLUMN "userId" TYPE UUID USING "userId"::UUID;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- subjects.classId and teacherId are TEXT, convert to UUID then add FKs
ALTER TABLE subjects ALTER COLUMN "classId" TYPE UUID USING "classId"::UUID;
ALTER TABLE subjects ALTER COLUMN "teacherId" TYPE UUID USING "teacherId"::UUID;
ALTER TABLE subjects ADD CONSTRAINT fk_subjects_class
  FOREIGN KEY ("classId") REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE subjects ADD CONSTRAINT fk_subjects_teacher
  FOREIGN KEY ("teacherId") REFERENCES users(id) ON DELETE SET NULL;

-- =========================================================================
-- 1.7 — UNIQUE(email) on users
-- =========================================================================
-- Only applies to non-null emails (null emails are allowed for Firebase-only users)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email != '';

-- =========================================================================
-- 1.8 — UNIQUE(studentId) on users
-- =========================================================================
-- student_id is nullable for non-students
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id_unique ON users(student_id) WHERE student_id IS NOT NULL AND student_id != '';

-- =========================================================================
-- 1.9 — RLS on concept tables: replace FOR SELECT USING (true) with school-scoped
-- =========================================================================
DROP POLICY IF EXISTS "Public read for concepts if textbook is visible" ON concepts;
DROP POLICY IF EXISTS "Public read for chapters if textbook is visible" ON chapters;
DROP POLICY IF EXISTS "Public read for concept questions" ON concept_questions;
DROP POLICY IF EXISTS "Public read for concept videos" ON concept_videos;
DROP POLICY IF EXISTS "Public read for concept notes" ON concept_notes;
DROP POLICY IF EXISTS "Public read for concept resources" ON concept_resources;

-- School-scoped SELECT for all concept tables (uses school_id from auth.jwt)
CREATE POLICY "School-scoped select concepts" ON concepts
  FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped select chapters" ON chapters
  FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped select concept_questions" ON concept_questions
  FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped select concept_videos" ON concept_videos
  FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped select concept_notes" ON concept_notes
  FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped select concept_resources" ON concept_resources
  FOR SELECT USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- Allow INSERT/UPDATE/DELETE for teachers/admins in the same school
CREATE POLICY "School-scoped write concepts" ON concepts
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID)
  WITH CHECK (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped write chapters" ON chapters
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID)
  WITH CHECK (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped write concept_questions" ON concept_questions
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID)
  WITH CHECK (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped write concept_videos" ON concept_videos
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID)
  WITH CHECK (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped write concept_notes" ON concept_notes
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID)
  WITH CHECK (school_id = (auth.jwt() ->> 'school_id')::UUID);
CREATE POLICY "School-scoped write concept_resources" ON concept_resources
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID)
  WITH CHECK (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- =========================================================================
-- 1.10 — RLS on all missing tables
-- =========================================================================

-- Fee structures
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped fee_structures" ON fee_structures
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- Fee payments
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped fee_payments" ON fee_payments
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- Notice board
ALTER TABLE notice_board ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped notice_board" ON notice_board
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- Transport
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped transport_routes" ON transport_routes
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE transport_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped transport_stops" ON transport_stops
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE transport_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped transport_assignments" ON transport_assignments
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE transport_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped transport_attendance" ON transport_attendance
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- Inventory
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped suppliers" ON suppliers
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped inventory_categories" ON inventory_categories
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped inventory_items" ON inventory_items
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE inventory_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped inventory_usage_log" ON inventory_usage_log
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- Staff
ALTER TABLE staff_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped staff_records" ON staff_records
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped staff_attendance" ON staff_attendance
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped leave_requests" ON leave_requests
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE salary_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped salary_config" ON salary_config
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped payroll_runs" ON payroll_runs
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- Curriculum
ALTER TABLE curriculum_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped curriculum_plans" ON curriculum_plans
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped concept_mastery" ON concept_mastery
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- AI tutor
ALTER TABLE ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
-- User-level policy for tutor sessions (own sessions, or school-scoped for admins)
CREATE POLICY "User-scoped ai_tutor_sessions" ON ai_tutor_sessions
  FOR ALL USING (user_id = auth.uid());

-- Devices
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
-- Users can manage their own device tokens
CREATE POLICY "User-scoped device_tokens" ON device_tokens
  FOR ALL USING (user_id = auth.uid());

-- Notification prefs
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User-scoped notification_preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Virtual labs
ALTER TABLE virtual_lab_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User-scoped virtual_lab_progress" ON virtual_lab_progress
  FOR ALL USING (student_id = auth.uid());

-- Pre-primary
ALTER TABLE pre_primary_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped pre_primary_content" ON pre_primary_content
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- Coding challenges
ALTER TABLE coding_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read coding_challenges" ON coding_challenges
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write coding_challenges" ON coding_challenges
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

-- Reference data (curriculum hierarchy, boards, publishers)
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read boards" ON boards
  FOR SELECT USING (auth.role() = 'authenticated');
ALTER TABLE curriculum_hierarchy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read curriculum_hierarchy" ON curriculum_hierarchy
  FOR SELECT USING (auth.role() = 'authenticated');
ALTER TABLE publisher_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read publisher_references" ON publisher_references
  FOR SELECT USING (auth.role() = 'authenticated');

-- Security tables (revoked_tokens, user_mfa)
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only revoked_tokens" ON revoked_tokens
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User-scoped user_mfa" ON user_mfa
  FOR ALL USING (user_id = auth.uid());

-- processing_jobs & raw_pages already have RLS from schema.sql
-- Add school-scoped policies to them
DROP POLICY IF EXISTS "Admins have full access to all tables" ON processing_jobs;
DROP POLICY IF EXISTS "Admins have full access to all tables" ON raw_pages;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped processing_jobs" ON processing_jobs
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);
ALTER TABLE raw_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped raw_pages" ON raw_pages
  FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::UUID);

-- =========================================================================
-- 1.11 — RLS on junction tables
-- =========================================================================
ALTER TABLE student_class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped student_class_enrollments" ON student_class_enrollments
  FOR ALL USING (class_id IN (SELECT id FROM classes WHERE school_id = (auth.jwt() ->> 'school_id')::UUID));
ALTER TABLE class_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped class_teachers" ON class_teachers
  FOR ALL USING (class_id IN (SELECT id FROM classes WHERE school_id = (auth.jwt() ->> 'school_id')::UUID));
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped class_subjects" ON class_subjects
  FOR ALL USING (class_id IN (SELECT id FROM classes WHERE school_id = (auth.jwt() ->> 'school_id')::UUID));
ALTER TABLE teacher_class_subject_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped teacher_class_subject_assignments" ON teacher_class_subject_assignments
  FOR ALL USING (class_id IN (SELECT id FROM classes WHERE school_id = (auth.jwt() ->> 'school_id')::UUID));
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School-scoped timetable" ON timetable
  FOR ALL USING (class_id IN (SELECT id FROM classes WHERE school_id = (auth.jwt() ->> 'school_id')::UUID));

-- =========================================================================
-- 1.12 — Revoke EXECUTE ON FUNCTION set_tutorial_seen() FROM anon
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.set_tutorial_seen() FROM anon;

-- =========================================================================
-- 1.13 — Indexes on FKs, school_id, status, created_at, updated_at
-- =========================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Textbooks
CREATE INDEX IF NOT EXISTS idx_textbooks_created_at ON textbooks(created_at);

-- Chapters
CREATE INDEX IF NOT EXISTS idx_chapters_created_at ON chapters(created_at);

-- Concepts
CREATE INDEX IF NOT EXISTS idx_concepts_school_id ON concepts(school_id);
CREATE INDEX IF NOT EXISTS idx_concepts_created_at ON concepts(created_at);

-- Concept notes
CREATE INDEX IF NOT EXISTS idx_concept_notes_school_id ON concept_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_concept_notes_created_at ON concept_notes(created_at);

-- Concept videos
CREATE INDEX IF NOT EXISTS idx_concept_videos_school_id ON concept_videos(school_id);
CREATE INDEX IF NOT EXISTS idx_concept_videos_created_at ON concept_videos(created_at);

-- Concept questions
CREATE INDEX IF NOT EXISTS idx_concept_questions_school_id ON concept_questions(school_id);
CREATE INDEX IF NOT EXISTS idx_concept_questions_created_at ON concept_questions(created_at);
CREATE INDEX IF NOT EXISTS idx_concept_questions_type ON concept_questions(type);
CREATE INDEX IF NOT EXISTS idx_concept_questions_difficulty ON concept_questions(difficulty);

-- Concept resources
CREATE INDEX IF NOT EXISTS idx_concept_resources_school_id ON concept_resources(school_id);
CREATE INDEX IF NOT EXISTS idx_concept_resources_created_at ON concept_resources(created_at);

-- Concept releases
CREATE INDEX IF NOT EXISTS idx_concept_releases_created_at ON concept_releases(created_at);
CREATE INDEX IF NOT EXISTS idx_concept_releases_updated_at ON concept_releases(updated_at);

-- Classes
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_created_at ON classes(created_at);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);

-- Subjects
CREATE INDEX IF NOT EXISTS idx_subjects_created_at ON subjects(created_at);
CREATE INDEX IF NOT EXISTS idx_subjects_status ON subjects(status);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_created_at ON student_class_enrollments(created_at);
CREATE INDEX IF NOT EXISTS idx_class_teachers_created_at ON class_teachers(created_at);
CREATE INDEX IF NOT EXISTS idx_class_subjects_created_at ON class_subjects(created_at);
CREATE INDEX IF NOT EXISTS idx_tcsa_created_at ON teacher_class_subject_assignments(created_at);
CREATE INDEX IF NOT EXISTS idx_timetable_created_at ON timetable(created_at);
CREATE INDEX IF NOT EXISTS idx_timetable_day_period ON timetable(day, period);

-- Lessons (new physical table)
CREATE INDEX IF NOT EXISTS idx_lessons_school_id ON lessons(school_id);
CREATE INDEX IF NOT EXISTS idx_lessons_textbook_id ON lessons(textbook_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at);

-- Assignments (new physical table)
CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_chapter_id ON assignments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_textbook_id ON assignments(textbook_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON assignments(created_at);

-- Quizzes (new physical table)
CREATE INDEX IF NOT EXISTS idx_quizzes_school_id ON quizzes(school_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id ON quizzes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject_id ON quizzes(subject_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);

-- Exams (new physical table)
CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at);

-- Indexes for fee_structures
CREATE INDEX IF NOT EXISTS idx_fee_structures_school_id ON fee_structures(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_created_at ON fee_structures(created_at);

-- Indexes for fee_payments
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_id ON fee_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee_structure ON fee_payments(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_created_at ON fee_payments(created_at);

-- Indexes for notice_board
CREATE INDEX IF NOT EXISTS idx_notice_board_school_id ON notice_board(school_id);
CREATE INDEX IF NOT EXISTS idx_notice_board_created_by ON notice_board(created_by);
CREATE INDEX IF NOT EXISTS idx_notice_board_created_at ON notice_board(created_at);

-- Indexes for transport
CREATE INDEX IF NOT EXISTS idx_transport_stops_school ON transport_stops(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_assignments_school ON transport_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_assignments_route ON transport_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_attendance_school ON transport_attendance(school_id);

-- Indexes for inventory
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_log_created ON inventory_usage_log(created_at);

-- Indexes for staff
CREATE INDEX IF NOT EXISTS idx_staff_records_user ON staff_records(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON payroll_runs(month);

-- Indexes for curriculum
CREATE INDEX IF NOT EXISTS idx_curriculum_plans_academic_year ON curriculum_plans(academic_year);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_concept ON concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_last_reviewed ON concept_mastery(last_reviewed_at);

-- Indexes for ai_tutor
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_concept ON ai_tutor_sessions(concept_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_created ON ai_tutor_sessions(created_at);

-- Indexes for device_tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_school ON device_tokens(school_id);

-- Indexes for virtual_lab_progress
CREATE INDEX IF NOT EXISTS idx_vlab_progress_lab ON virtual_lab_progress(lab_id);

-- =========================================================================
-- 1.14 — CHECK constraints on TEXT status/type/difficulty fields
-- =========================================================================

-- concept_questions: type and difficulty
ALTER TABLE concept_questions DROP CONSTRAINT IF EXISTS chk_concept_questions_type;
ALTER TABLE concept_questions ADD CONSTRAINT chk_concept_questions_type
  CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_in_the_blank', 'match_following', 'numerical'));
ALTER TABLE concept_questions DROP CONSTRAINT IF EXISTS chk_concept_questions_difficulty;
ALTER TABLE concept_questions ADD CONSTRAINT chk_concept_questions_difficulty
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- classes: status
ALTER TABLE classes DROP CONSTRAINT IF EXISTS chk_classes_status;
ALTER TABLE classes ADD CONSTRAINT chk_classes_status
  CHECK (status IN ('active', 'archived', 'deleted'));

-- subjects: type
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS chk_subjects_type;
ALTER TABLE subjects ADD CONSTRAINT chk_subjects_type
  CHECK (type IN ('core', 'elective', 'co-curricular', 'vocational'));

-- lessons: status
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS chk_lessons_status;
ALTER TABLE lessons ADD CONSTRAINT chk_lessons_status
  CHECK (status IN ('active', 'archived', 'deleted'));

-- assignments: status
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS chk_assignments_status;
ALTER TABLE assignments ADD CONSTRAINT chk_assignments_status
  CHECK (status IN ('draft', 'published', 'archived', 'deleted'));

-- assignments: content_type
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS chk_assignments_content_type;
ALTER TABLE assignments ADD CONSTRAINT chk_assignments_content_type
  CHECK (allow_late_submission IS NULL OR late_penalty_percent >= 0);

-- quizzes: status
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS chk_quizzes_status;
ALTER TABLE quizzes ADD CONSTRAINT chk_quizzes_status
  CHECK (status IN ('draft', 'published', 'archived', 'deleted'));

-- exams: status
ALTER TABLE exams DROP CONSTRAINT IF EXISTS chk_exams_status;
ALTER TABLE exams ADD CONSTRAINT chk_exams_status
  CHECK (status IN ('draft', 'published', 'archived', 'deleted'));

-- notifications: type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type
  CHECK (type IN ('info', 'warning', 'success', 'error'));

-- =========================================================================
-- 1.15 — Remove redundant class_ids TEXT[] and class_id TEXT from users
-- =========================================================================
-- These fields are superseded by the student_class_enrollments junction table.
-- Zero out values and mark deprecated via default.
UPDATE users SET class_ids = '{}', class_id = ''
WHERE class_ids != '{}' OR class_id IS NOT NULL AND class_id != '';
ALTER TABLE users ALTER COLUMN class_ids SET DEFAULT '{}';
ALTER TABLE users ALTER COLUMN class_id SET DEFAULT '';

-- =========================================================================
-- 1.16 — Unique partial indexes for business rules
-- =========================================================================
-- One active primary teacher per class
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_primary_teacher_per_class
  ON class_teachers (class_id) WHERE role = 'primary' AND status = 'active';

-- One active enrollment per student per academic year
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_enrollment_per_year
  ON student_class_enrollments (student_id, academic_year) WHERE status = 'active';
