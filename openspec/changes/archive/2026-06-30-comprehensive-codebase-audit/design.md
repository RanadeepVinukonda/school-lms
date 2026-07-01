## Context

The codebase migrated from Firebase to Supabase (PostgreSQL) but left two parallel database adapters (`firebase/firestore.ts` and `database/adapter.ts`), both wrapping a Firestore-compatible document-store API over Supabase. This abstraction layer leaks: all Firebase types are typed as `any`, transactions are sequential writes with no rollback, and ~50+ files still import the old adapter. The Supabase `supabase-js` client sits available but unused for direct SQL access.

## Goals / Non-Goals

**Goals:**
- Single consolidated database adapter using native Supabase/PostgreSQL patterns
- Real ACID transactions via PostgreSQL `BEGIN`/`COMMIT`/`ROLLBACK`
- All `as any` casts removed from the DB layer and services; proper TypeScript types throughout
- Database-level filtering and pagination replacing in-memory patterns
- Consistent error propagation (no silent swallows)
- Orphaned Firebase files removed
- Comprehensive backend test suite covering all services
- Full SOLID compliance across the backend: interfaces for every module, dependency injection, single-responsibility classes, Liskov-substitutable implementations, segregated contracts

**Non-Goals:**
- Frontend or mobile refactoring (only backend services, controllers, middlewares)
- Schema redesign (existing `schema.sql` and migrations stay)
- Performance optimization beyond replacing in-memory patterns with DB queries

## Decisions

**1. Consolidate to the `database/` adapter as the single source of truth**
The `database/adapter.ts` has more complete `TYPED_TABLES` entries and `TABLE_NAME_MAP`. Remove `firebase/firestore.ts`, `firebase/auth.ts`, `firebase/admin.ts`. Keep `database/adapter.ts` as the active adapter. Update all imports from `../firebase/*` to `../database/*`.

**2. Replace pseudo-transactions with PostgreSQL transactions**
The current `Tx` class loops through writes with no rollback. Replace with a `PgTransaction` class that uses `supabase.rpc('begin_transaction', ...)` or a dedicated `pg` client connection with `BEGIN`/`COMMIT`/`ROLLBACK`. For the short term, wrap multi-write operations in a `pg` pool transaction.

**3. Use supabase-js directly where the adapter abstraction leaks**
For operations that need real SQL (aggregations, joins, complex filters), add a `sql` helper that exposes the raw `supabase-js` client or a `pg` pool query. This avoids bending the Firestore abstraction and gets proper typing.

**4. Replace `as any` with generated Supabase types**
Use `supabase gen types typescript --linked` to generate `database.types.ts`. Replace all `as any` with these generated types. Where the adapter's generic `DocumentData` is necessary, create typed wrapper functions.

**5. Replace in-memory filtering with supabase-js `.eq()`, `.gte()`, `.lte()` queries**
The current pattern loads all documents then filters with `.filter()/.sort()/.slice()` in JS. Replace with proper `supabase.from().select().eq().range()` chaining using the adapter's query builder.

**6. Test strategy: per-service integration tests with database mocking**
Each service gets a test file that validates its public API (list, get, create, update, delete). Use a test Supabase instance or mocked adapter. No E2E tests in this scope.

**7. SOLID refactoring: extract interfaces, inject dependencies, split responsibilities**
The backend will be refactored to comply with all five SOLID principles:

- **S — Single Responsibility**: Split the monolithic `adapter.ts` into focused modules: a `ConnectionManager` (pool lifecycle), a `QueryBuilder` (query construction), a `TransactionManager` (ACID boundaries). Each service gets one reason to change — business logic only; data access is delegated to injected interfaces.
- **O — Open/Closed**: Define `DbAdapter`, `Transaction`, `Collection`, and `AuthProvider` interfaces. New storage backends (PostgreSQL, SQLite for tests, in-memory for fast tests) implement these interfaces without modifying any consumer.
- **L — Liskov Substitution**: Every implementation of `DbAdapter` SHALL produce identical observable behavior. A test suite against the interface contract runs against every implementation to enforce substitutability.
- **I — Interface Segregation**: Instead of one `any`-typed `DocumentReference`, define `UserCollection`, `GradeCollection`, `NotificationCollection` interfaces with only the methods each collection needs. Consumers depend on narrow contracts.
- **D — Dependency Inversion**: Services receive their data access dependencies via constructor injection (e.g., `constructor(private users: UserCollection)`). The `index.ts` / `app.ts` wiring layer composes the concrete implementations. Tests inject mock implementations.

**8. Collection-specific interfaces replace `any`-typed DocumentReference**
Instead of `collections.users()` returning `any`, each typed table gets a dedicated interface:
```typescript
interface UserCollection {
  findById(id: string): Promise<User | null>;
  findByRole(role: UserRole, pagination: Pagination): Promise<User[]>;
  create(data: CreateUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}
```
This gives per-collection type safety, autocompletion, and narrow contracts (ISP).

**9. Factory pattern for dependency injection wiring**
A `DatabaseModule` factory at the app entry point wires concrete implementations to interface consumers:
```typescript
// lms/backend/src/database/module.ts
export function createDatabaseModule(): DatabaseModule {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const txManager = new PgTransactionManager(pool);
  const users = new SupabaseUserCollection(pool);
  const grades = new SupabaseGradeCollection(pool);
  return { pool, txManager, users, grades };
}
```
Services receive only what they need via constructor injection — no service touches `Pool`, `supabase-js`, or adapter internals.

## Risks / Trade-offs

- **Risk: Direct SQL bypasses the adapter's typed table mapping** → Mitigation: Use collection-specific interfaces for single-document operations; direct SQL only for multi-table transactions
- **Risk: Generated Supabase types may not match adapter's document format** → Mitigation: Create adapter-specific wrapper types that map between Supabase rows and the `DocumentData` shape
- **Risk: Changing 50+ imports is error-prone** → Mitigation: Batch via rename + find/replace; verify with TypeScript compilation
- **Risk: Interface extracting 50+ files is a large blast radius** → Mitigation: Add interfaces first (no behavioural change), then migrate consumers one service at a time, verifying with `tsc --noEmit` after each
- **Risk: Constructor injection across 55 services requires significant wiring** → Mitigation: Use a simple factory module (not a DI framework) — keeps it explicit, debuggable, and zero-dependency
- **Trade-off: Collection-specific interfaces mean more files** → Each typed table gets its own interface file (~30 files). This is intentional — it follows ISP and makes each contract independently testable and mockable.
- **Trade-off: Factory wiring creates a single composition root** → All dependency wiring lives in one place (`database/module.ts`). Change one file to swap implementations. Worth the centralization.
