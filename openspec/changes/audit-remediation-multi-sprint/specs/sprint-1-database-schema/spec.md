## ADDED Requirements

### Requirement: All foreign keys added to typed tables
Every `UUID` column referencing another table SHALL have an explicit `REFERENCES <table>(id) ON DELETE CASCADE` constraint.

#### Scenario: FK prevents orphaned records
- **WHEN** a row is inserted with a `textbook_id` referencing a non-existent textbook
- **THEN** the FK constraint SHALL reject the insert

### Requirement: All junction tables have complete FKs
Tables `student_class_enrollments`, `class_teachers`, `class_subjects`, `teacher_class_subject_assignments`, `timetable` SHALL have FKs to `classes(id)` and `subjects(id)`.

#### Scenario: Junction table enforces referential integrity
- **WHEN** a row is inserted in `class_teachers` with a non-existent `class_id`
- **THEN** the FK SHALL reject the insert

### Requirement: RLS policies on all school-scoped tables
All 20+ tables with `school_id` SHALL have RLS policies enforcing `school_id = current_setting('app.school_id')::UUID`.

#### Scenario: Cross-school read is blocked
- **WHEN** a user from School A queries a table with RLS enabled
- **THEN** only rows with School A's `school_id` SHALL be returned

### Requirement: Migration ordering fixed
A single new migration SHALL create all tables that existing migrations reference but don't define, allowing both migration directories to be applied independently.

#### Scenario: Migrations apply without errors
- **WHEN** either migration directory is applied
- **THEN** no `relation does not exist` errors SHALL occur

### Requirement: SECURITY DEFINER function access revoked
The `set_tutorial_seen()` function SHALL have `EXECUTE` revoked from `anon` and granted only to `authenticated`.

#### Scenario: Unauthenticated user cannot execute
- **WHEN** the `anon` role attempts to execute `set_tutorial_seen()`
- **THEN** the call SHALL be denied with a permission error

### Requirement: `users.email` has UNIQUE constraint
The `users` table SHALL have a `UNIQUE(email)` constraint.

#### Scenario: Duplicate email prevented
- **WHEN** a user is created with an existing email
- **THEN** the unique constraint SHALL reject the insert

### Requirement: Array columns deprecated in favor of junction tables
All `TEXT[]` columns SHALL be marked deprecated. No new code SHALL write to them. All reads SHALL use junction tables.

#### Scenario: New code uses junction tables
- **WHEN** a new enrollment is created
- **THEN** it SHALL insert into `student_class_enrollments`, not append to `users.class_ids`
