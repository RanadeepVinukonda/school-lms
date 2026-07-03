## ADDED Requirements

### Requirement: Cascading Deletes for Users and Concepts
The database schema SHALL define foreign key constraints with `ON DELETE CASCADE` or `ON DELETE SET NULL` on all tables referencing `users` or `concepts` where strict references would otherwise block deletion.

#### Scenario: User deletion cascades to related records
- **WHEN** a user profile is deleted from the `users` table
- **THEN** all associated records in `textbooks`, `student_class_enrollments`, `class_teachers`, `teacher_class_subject_assignments`, `fee_payments`, `notice_board`, `coding_challenges`, `user_mfa`, `concept_mastery`, and `virtual_lab_progress` SHALL be automatically deleted or updated via cascading constraints
