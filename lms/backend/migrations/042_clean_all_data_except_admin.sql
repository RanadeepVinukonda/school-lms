-- Clean all data except admin credentials
-- Preserves: schools(00000000-0000-0000-0000-000000000001), users(00000000-0000-0000-0000-000000000002)
BEGIN;

-- Remove FK-dependent data via non-admin user deletion (CASCADE handles child tables)
DELETE FROM users WHERE id != '00000000-0000-0000-0000-000000000002';

-- Clean remaining non-user-dependent tables
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'classes', 'subjects', 'boards',
    'student_class_enrollments', 'class_teachers', 'class_subjects',
    'teacher_class_subject_assignments',
    'timetable', 'attendance',
    'fee_structures', 'fee_payments',
    'staff_records', 'staff_attendance', 'leave_requests',
    'salary_config', 'payroll_runs',
    'textbooks', 'chapters', 'lessons', 'assignments', 'quizzes', 'exams', 'exam_attempts',
    'curriculum_plans', 'curriculum_hierarchy', 'publisher_references',
    'concepts', 'concept_releases', 'concept_notes', 'concept_videos',
    'concept_questions', 'concept_resources', 'concept_mastery',
    'processing_jobs', 'raw_pages',
    'notifications', 'messages', 'notice_board',
    'transport_routes', 'transport_stops', 'transport_assignments', 'transport_attendance',
    'suppliers', 'inventory_categories', 'inventory_items', 'inventory_usage_log',
    'ai_tutor_sessions', 'tutor_response_cache', 'pre_primary_content', 'pre_primary_progress',
    'coding_projects', 'coding_challenges', 'coding_project_collaborators',
    'virtual_lab_progress', 'device_tokens', 'notification_preferences',
    'user_mfa', 'whiteboards', 'mindmaps', 'mindmap_shares', 'mindmap_resources',
    'concept_progress', 'test_templates', 'test_schedule',
    'question_bank', 'question_papers', 'unified_tests', 'unified_test_attempts',
    'lti_credentials', 'firestore_docs', 'auditLogs', 'revoked_tokens', 'idempotency_keys',
    'user_badges', 'user_streaks', 'user_challenge_completions',
    'gamification_profiles', 'daily_challenges', 'weekly_challenges', 'monthly_challenges',
    'subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = t) THEN
      EXECUTE format('TRUNCATE TABLE %I CASCADE', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
