-- 019_cascade_deletes_and_fixes.sql
-- Add cascading deletes and nullification behavior on references to users and concepts

-- textbooks table -> teacher_id
ALTER TABLE textbooks DROP CONSTRAINT IF EXISTS textbooks_teacher_id_fkey;
ALTER TABLE textbooks ADD CONSTRAINT textbooks_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- student_class_enrollments table -> student_id
ALTER TABLE student_class_enrollments DROP CONSTRAINT IF EXISTS student_class_enrollments_student_id_fkey;
ALTER TABLE student_class_enrollments ADD CONSTRAINT student_class_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- class_teachers table -> teacher_id
ALTER TABLE class_teachers DROP CONSTRAINT IF EXISTS class_teachers_teacher_id_fkey;
ALTER TABLE class_teachers ADD CONSTRAINT class_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- teacher_class_subject_assignments table -> teacher_id
ALTER TABLE teacher_class_subject_assignments DROP CONSTRAINT IF EXISTS teacher_class_subject_assignments_teacher_id_fkey;
ALTER TABLE teacher_class_subject_assignments ADD CONSTRAINT teacher_class_subject_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- fee_payments table -> student_id
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_fkey;
ALTER TABLE fee_payments ADD CONSTRAINT fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- notice_board table -> created_by
ALTER TABLE notice_board DROP CONSTRAINT IF EXISTS notice_board_created_by_fkey;
ALTER TABLE notice_board ADD CONSTRAINT notice_board_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- coding_challenges table -> created_by
ALTER TABLE coding_challenges DROP CONSTRAINT IF EXISTS coding_challenges_created_by_fkey;
ALTER TABLE coding_challenges ADD CONSTRAINT coding_challenges_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- user_mfa table -> user_id
ALTER TABLE user_mfa DROP CONSTRAINT IF EXISTS user_mfa_user_id_fkey;
ALTER TABLE user_mfa ADD CONSTRAINT user_mfa_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- concept_mastery table -> student_id
ALTER TABLE concept_mastery DROP CONSTRAINT IF EXISTS concept_mastery_student_id_fkey;
ALTER TABLE concept_mastery ADD CONSTRAINT concept_mastery_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- concept_mastery table -> concept_id
ALTER TABLE concept_mastery DROP CONSTRAINT IF EXISTS concept_mastery_concept_id_fkey;
ALTER TABLE concept_mastery ADD CONSTRAINT concept_mastery_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE;

-- virtual_lab_progress table -> student_id
ALTER TABLE virtual_lab_progress DROP CONSTRAINT IF EXISTS virtual_lab_progress_student_id_fkey;
ALTER TABLE virtual_lab_progress ADD CONSTRAINT virtual_lab_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
