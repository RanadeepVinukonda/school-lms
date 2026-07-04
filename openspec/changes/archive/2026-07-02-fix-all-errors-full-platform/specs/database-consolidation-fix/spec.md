## ADDED Requirements

### Requirement: nosql_docs is the single document store table
All adapter writes to untyped collections SHALL go to `nosql_docs`. The `firestore_docs` table name SHALL NOT be referenced in any query, view, or migration.

#### Scenario: Views query the correct table
- **WHEN** any view queries document data
- **THEN** it SHALL reference `nosql_docs`, not `firestore_docs`

### Requirement: nosql_docs table is created by a migration
There SHALL be a migration that creates the `nosql_docs` table before any migration that creates indexes on it.

#### Scenario: Migration 011 does not fail
- **WHEN** running migration 011
- **THEN** the `nosql_docs` table SHALL already exist
- **THEN** index creation on `nosql_docs` SHALL succeed

### Requirement: Single migration system
All migrations SHALL live in `supabase/migrations/`. The root `migrations/` directory SHALL be removed after verifying no required tables are defined only there.

#### Scenario: Only supabase/migrations/ is active
- **WHEN** migrate.ts runs
- **THEN** it SHALL only read from `supabase/migrations/`
- **THEN** root `migrations/` SHALL NOT exist or SHALL be empty

### Requirement: Missing indexes on high-traffic columns
Indexes SHALL exist on: `subjects(classId)`, `subjects(teacherId)`, `notifications(userId)`, `auditLogs(targetId)`, `auditLogs(targetType)`, `auditLogs(performedBy)`, `classes(status)`, `classes(grade)`.

#### Scenario: Queries use indexes
- **WHEN** querying notifications by userId
- **THEN** the query plan SHALL use an index scan, not a sequential scan
