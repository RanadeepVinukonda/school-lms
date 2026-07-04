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

### Requirement: Typed table mapping is complete
The `TYPED_TABLES` set and `TABLE_NAME_MAP` in the adapter SHALL include all typed SQL tables from `schema.sql`.

#### Scenario: New typed tables are discoverable
- **WHEN** a new SQL table is added to `schema.sql`
- **THEN** it SHALL be added to `TYPED_TABLES` in the adapter
- **THEN** writes to that table SHALL go to the typed table, not `nosql_docs`

### Requirement: No data fragmentation between tables
All document writes for a given collection SHALL go to exactly one table (`nosql_docs` or the typed table), never split.

#### Scenario: Writes are consistent
- **WHEN** a document is written to collection `users`
- **THEN** it SHALL NOT also exist in a separate document store table

### Requirement: nosql_docs is the single document store table
The adapter SHALL use `nosql_docs` as the single document store table. The `firestore_docs` table SHALL NOT be referenced in queries, views, or migrations.

#### Scenario: Views reference nosql_docs
- **WHEN** `create_views.sql` executes
- **THEN** all views SHALL reference `nosql_docs`
- **THEN** no view SHALL reference `firestore_docs`

### Requirement: Single migration system
All migrations SHALL reside in `supabase/migrations/`. The root `migrations/` directory SHALL be removed after verifying table coverage.

#### Scenario: Only one migration directory is active
- **WHEN** `migrate.ts` runs migrations
- **THEN** it SHALL only read from `supabase/migrations/`
- **THEN** no duplicate table creation SHALL exist across directories
