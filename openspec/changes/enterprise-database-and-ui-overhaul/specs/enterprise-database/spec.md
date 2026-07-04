## ADDED Requirements

### Requirement: All business tables have school_id with RLS
Every table containing school-scoped data SHALL include a `school_id UUID REFERENCES schools(id)` column. Row-Level Security SHALL be enabled on all tables. RLS policies SHALL enforce `school_id = current_setting('app.school_id')::UUID`.

#### Scenario: Cross-school data access is blocked
- **WHEN** a user from School A queries any business table
- **THEN** RLS policies SHALL filter rows to only those with School A's school_id
- **THEN** School B's data SHALL not be visible

### Requirement: RBAC replaces single role field
The `users` table SHALL remove the `role` column. New tables `roles`, `permissions`, `role_permissions`, and `user_roles` SHALL be created. A user SHALL be able to hold multiple roles. Permissions SHALL be scoped per school.

#### Scenario: User has multiple roles
- **WHEN** a user is both a teacher and a parent
- **THEN** the system SHALL grant access to both teacher and parent features
- **THEN** the JWT SHALL include all active roles

### Requirement: Array columns replaced with junction tables
All `TEXT[]` array columns in the current schema SHALL be replaced with proper junction tables: `parent_student_relationships`, `teacher_class_assignments`, `teacher_subject_assignments`, `class_students`.

#### Scenario: Student belongs to a class
- **WHEN** a student is assigned to Class 5-A
- **THEN** a row SHALL exist in `class_students` linking the student to the class-section combination
- **THEN** `users.class_ids` SHALL not be used

### Requirement: Core entity tables created
New tables SHALL be created: `classes`, `sections`, `subjects`, `grades`, `academic_years`, `terms`, `semesters`.

#### Scenario: Class and section are separate tables
- **WHEN** an admin creates Class 5 and Section A
- **THEN** the display name "Class 5-A" SHALL be derived as `CONCAT(classes.name, '-', sections.name)`
- **THEN** each class-section combination SHALL have a unique ID

### Requirement: Business logic constraints enforced at DB level
Unique, check, and foreign key constraints SHALL enforce: one active enrollment per student per academic year, one primary class teacher per class, unique student roll numbers within class+academic year, fee payments not exceeding due amount, payroll once per employee per month, transport attendance limited to one record per route+date+direction.

#### Scenario: Duplicate enrollment prevented
- **WHEN** an admin attempts to enroll a student in two classes in the same academic year
- **THEN** the unique constraint SHALL reject the second enrollment

### Requirement: Comprehensive indexing strategy
Indexes SHALL be created on: all foreign keys, school_id, status, created_at, updated_at, all search columns. Composite indexes SHALL cover common query patterns.

#### Scenario: Analytics queries are performant
- **WHEN** an analytics query filters by school_id, academic_year_id, and class_id
- **THEN** the composite index SHALL be used for the query

### Requirement: Audit and activity logging
Tables `audit_logs`, `activity_logs`, and `login_history` SHALL be created. All data mutations by users SHALL be logged with timestamp, user_id, action, table_name, record_id, old_values, and new_values.

#### Scenario: Teacher update is audited
- **WHEN** a teacher updates a student's attendance record
- **THEN** an audit_log entry SHALL record the change with before/after values

### Requirement: Dedicated attendance module tables
Tables `student_attendance`, `attendance_sessions`, and `attendance_exceptions` SHALL be created, replacing the JSONB-based attendance storage.

#### Scenario: Attendance recorded per session
- **WHEN** a teacher marks attendance for a class
- **THEN** each student's status (present/absent/late/excused) SHALL be stored in `student_attendance` linked to an `attendance_sessions` record

### Requirement: Examination module tables
Tables `exams`, `exam_subjects`, `marks`, `report_cards`, `grading_rules` SHALL be created with proper foreign key relationships.

#### Scenario: Exam marks recorded
- **WHEN** a teacher enters marks for a student in an exam subject
- **THEN** the mark SHALL be stored in `marks` with foreign keys to `students`, `exam_subjects`, and `grading_rules`

### Requirement: Fee management tables
Tables `fee_categories`, `invoices`, `invoice_items`, `discounts`, `scholarships`, `transactions` SHALL be created.

#### Scenario: Fee payment recorded
- **WHEN** a fee payment is recorded against an invoice
- **THEN** the payment SHALL be stored in `transactions` with the invoice_id, amount, and payment method

### Requirement: AI and embeddings tables
Tables `embeddings` (with vector column), `tutor_messages`, and `retrieval_logs` SHALL be created for AI tutor functionality.

#### Scenario: Tutor message stored
- **WHEN** a student sends a message to the AI tutor
- **THEN** the message SHALL be stored in `tutor_messages` with student_id, message text, and AI response

### Requirement: Partitioning strategy for large tables
Tables expected to grow beyond 10M rows (student_attendance, audit_logs, marks, transactions) SHALL use PostgreSQL partitioning by academic_year_id or by month.

#### Scenario: Attendance table is partitioned
- **WHEN** attendance data is queried for a specific month
- **THEN** PostgreSQL partition pruning SHALL limit the scan to the relevant partition
