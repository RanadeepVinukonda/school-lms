## Why

The codebase has 100+ verified bugs, security vulnerabilities, and configuration errors across backend, frontend, and mobile. Critical issues include broken PDF processing, non-functional mobile apps (all `onClick` instead of `onPress`), missing password reset flow, exposed secrets, and a fragile Firestore-on-Supabase bridge that silently corrupts data. Until these are fixed, no role (admin, teacher, student) can reliably use the system on any platform.

## What Changes

### Backend Critical Fixes
- **Add `pipeline.service.ts`** — missing file that causes silent AI enrichment failure on textbook PDF uploads
- **Fix `pdf-parse` API usage** — wrong class/method names crash all PDF processing jobs
- **Fix `resetPassword` wrong ID** — passes token doc ID instead of user UID to Firebase, silently targets wrong user
- **Create `increment_completed_concepts` RPC** — missing database function breaks textbook progress tracking
- **Fix `FieldValue.increment()` race condition** — read-modify-write loses concurrent increments
- **Fix `WriteBatch`/`PseudoTx` non-atomicity** — sequential writes with no rollback on failure
- **Fix `getUserByEmail` scanning all users** — O(n) memory scan breaks at 100+ users
- **Add pagination to textbook/overdue-test queries** — prevent memory exhaustion
- **Close connections on graceful shutdown** — fix server/Supabase/pg-boss connection leaks

### Backend Database Fixes
- **Consolidate `nosql_docs` vs `firestore_docs`** — adapter writes to `nosql_docs`, views query `firestore_docs`. Pick one, fix all references
- **Fix migration 011** — creates indexes on `nosql_docs` but the table is never created in any migration
- **Consolidate dual migration systems** — `migrations/` (dead) and `supabase/migrations/` (active) both create duplicate tables
- **Enable RLS enforcement on all tables** — all queries use `service_role` key bypassing RLS, 30+ lines of policy are dead code
- **Add missing indexes** — `subjects.classId`, `notifications.userId`, `auditLogs.targetId/type`, `classes.status/grade`

### Backend Security Fixes
- **Add auth to LTI launch endpoint** — `POST /lti/launch` has no authentication middleware
- **Remove `resetToken` from API response** — password reset token leaked in `forgotPassword` response body
- **Fix CORS all-origins on Vercel** — `process.env.VERCEL_ENV` truthy check allows any origin
- **Remove `.passthrough()` from Zod schemas** — mass assignment risk on settings, exams, upload, attendance routes
- **Add magic-byte validation for file uploads** — currently only checks MIME type header (spoofable)
- **Remove `exec_sql` secure backdoor** — SECURITY DEFINER function allows arbitrary SQL execution
- **Add rate limit per-IP via x-forwarded-for** — rate limiting ineffective behind Vercel proxy

### Frontend Critical Fixes
- **Fix password reset flow** — `confirmReset()` ignores `oobCode`, calls `updateUser()` without session → `AuthSessionMissingError`
- **Add `text-label-xs` and `text-display-xs` to Tailwind config** — 100+ occurrences render at browser default font-size
- **Fix animations** — `MotionConfig reducedMotion="always"` kills all framer-motion; all 15+ motion variants are empty objects
- **Add `loading` prop to Button component** — 15+ pages pass `loading` prop that has no visual effect, enabling double-submit
- **Fix Supabase column name mismatch** — uses camelCase (`.eq('studentId', x)`) but DB columns are snake_case
- **Add missing routes** — `/admin/transport`, `/admin/inventory`, `/admin/hr`, `/admin/lti`, `/privacy`, `/terms`
- **Fix `selectedClassId` not persisted** — authStore partialize excludes it, lost on reload
- **Fix `ROUTES.ADMIN_LOGIN` undefined** — admin layout crashes to `/undefined` on error state
- **Fix XSS surface** — `dangerouslySetInnerHTML` in AssignmentDetailPage and `innerHTML` in LatexRenderer

### Mobile Critical Fixes
- **Replace all `onClick` with `onPress`** — 46 occurrences, every tap handler is non-functional
- **Fix `borderBorderWidth` → `borderWidth`** — 9 occurrences, invalid CSS property
- **Fix `trackingWith` → `letterSpacing`** — 3 occurrences
- **Fix `maxWwidth` → `maxWidth`** — 1 occurrence
- **Fix `uppercase` → `textTransform: 'uppercase'`** — 1 occurrence
- **Replace HTML `<label>` with `<Text>`** — 3 occurrences, red-screen crash in React Native
- **Create missing asset files** — `assets/icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`
- **Fix `app.json`** — add `android.package`, `ios.bundleIdentifier`, `plugins`, `extra.eas.projectId`
- **Fix API URL mismatch** — mobile uses `localhost:4000`, backend runs on `3001`
- **Add `react-native-gesture-handler`** — missing dep breaks stack navigation gestures
- **Wire `@genesis-lms/shared` library** — currently dead code, apps use hardcoded mock data
- **Add login/auth flow to mobile apps** — currently zero authentication, apps render mock data

### Architecture Fixes
- **Resolve dual auth system** — `register()` uses Firebase Admin, `login()` uses Supabase REST. Users created via Firebase have no Supabase password
- **Fix `revokeTokens` no-op** — middleware checks `isTokenRevoked` but tokens are never actually revoked
- **Fix `optionalAuth` missing `classIds`** — downstream handlers crash when checking `req.user.classIds`

## Capabilities

### New Capabilities
- `critical-bug-backend`: Fix runtime crashes, data corruption, and broken API flows in backend services
- `critical-bug-frontend`: Fix broken UI flows, missing styles, dead animations, and routing errors in web app
- `critical-bug-mobile`: Fix non-interactive mobile apps, invalid styles, and missing navigation infrastructure
- `database-consolidation-fix`: Fix dual-table conflict, dual-migration systems, missing table creation, and add indexes
- `auth-security-hardening`: Fix LTI auth bypass, token leak, dual auth inconsistency, token revocation, and CORS
- `frontend-tailwind-tokens`: Add missing design tokens (`text-label-xs`, `text-display-xs`) to Tailwind config
- `mobile-shared-wiring`: Connect mobile apps to shared library for auth, API calls, and state management

### Modified Capabilities
- `database-consolidation`: Extend requirements to include consolidation of `nosql_docs`/`firestore_docs` split and dual migration directories
- `error-handling-audit`: Extend to cover graceful shutdown, connection cleanup, and catch unhandled promise rejections in middleware
- `firebase-removal`: Extend to include removing the hybrid auth pattern (Firebase Admin for register, Supabase for login)
- `security-hardening`: Extend to include LTI endpoint auth, resetToken leak fix, exec_sql backdoor removal
- `mobile-experience`: Extend to cover basic interactivity fixes (onClick→onPress, CSS prop fixes) and shared library integration
- `type-safety-audit`: Extend to include `ReqWithUser` missing `school_id`, navigation props typed as `any` in mobile

## Impact

- **Backend**: ~20 service files, ~5 middleware files, routes for LTI/auth, database adapter (adapter.ts), migration files, worker.ts, scheduler.ts
- **Frontend**: Tailwind config, Button component, router, auth/supabase auth.ts, 5+ page/layout files, App.tsx, authStore
- **Mobile**: All 46 screen files across 3 apps, 3 app.json files, shared library wiring, package.json (3 apps), asset files
- **Database**: schema.sql, adapter.ts, 2 migration directories, create_views.sql, migrate.ts
- **Security**: .env (rotate all credentials), CORS config, Zod schemas (20+ route files), middleware
