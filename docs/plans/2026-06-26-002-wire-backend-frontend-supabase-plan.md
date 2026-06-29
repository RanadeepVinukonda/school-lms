---
title: "Wire backend + frontend to Supabase — fix auth, routes, data flow"
status: active
created: 2026-06-26
type: fix
depth: standard
---

# Wire Backend + Frontend to Supabase

## Problem Frame

The Firebase→Supabase migration left broken auth paths, route mismatches, and dead Firebase API calls. The frontend logs in via Supabase Auth directly, but the backend exposes endpoints that use Firebase Identity Toolkit REST API (`login`, `changePassword`). Route paths between frontend `authService.ts` and backend `auth.routes.ts` mismatch (`/auth/me` vs `/auth/profile`, missing `logout`/`verify-token`). The `FIREBASE_WEB_API_KEY` env var is only used by the broken Firebase endpoints.

## Scope Boundaries

### In Scope
- Fix `auth.service.ts` `login()` and `changePassword()` to use Supabase instead of Firebase Identity Toolkit REST API
- Add missing backend routes (`/auth/me`, `/auth/logout`, `/auth/verify-token`) so frontend calls don't 404
- Remove `FIREBASE_WEB_API_KEY` from env.ts (no longer needed)
- Fix `useRegister.ts` to not rely on a token from backend register response
- Wire auth service `getUserProfile` directly from Supabase users table instead of adapter

### Deferred
- Full rewrite of all 50+ backend services to bypass the Firebase compat adapter — works, just has an extra abstraction layer
- Mobile app migration from `@react-native-firebase` to Supabase

### Outside Scope
- Database schema changes (already correct per migration plan)
- Frontend rendering bugs unrelated to auth/data wiring
- Performance optimization

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Rewrite backend `login` to sign in via Supabase Auth Admin API with email + password, not the Firebase Identity Toolkit | The Firebase endpoint is no longer available since we removed firebase-admin; Supabase has its own auth endpoint |
| Fix `changePassword` to verify current password via Supabase REST API instead of Firebase | Same reason — Firebase Identity Toolkit is gone |
| Add `/auth/me`, `/auth/logout`, `/auth/verify-token` routes | Frontend `authService.ts` calls these; they currently return 404 |
| Remove `FIREBASE_WEB_API_KEY` from env.ts | Only used by endpoints we're rewriting, no longer needed |

## High-Level Technical Design

Auth flow after changes:

```
Frontend                          Backend
──────────────────────────────────────────────────
Login: supabase.auth.signInWithPassword()
→ Gets Supabase JWT → stores in authStore
→ All subsequent API calls include Bearer <jwt>
                                  → auth.middleware.ts verifies via supabase.auth.getUser()
                                  → req.user populated

Register: POST /api/auth/register
  → Backend creates user via Supabase Admin API createUser()
  → Writes profile to users table
  → Returns user data (no token needed)
  → Frontend then calls supabase.auth.signInWithPassword() to get session

Change password: POST /api/auth/change-password
  → Backend verifies current password via supabase REST API
  → Updates via supabase Admin API
```

## Implementation Units

### U1. Fix backend login endpoint

**Goal:** Rewrite `auth.service.ts` `login()` to use Supabase instead of Firebase Identity Toolkit REST API.

**Files:**
- `lms/backend/src/services/auth.service.ts` (modify)
- `lms/backend/src/controllers/auth.controller.ts` (verify no change needed)

**Approach:**
- Replace the Firebase Identity Toolkit `fetch()` call with Supabase's REST API for email+password sign-in:
  `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` with `{ email, password }`
- Use the Supabase anon key for the `apikey` header
- Return the Supabase session (access_token, user) instead of Firebase token
- Remove `FIREBASE_WEB_API_KEY` env reference
- Keep the same function signature for backward compatibility

**Patterns to follow:**
- Frontend `useLogin.ts` already uses `supabase.auth.signInWithPassword()` — same endpoint, server-side

**Test scenarios:**
- Happy path: valid credentials → session with access_token returned
- Error path: invalid credentials → UnauthorizedError
- Profile lookup: user doc fetched from users collection, isActive checked

### U2. Fix backend changePassword endpoint

**Goal:** Rewrite `auth.service.ts` `changePassword()` to verify current password via Supabase REST API.

**Files:**
- `lms/backend/src/services/auth.service.ts` (modify)

**Approach:**
- Replace Firebase Identity Toolkit `signInWithPassword` call with Supabase REST API token endpoint
- Use Supabase Admin API's `updateUserById()` to set the new password

**Test scenarios:**
- Happy path: correct current password → password updated
- Error path: incorrect current password → UnauthorizedError
- Error path: user not found → NotFoundError

### U3. Add missing backend auth routes

**Goal:** Add `/auth/me`, `/auth/logout`, `/auth/verify-token` routes to match frontend `authService.ts` expectations.

**Files:**
- `lms/backend/src/routes/auth.routes.ts` (modify)
- `lms/backend/src/controllers/auth.controller.ts` (modify)

**Approach:**
- `GET /auth/me` — alias for existing `GET /auth/profile` (same controller function)
- `POST /auth/logout` — No-op (frontend handles logout via Supabase); returns success
- `POST /auth/verify-token` — Verify the current user's token by checking `req.user` (set by auth middleware)

**Test scenarios:**
- Happy path: authenticated request to `/auth/me` → user profile
- Happy path: authenticated request to `/auth/verify-token` → `{ valid: true }`
- Error path: unauthenticated request → 401

### U4. Clean up FIREBASE_WEB_API_KEY

**Goal:** Remove `FIREBASE_WEB_API_KEY` from env.ts schema since no code uses it anymore.

**Files:**
- `lms/backend/src/config/env.ts` (modify)

**Approach:**
- Remove `FIREBASE_WEB_API_KEY` from the Zod schema
- Verify no remaining code references it

### U5. Verify end-to-end auth flow

**Goal:** Confirm frontend login → backend API call chain works.

**Approach:**
- Backend starts without errors
- Backend typeScript compiles (`npx tsc --noEmit`)
- Trace the full flow: frontend log in → get Supabase JWT → call backend API → middleware verifies → response returned

**Files:**
- None — verification only

**Test expectation:** `npx tsc --noEmit` passes (pre-existing strictNullChecks exempted as pre-existing).

## Dependencies

```
U1 (login fix) ──┐
                 ├── U4 (cleanup)
U2 (changePw) ──┘
U3 (missing routes)
                 └── U5 (verify)
```

## System-Wide Impact

- Backend auth routes change behavior: login now returns Supabase JWT instead of Firebase JWT. Frontend doesn't call this endpoint so no impact.
- Frontend register flow unchanged: backend creates user, frontend logs in via Supabase to get session.
- The `/auth/me` route is new — resolves 404 the frontend previously may have hit.
