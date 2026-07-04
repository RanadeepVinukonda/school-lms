## Context

The codebase is a TypeScript monorepo with Express backend (Supabase PostgreSQL), React/Vite frontend, and Expo/React Native mobile apps. A full audit revealed 100+ verified bugs spanning runtime crashes (missing files, wrong API usage), security vulnerabilities (auth bypass, token leak, CORS misconfig), data integrity issues (non-atomic writes, dual-table conflict), and non-functional mobile apps (46 `onClick` instead of `onPress`).

Many issues stem from: (1) a fragile Firestore-on-Supabase bridge adapter that maps Firestore API calls to Supabase REST with no atomicity, (2) a Firebase/Supabase hybrid auth system where register and login use different providers, (3) two independent migration systems with duplicate table definitions, and (4) mobile apps that are static mockups with no actual backend wiring.

## Goals / Non-Goals

**Goals:**
- Fix all runtime crashes (missing files, wrong API calls, null references)
- Make mobile apps functional (interactivity, navigation, valid styles)
- Fix password reset flow on both frontend and backend
- Add missing database tables, fix views, consolidate migrations
- Fix security vulnerabilities (LTI auth, token leak, CORS, exec_sql backdoor)
- Make data operations atomic (increment, arrayUnion, batch writes)
- Fix frontend rendering issues (missing Tailwind tokens, dead animations, loading states)
- Wire mobile apps to the shared library for auth and API calls
- Rotate all exposed credentials in .env files

**Non-Goals:**
- Not rewriting the Firestore emulation adapter — only fixing atomicity and bugs
- Not implementing new features — only fixing existing broken functionality
- Not full TypeScript strict-mode migration — only targeted type fixes
- Not full mobile UI redesign — only making existing screens functional
- Not adding comprehensive test coverage — only critical regressions

## Decisions

### 1. Fixing the Firestore-on-Supabase Adapter (Minimal Patches)
**Decision**: Fix atomicity bugs in `adapter.ts` by wrapping multi-write operations in Supabase RPC transactions where possible, and flag remaining limitations with explicit warnings. Do NOT rewrite the adapter.
**Rationale**: A full rewrite would be a separate change. The adapter works for single-document ops; only `FieldValue.increment()`, `arrayUnion`, `WriteBatch`, and `PseudoTx` need atomicity fixes.
**Implementation**: For `increment`, use Supabase RPC `rpc('increment_counter', ...)` or a raw SQL update. For `WriteBatch`, execute within a `BEGIN...COMMIT` block via `rpc()`. For `PseudoTx`, add optimistic locking.

### 2. Consolidating Auth to Supabase Only
**Decision**: Remove Firebase Admin SDK usage for user registration. Route all auth through Supabase Auth. Keep Firebase client SDK in frontend/mobile for push notifications (FCM) only.
**Rationale**: The dual auth system is the root cause of the broken password reset and inconsistent user creation. Supabase Auth handles registration, login, password reset, and token management. Firebase is only needed for FCM push notifications.
**Implementation**: Rewrite `auth.service.ts` `register()` to use `supabase.auth.admin.createUser()`. Rewrite `forgotPassword`/`resetPassword`/`changePassword` to use Supabase Auth REST APIs exclusively. Remove `database/auth.ts` Firebase functions.

### 3. Consolidating Database Schema
**Decision**: Standardize on `nosql_docs` as the document store table. Fix all views and indexes to reference `nosql_docs`. Create the table in migration 000 if it doesn't exist. Remove `firestore_docs` references from all views.
**Rationale**: The adapter already writes to `nosql_docs`. The views and some queries reference `firestore_docs` which either doesn't exist or is out of sync. One table eliminates the split-brain problem.
**Implementation**: Add a migration that creates `nosql_docs` if not exists. Rewrite `create_views.sql`. Drop `firestore_docs` references. Add missing indexes.

### 4. Consolidating Migration Directories
**Decision**: The `migrations/` (root) directory is dead code — never executed by `migrate.ts`. Remove it. All migrations live in `supabase/migrations/`.
**Rationale**: Two migration directories with duplicate table definitions create confusion and risk. One source of truth.
**Implementation**: Verify all critical tables from root `migrations/` exist in `supabase/migrations/`. Archive/remove root `migrations/` directory.

### 5. Mobile: Fix Interactivity First, Wire Backend Second
**Decision**: Fix all `onClick`→`onPress`, invalid CSS props, and HTML elements first (pure search/replace). Then add shared library imports for auth and API calls.
**Rationale**: The interactivity bugs are mechanical (search/replace) and block everything else. Wiring the shared library requires understanding which API endpoints already exist.
**Implementation**: Batch 1: `onClick`→`onPress` across all 46 occurrences, fix 12 invalid CSS props, fix 3 `<label>`→`<Text>`. Batch 2: Add proper React Navigation types, import `@genesis-lms/shared` services, replace mock data with real API calls.

### 6. Frontend: Fix Broken Flow, Not Visual Polish
**Decision**: Fix the critical functional breaks (password reset, missing routes, Tailwind classes, dead animations, loading button) without redesigning UI.
**Rationale**: The frontend is visually complete. The bugs are functional — code that doesn't do what it's supposed to do. Each has a one-line or few-line fix.
**Implementation**: Individual targeted fixes per file. No component rewrites.

### 7. Security: Layer-by-Layer Hardening
**Decision**: Address each security finding with the smallest effective change. Add auth middleware where missing. Remove `resetToken` from response. Fix CORS condition. Remove `.passthrough()` from Zod schemas.
**Rationale**: Each security fix is independent. Doing them together prevents regression but they don't depend on each other.
**Implementation**: Per-finding edits. No new abstractions.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Fixing adapter atomicity without rewriting may leave edge cases uncovered | Each fix is scoped to the specific broken pattern (increment, arrayUnion, batch). Remaining limitations documented with `ponytail:` comments. |
| Removing Firebase Admin from auth may break existing users created via Firebase | Migration script to backfill Supabase auth entries for existing users. Phase this as: fix register flow first, then migrate existing users. |
| Mobile batch changes (46 files) risk merge conflicts | Process files sequentially by app (teacher → student → parent) with clear per-file scope. Verify each file after edit. |
| Tailwind token changes affect 100+ components and may need visual verification | Build the frontend after changes to confirm no build errors. Visual verification is manual — flag this for QA. |
| Migration consolidation may drop data if root `migrations/` ran unintentionally | Root `migrations/` was never executed by `migrate.ts` (confirmed). Safe to archive. Verify `supabase/migrations/` covers all needed tables. |
| `exec_sql` RPC removal breaks the migration runner | Add a migration to create the RPC as `SECURITY DEFINER` with stricter access control, then remove it only after switching to direct SQL execution. |
| Auth flow change during active development breaks existing sessions | Deploy auth fixes in a feature branch. Existing sessions use JWTs that remain valid until expiry. New sessions use the unified Supabase path. |
