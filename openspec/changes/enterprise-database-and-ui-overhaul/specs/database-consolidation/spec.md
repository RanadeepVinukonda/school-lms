## ADDED Requirements

### Requirement: Full normalization replaces hybrid model
The database SHALL migrate from the current hybrid SQL/JSONB model to a fully normalized relational schema. All core entities (classes, sections, students, teachers, attendance, fees, exams, timetable, assignments) SHALL have dedicated typed SQL tables. The `nosql_docs` table SHALL be retained only for truly dynamic content (user preferences, gamification metadata).

#### Scenario: Core entities are typed tables
- **WHEN** the schema migration runs
- **THEN** all core entities SHALL have dedicated typed SQL tables with proper foreign keys
- **THEN** no core entity data SHALL reside in `nosql_docs`

### Requirement: All array columns replaced
All `TEXT[]` array columns SHALL be removed and replaced with junction tables enforcing referential integrity.

#### Scenario: Array columns are migrated
- **WHEN** the migration runs
- **THEN** `users.class_ids` SHALL be removed and replaced by `class_students` junction table
- **THEN** any other `TEXT[]` columns SHALL be similarly replaced

## MODIFIED Requirements

### Requirement: Single unified database adapter
The codebase SHALL have exactly one database adapter module. All read and write operations SHALL route through `database/adapter.ts`.

#### Scenario: All imports point to the new adapter
- **WHEN** TypeScript compiles the backend
- **THEN** no file SHALL import from `../firebase/firestore`, `../firebase/auth`, or `../firebase/admin`
- **THEN** all imports SHALL use `../database/adapter`, `../database/auth`, or `../database/admin`

#### Scenario: Old adapter files are removed
- **WHEN** the codebase is scanned
- **THEN** `firebase/firestore.ts`, `firebase/auth.ts`, and `firebase/admin.ts` SHALL NOT exist

### Requirement: Typed table mapping includes all new tables
The `TYPED_TABLES` set and `TABLE_NAME_MAP` in the adapter SHALL include all typed SQL tables from the new normalized schema.

#### Scenario: New typed tables are discoverable
- **WHEN** a new SQL table is added to schema
- **THEN** it SHALL be added to `TYPED_TABLES` in the adapter
- **THEN** writes to that table SHALL go to the typed table, not `nosql_docs`

### Requirement: No data fragmentation between tables
All document writes for a given collection SHALL go to exactly one table (`nosql_docs` or the typed table), never split.

#### Scenario: Writes are consistent
- **WHEN** a document is written to collection `users`
- **THEN** it SHALL NOT also exist in a separate document store table
