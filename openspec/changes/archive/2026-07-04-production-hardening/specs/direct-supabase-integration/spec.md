## ADDED Requirements

### Requirement: Service-role client restricted to admin operations
The system SHALL provide two Supabase clients. `getSupabaseClient()` SHALL use the anon key and respect RLS policies. `getSupabaseAdmin()` SHALL use the service-role key and be restricted to cron jobs, system migrations, and admin-only operations.

#### Scenario: Anon client returns user-scoped data
- **WHEN** a service calls `getSupabaseClient()` and requests data
- **THEN** the query is executed with the anon key and RLS policies apply

#### Scenario: Admin client used only by authorized callers
- **WHEN** a background job calls `getSupabaseAdmin()`
- **THEN** it bypasses RLS and has full access

### Requirement: Direct Supabase calls replace adapter
All services SHALL use `supabase.from('table').select('*').eq('column', value)` directly instead of `collections.x().doc(id).get()`. The adapter layer files (adapter.ts, query-builder.ts, transaction-manager.ts, registry.ts, schema.ts) SHALL be removed after migration.

#### Scenario: Service reads a single record
- **WHEN** service needs to fetch a user by ID
- **THEN** it calls `supabase.from('users').select('*').eq('id', userId).single()`

#### Scenario: Service queries with filters
- **WHEN** service needs to list attendance records for a class and date
- **THEN** it calls `supabase.from('attendance').select('*').eq('class_id', classId).eq('date', date)`

### Requirement: Typed table metadata as single source of truth
The typed table schemas in `database/schema.ts` SHALL be the single source of truth for column names and types. All direct Supabase queries SHALL reference column names from TYPED_TABLES. No camelCase/snake_case conversion layer SHALL exist.

#### Scenario: Column naming is consistent
- **WHEN** a service writes a Supabase query
- **THEN** it uses the exact column name as defined in the typed tables (snake_case for DB columns)

### Requirement: nosql_docs migration to typed tables
All data currently stored in the `nosql_docs` JSONB table SHALL be migrated to typed tables. A migration script SHALL read from `nosql_docs`, transform fields to typed table columns, insert into typed tables, and verify row counts match. The migration SHALL be wrapped in a transaction.

#### Scenario: Migration runs successfully
- **WHEN** the migration script executes
- **THEN** it copies all records, verifies counts match, and logs results

#### Scenario: Migration encounters an error
- **WHEN** a record fails to insert into typed table
- **THEN** the transaction rolls back and migration halts with error details

### Requirement: Adapter files removed after migration
After all data is migrated and all callers are updated, the following files SHALL be deleted: `adapter.ts`, `query-builder.ts`, `transaction-manager.ts`, `registry.ts`, `schema.ts`, `connection-manager.ts`, `migrate.ts`, `module.ts`, `in-memory-collections.ts`, and all files in `interfaces/`.

#### Scenario: Adapter removal
- **WHEN** all services use direct Supabase calls
- **THEN** the adapter directory SHALL be removed and imports cleaned up
