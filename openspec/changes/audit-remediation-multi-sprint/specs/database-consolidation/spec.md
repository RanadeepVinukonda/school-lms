## ADDED Requirements

### Requirement: Foreign keys on all typed tables
All UUID columns referencing another table SHALL have explicit `REFERENCES <table>(id) ON DELETE CASCADE` constraints. This includes `concept_releases`, junction tables (`student_class_enrollments`, `class_teachers`, `class_subjects`, `teacher_class_subject_assignments`, `timetable`), and all typed tables.

#### Scenario: FK constraint prevents orphan
- **WHEN** a row is inserted with a FK value that doesn't exist in the referenced table
- **THEN** the FK constraint SHALL reject the insert with a foreign key violation

### Requirement: RLS on all school-scoped tables
Every table with a `school_id` column SHALL have RLS enabled with a policy that checks `school_id = current_setting('app.school_id')::UUID`. The `FOR SELECT USING (true)` policy on concept tables SHALL be replaced with school-scoped policies.

#### Scenario: RLS blocks cross-school access
- **WHEN** an authenticated user queries a table with school_id RLS
- **THEN** only rows matching the user's school SHALL be returned

### Requirement: Array columns deprecated
All `TEXT[]` columns SHALL be read-only. New code SHALL use junction tables exclusively.

#### Scenario: New enrollment uses junction table
- **WHEN** a student is assigned to a class
- **THEN** the assignment SHALL create a row in `student_class_enrollments`
- **THEN** `users.class_ids` SHALL NOT be modified

## MODIFIED Requirements

### Requirement: Single unified database adapter
The codebase SHALL have exactly one database adapter module. All read and write operations SHALL route through `database/adapter.ts`. The adapter SHALL also enforce school_id scoping for all queries.

#### Scenario: All imports point to the new adapter
- **WHEN** TypeScript compiles the backend
- **THEN** no file SHALL import from `../firebase/firestore`, `../firebase/auth`, or `../firebase/admin`
- **THEN** all imports SHALL use `../database/adapter`, `../database/auth`, or `../database/admin`

#### Scenario: Old adapter files are removed
- **WHEN** the codebase is scanned
- **THEN** `firebase/firestore.ts`, `firebase/auth.ts`, and `firebase/admin.ts` SHALL NOT exist

### Requirement: Typed table mapping is complete
The `TYPED_TABLES` set and `TABLE_NAME_MAP` in the adapter SHALL include all typed SQL tables from the schema. New tables from schema fixes SHALL be added.

#### Scenario: New typed tables are discoverable
- **WHEN** a new SQL table is added
- **THEN** it SHALL be added to `TYPED_TABLES` in the adapter
- **THEN** writes to that table SHALL go to the typed table, not `nosql_docs`

### Requirement: No data fragmentation between tables
All document writes for a given collection SHALL go to exactly one table (`nosql_docs` or the typed table), never split.

#### Scenario: Writes are consistent
- **WHEN** a document is written to collection `users`
- **THEN** it SHALL NOT also exist in a separate document store table
