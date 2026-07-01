## 1. Database Consolidation

- [x] 1.1 Update all imports across ~50+ files from `../firebase/` to `../database/`
- [x] 1.2 Remove `lms/backend/src/firebase/firestore.ts` after verifying no remaining imports
- [x] 1.3 Remove `lms/backend/src/firebase/auth.ts` after verifying no remaining imports
- [x] 1.4 Remove `lms/backend/src/firebase/admin.ts` after verifying no remaining imports
- [x] 1.5 Verify `database/adapter.ts` has all `TYPED_TABLES` entries aligned with `schema.sql`
- [x] 1.6 Run TypeScript compilation to verify zero import errors

## 2. SOLID — Interface Extraction (DIP + ISP)

- [x] 2.1 Define `DbAdapter` interface with generic CRUD contract (get, set, update, delete, list, runTransaction)
- [x] 2.2 Define `Transaction` interface with begin/commit/rollback
- [x] 2.3 Define `AuthProvider` interface with signIn, verifyToken, getUser, createUser
- [x] 2.4 Define per-collection narrow interfaces: `UserCollection`, `GradeCollection`, `NotificationCollection`, `AssignmentCollection`, `AttendanceCollection`, `ConceptCollection`, `TextbookCollection`, `ChapterCollection`, `ClassCollection`, `SubjectCollection`
- [x] 2.5 Create `database/interfaces/` directory and move all interfaces there
- [x] 2.6 Update `SupabaseDbAdapter` to implement `DbAdapter`
- [x] 2.7 Update `SupabaseAuthProvider` to implement `AuthProvider`
- [x] 2.8 Create collection-specific implementations (`SupabaseUserCollection`, etc.) implementing narrow interfaces

## 3. SOLID — Single Responsibility Split (SRP)

- [x] 3.1 Split `ConnectionManager` out of adapter (pool creation, health checks, lifecycle)
- [x] 3.2 Split `QueryBuilder` out of adapter (query construction, filtering, pagination)
- [x] 3.3 Split `TransactionManager` out of adapter (BEGIN/COMMIT/ROLLBACK, savepoints)
- [x] 3.4 Ensure `database/adapter.ts` is under 150 lines after splits
- [x] 3.5 Verify no service imports Pool, supabase-client, or adapter internals directly

## 4. SOLID — Dependency Injection Wiring

- [x] 4.1 Create `database/module.ts` factory — single composition root wiring interfaces to implementations
- [x] 4.2 Update `user.service.ts` — accept `UserCollection` via constructor, remove direct adapter import
- [x] 4.3 Update `grade.service.ts` — accept `GradeCollection` via constructor
- [x] 4.4 Update `notification.service.ts` — accept `NotificationCollection` via constructor
- [x] 4.5 Update `assignment.service.ts` — accept `AssignmentCollection` via constructor
- [x] 4.6 Update `attendance.service.ts` — accept `AttendanceCollection` via constructor
- [x] 4.7 Update remaining ~45 services — inject narrow collection interfaces, remove adapter imports
- [x] 4.8 Update `index.ts` / `app.ts` — wire via `createDatabaseModule()`, pass dependencies to services
- [x] 4.9 Create `InMemoryUserCollection` (and sibling mocks) for test use — verify LSP with shared contract tests

## 5. ACID Transactions

- [x] 5.1 Replace `Tx` class sequential-write loop with PostgreSQL `BEGIN`/`COMMIT`/`ROLLBACK` via `pg` pool or `supabase.rpc`
- [x] 5.2 Add rollback logic to `commit()` — catch errors and execute `ROLLBACK`
- [x] 5.3 Update `runTransaction()` to use the new `PgTransaction`
- [x] 5.4 Verify gamification service (XP + coins + streak) uses real transactions

## 6. Type Safety Audit

- [ ] 6.1 Generate `database.types.ts` from `supabase gen types typescript`
- [x] 6.2 Remove `lms/backend/src/types/firebase-admin.d.ts`
- [ ] 6.3 Apply generated Supabase types to all collection interfaces and implementations
- [x] 6.4 Remove all `as any` casts from `services/analytics-v2.service.ts`
- [x] 6.5 Remove all `as any` casts from `services/unified-test-engine.service.ts`
- [x] 6.6 Remove all `as any` casts from `services/gamification.service.ts`
- [x] 6.7 Remove all `as any` casts from `services/user.service.ts` and remaining services
- [x] 6.8 Fix Firebase type leaks in `content-publishing.service.ts` and `unified-test-engine.service.ts`
- [x] 6.9 Verify `npx tsc --noEmit` passes with zero errors

## 7. Database-Level Filtering

- [x] 4.1 Refactor `user.service.ts` — replace in-memory load+filter with adapter `.eq()` + `.range()` queries
- [x] 4.2 Refactor `notification.service.ts` — replace in-memory sort with adapter `.orderBy()`
- [x] 4.3 Refactor `grade.service.ts` — replace in-memory filtering with adapter queries
- [x] 4.4 Refactor `assignment.service.ts` — replace in-memory filtering with adapter queries
- [x] 4.5 Scan all remaining services for `.filter()`, `.sort()`, `.slice()` on loaded arrays and refactor

## 8. Error Handling Audit

- [x] 8.1 Fix `coding.service.ts` — log file cleanup errors instead of silent `catch(() => {})`
- [x] 8.2 Fix `textbook.controller.ts` — log or propagate cleanup errors
- [x] 8.3 Fix `auth.middleware.ts` — propagate token verification errors via `next(error)`
- [x] 8.4 Fix `attendance.service.ts` — handle student lookup failures with logging, not `catch(() => null)`
- [x] 8.5 Verify all `AppError` usage follows consistent pattern across services

## 9. Firebase Orphan Removal

- [x] 9.1 Remove `lms/firestore.rules`
- [x] 9.2 Remove `lms/storage.rules`
- [x] 9.3 Verify no remaining references to `firebase-admin` in `package.json`

## 10. Backend Test Suite

- [x] 10.1 Write LSP contract tests — verify every interface implementation produces identical behavior
- [x] 10.2 Write test setup (`InMemory*` collections + factory)
- [x] 10.3 Add tests for `user.service.ts` (list, get, create, update, delete + error paths)
- [x] 10.4 Add tests for `grade.service.ts`
- [x] 10.5 Add tests for `notification.service.ts`
- [x] 10.6 Add tests for `assignment.service.ts`
- [x] 10.7 Add tests for `attendance.service.ts`
- [x] 10.8 Add tests for `gamification.service.ts`
- [x] 10.9 Add tests for remaining uncovered services
- [x] 10.10 Verify `npx jest --coverage` reports >= 70% line coverage for services
