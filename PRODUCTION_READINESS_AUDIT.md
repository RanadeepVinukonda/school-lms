# Production Readiness Audit — Genesi School LMS

**Audit Date:** 2026-07-09  
**Codebase:** `school-lms/lms/` — Monorepo (backend, frontend, mobile, dashboard)  
**Verdict:** ⚠️ **CONDITIONAL — Not Ready** (see Critical Findings)

---

## Executive Summary

Genesi LMS is a full-stack multi-tenant school management system with strong architectural awareness (19 middleware layers, Zod validation, RLS policies, ACID financial transactions) but has critical gaps in **auth security**, **test coverage**, **production hardening**, and **security configuration** that must be resolved before production deployment. Estimated remediation: **2-3 weeks** focused on the 10 critical items.

**Overall Score: 5.5/10**

| Layer | Score | Key Risks |
|-------|-------|-----------|
| Database Schema | 6/10 | Missing FKs, TEXT arrays, no migrations |
| Backend Security | 5/10 | Service role key exposure, CSP bypass, dual auth drift |
| Backend API | 7/10 | Good middleware, gaps in scoping |
| Frontend | 6/10 | 10m timeout, localStorage tokens, 0 tests |
| Mobile | 5/10 | Basic shell, unknown quality |
| Infrastructure | 5/10 | No prod config, no monitoring, placeholder CI |
| Testing | 2/10 | `--passWithNoTests` in CI — suites are empty |
| Documentation | 4/10 | OpenAPI has empty `apis: []`, no migration docs |

---

## Critical Findings (Must Fix Before Production)

### C1. 🔴 Service Role Key Exposed in Dual Headers
**File:** `lms/backend/src/services/auth.service.ts:250-261`

```typescript
// resetPassword() sends SUPABASE_SERVICE_ROLE_KEY in BOTH headers
headers: {
  'Content-Type': 'application/json',
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,        // ← service key in apikey header
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,  // ← and in auth header
}
```

The Supabase service role key grants full admin access to all tables bypassing RLS. Sending it in the `apikey` header (which is intended for the anon key) doubles the exposure surface. If this endpoint's response or any error logging leaks headers, the entire database is compromised.

**Fix:** Remove the `apikey` header from admin API calls. Use `Authorization: Bearer <SERVICE_ROLE_KEY>` only.

### C2. 🔴 CSP Bypass via `'unsafe-inline'`
**File:** `lms/backend/src/middlewares/security.middleware.ts` (implied) + `lms/backend/src/controllers/auth.controller.ts:75-171`

The password reset page (`verifyHash`) serves inline `<script>` with `window.location.hash` parsing. The CSP must include `'unsafe-inline'` for this to work, which defeats XSS protection for the entire app.

**Fix:** Move the password reset form to the frontend SPA. Remove the inline HTML controller. Set a strict CSP with nonce-based script loading.

### C3. 🔴 No SQL Migration Framework
**File:** `lms/backend/supabase/schema.sql`

Schema is a single `.sql` file with no versioning, no migration history, no rollback capability. Any schema change in production requires manual SQL execution with no audit trail.

**Fix:** Adopt a migration tool (e.g., Supabase Migrations, Drizzle Kit, or node-pg-migrate). Version every schema change.

### C4. 🔴 Dual Auth Drift — Firebase + Supabase
**File:** `lms/backend/src/services/auth.service.ts:90-96,137-181`

Registration creates users in **both** Firebase Auth and Supabase. Login uses **only** Supabase REST API (`/auth/v1/token?grant_type=password`). Password reset goes through Supabase only. The two auth systems will drift — a user deactivated in Supabase but active in Firebase still exists in one system.

**Fix:** Pick one primary auth provider. Supabase Auth is already the backend default. Remove Firebase Admin SDK dependencies.

### C5. 🔴 DB Connection Pool Max: 5
**File:** `lms/backend/src/database/connection-manager.ts:9`

```typescript
_pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30000 });
```

Production Node.js apps serving a multi-tenant school system with 100+ concurrent users typically need `max: 20-50`. At 5 connections, under load the pool will queue requests, causing timeout errors.

**Fix:** Increase `max` based on expected concurrency. Make it configurable via `DATABASE_POOL_MAX` env var.

### C6. 🔴 Cross-School Data Access Risk
**File:** `lms/backend/src/controllers/schools.controller.ts:14-18`, `lms/backend/src/controllers/fee.controller.ts:39-42`

```typescript
// No school_id scoping on getSchool — relies entirely on RLS
export async function getSchool(req: Request, res: Response) {
  const { data } = await getSupabaseAdmin()!.from('schools').select('*').eq('id', req.params.id).maybeSingle();
```

The controller uses `getSupabaseAdmin()` which **bypasses RLS**. If route-level role checks are misconfigured or a route is added without proper middleware, any authenticated user can read any school's data.

**Fix:** Use `getSupabaseClient()` (anon key + RLS) for user-scoped queries. Only use admin client for admin-only endpoints after explicit authorization.

### C7. 🔴 Frontend 10-Minute Axios Timeout
**File:** `lms/frontend/src/services/api.ts:9`

```typescript
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000,  // ← 10 minutes
});
```

A 10-minute timeout means failed requests hold connections open for 600s. Browser will time out before the server does in most cases. No legitimate API call should take this long.

**Fix:** Reduce to 30s for standard requests, 120s for file uploads. Use per-request overrides for longer operations.

### C8. 🔴 Auth Token in localStorage (XSS Vulnerability)
**File:** `lms/frontend/src/store/authStore.ts:28,178`

```typescript
function readPersistedToken(): string | null {
  const raw = localStorage.getItem('lms-auth-v2');
```

Auth tokens persisted in `localStorage` are accessible to any JavaScript on the same origin. A single XSS vulnerability leaks persistent credentials.

**Fix:** Store tokens in httpOnly cookies (already partially set up in `login` controller). Use cookie-based auth as the primary mechanism, not local storage.

### C9. 🔴 Empty Test Suites in CI
**File:** `.github/workflows/test.yml`

```yaml
run: npm test -- --passWithNoTests
```

The `--passWithNoTests` flag hides the fact that test suites are empty or non-existent. There is no safety net for regressions.

**Fix:** Remove `--passWithNoTests`. Write meaningful tests for critical paths before enabling CI gating.

### C10. 🔴 No Production Docker Compose
**File:** `lms/docker-compose.yml`

Only one compose file exists with no production overrides:
- No `restart: always` or `restart: unless-stopped`
- No health checks
- No resource limits
- PostgreSQL uses floating tag `postgres:16-alpine` (pulls latest minor)
- No volume mount for DB data (ephemeral!)

**Fix:** Create `docker-compose.prod.yml` with health checks, restart policies, resource constraints, pinned image tags, and persistent volumes.

---

## Layer-by-Layer Detailed Audit

### 1. Database Schema (`supabase/schema.sql`)
| Issue | Severity | Detail |
|-------|----------|--------|
| Missing FK constraints | High | `fee_payments.fee_structure_id`, `payroll.*`, `attendance.*` — implicit relations via UUIDs with no referential integrity |
| TEXT arrays for relations | Medium | `users.class_ids TEXT[]`, `users.children_ids TEXT[]` — Postgres arrays skip FK enforcement, no index-friendly joins |
| No `created_at` on all tables | Low | Several tables omit audit timestamps |
| No `updated_at` trigger | Low | Some tables have timestamps but no auto-update trigger |
| RLS policies present | Good | Per-role RLS on `users`, `schools`, `fee_structures` — but reliance on `getSupabaseAdmin()` bypasses them |

### 2. Backend Security
| Issue | Severity | Detail |
|-------|----------|--------|
| Service role key in dual headers | 🔴 Critical | `auth.service.ts:250-256` |
| CSP bypass | 🔴 Critical | Inline scripts require `'unsafe-inline'` |
| Password verification via temp client | 🟡 Medium | `auth.service.ts:288-293` — creates a throwaway Supabase client to verify current password |
| Token revocation check | 🟢 Good | `sessionRevocation.middleware.ts` checks revoked_tokens table |
| CSRF protection | 🟢 Good | Double-submit cookie pattern on mutating methods |
| Rate limiting (5 tiers) | 🟢 Good | auth, api, upload, strict, school-level tiers |
| Audit logging | 🟢 Good | Audit middleware logs mutations |
| Idempotency on payments | 🟢 Good | `idempotency.middleware.ts` on POST /fee/payments |
| XSS sanitization | 🟢 Good | `sanitize.middleware.ts` with `xss` library |

### 3. Backend API Routes (78 endpoints)
| Aspect | Assessment |
|--------|------------|
| Auth routes | Correct — authRateLimit applied at router level, Zod validation everywhere |
| School routes | Most have `authenticate` + `requireRole` — but 2 routes (`getSchool`, `getBranding`) allow any authenticated user |
| Finance routes | Good — admin-only for mutations, idempotency on payments |
| HR routes | Basic — need review of who can view staff/leave data |
| Academics (40+ routes) | Inconsistent role checks — some use `optionalAuth`, some skip role entirely |
| Content routes | Upload and AI routes need tighter rate limiting |
| Infrastructure routes | `/metrics` has auth + admin role — `/health` and `/ready` are public |

### 4. Frontend (React + Vite)
| Aspect | Assessment |
|--------|------------|
| Architecture | Good — lazy loading, role-based layouts, Zustand stores, typed API services |
| Security | Mixed — CSRF interceptor is well done, but localStorage token persistence is a risk |
| Axios config | 🔴 10min default timeout, token refresh queue is well-implemented |
| Error handling | Adequate — RouteErrorFallback, structured ApiError type |
| Bundling | Good — manualChunks vendor/supabase separation |
| CSS approach | Not assessed — needs Tailwind/PostCSS audit |
| Test coverage | 🔴 None detected |

### 5. Mobile (React Native / Expo Workspace)
| Aspect | Assessment |
|--------|------------|
| Structure | Workspace with 3 apps (student, teacher, parent) + shared package |
| Student App | Basic — NavigationContainer with auth-gated routing, push notification registration |
| Teacher App | Not assessed |
| Parent App | Not assessed |
| Shared package | Exports authService, LoginScreen, OfflineIndicator |
| Detox config | `.detoxrc.js` present but E2E test quality unknown |
| CI | Mobile build workflow exists in GitHub Actions |

### 6. Infrastructure
| Aspect | Assessment |
|--------|------------|
| Docker Compose | 🔴 Dev-only, no prod config |
| Vercel config | Serverless functions with 30s timeout — adequate |
| CI/CD | Placeholder test suite, CD workflow exists but deploy script is empty |
| GitHub Actions | 6 workflows: test, e2e, security (gitleaks), load-test (k6), mobile-build, cd |
| Monitoring | Sentry configured (DSN in env) — no APM, no uptime monitoring |
| Graceful shutdown | Partial — stops scheduler, closes HTTP server, no DB pool drain |

### 7. Testing
| File | Assessment |
|------|------------|
| `test.yml` | `--passWithNoTests` — empty suites |
| `e2e.yml` | Playwright config exists — test quality unknown |
| `load-test.yml` | k6 scripts present — not reviewed |
| Backend tests | Not found anywhere in src tree |
| Frontend tests | vitest config exists (`vite.config.ts:32-37`) with jsdom setup — no test files found |

### 8. Documentation
| File | Assessment |
|------|------------|
| Swagger/OpenAPI | `apis: []` — no route documentation loaded, spec is empty |
| README | Not reviewed |
| Environment vars | `env.ts` has Zod schema but no `.env.example` documented |
| Migration docs | None — single schema.sql |
| API docs | None generated |

---

## Risk Matrix

| Risk | Likelihood | Impact | Priority |
|------|-----------|--------|----------|
| Service role key leak | Low | 🔴 Critical (full DB access) | P0 |
| CSP bypass → XSS | Medium | 🔴 Critical | P0 |
| Data exposure via admin client | Medium | 🔴 Critical | P0 |
| Auth drift (Firebase vs Supabase) | High | 🟡 High (orphan users) | P1 |
| Connection pool exhaustion | High | 🟡 High (500 errors) | P1 |
| localStorage token theft | Medium | 🟡 High | P1 |
| Unversioned schema changes | High | 🟡 High (broken deploys) | P1 |
| No test coverage → regression | High | 🟡 High | P1 |
| Cross-school data access | Medium | 🟡 High | P1 |
| Missing FK constraints | Medium | 🟡 Medium (data corruption) | P2 |
| Swagger empty | High | Low (developer friction) | P3 |

---

## Methodology

Performed line-by-line review across:
1. **Backend (~3,000 lines):** app.ts, env.ts, schema.sql, index.ts, auth.middleware, role.middleware, rateLimit.middleware, validate.middleware, security.middleware, auth.service, fee.service, search.service, email.service, supabase.ts, connection-manager, errors.ts
2. **Frontend (~800 lines):** api.ts, authStore.ts, router/index.tsx, vite.config.ts
3. **Infrastructure:** docker-compose.yml, vercel.json, .github/workflows/ (6 files)
4. **Mobile:** package.json, student/App.tsx
5. **Routes:** All 7 route aggregators (78+ endpoints)
6. **Configuration:** Supabase schema, cloud configs, 6 edge functions

---

## Recommendations Roadmap

### Sprint 1 (Week 1) — Security Hardening
- [ ] C1: Remove `apikey` header from admin Supabase calls
- [ ] C2: Move password reset to SPA, set strict CSP with nonces
- [ ] C4: Consolidate to single auth provider (Supabase)
- [ ] C6: Replace `getSupabaseAdmin()` with `getSupabaseClient()` where RLS suffices
- [ ] C8: Migrate from localStorage tokens to httpOnly cookies

### Sprint 2 (Week 2) — Production Hardening
- [ ] C3: Set up Drizzle Kit migrations with versioned schema
- [ ] C5: Make pool size configurable, increase default
- [ ] C7: Reduce axios timeout to 30s/120s
- [ ] C10: Create `docker-compose.prod.yml` with health checks, restarts, volumes
- [ ] Add health check endpoint with DB pool status
- [ ] Add DB pool drain to graceful shutdown

### Sprint 3 (Week 3) — Testing & Monitoring
- [ ] C9: Write critical path tests, remove `--passWithNoTests`
- [ ] Populate Swagger docs with route annotations
- [ ] Add APM monitoring (Sentry performance)
- [ ] Add uptime monitoring endpoint
- [ ] Document `.env.example` with all vars
- [ ] Set up CI test gating (no deploy on red tests)

---

## Appendix: Key File Reference

| File | Purpose |
|------|---------|
| `lms/backend/src/app.ts` | Express app entry, 19 middleware layers |
| `lms/backend/src/index.ts` | Server start, Sentry init, graceful shutdown |
| `lms/backend/src/config/env.ts` | Zod-validated env config (~24 vars) |
| `lms/backend/supabase/schema.sql` | PostgreSQL schema + RLS (25+ tables) |
| `lms/backend/src/services/auth.service.ts` | Dual Firebase + Supabase auth |
| `lms/backend/src/middlewares/auth.middleware.ts` | JWT verification, profile hydration |
| `lms/backend/src/controllers/fee.controller.ts` | Fee payment with ACID transactions |
| `lms/frontend/src/services/api.ts` | Axios client with CSRF + token refresh |
| `lms/frontend/src/store/authStore.ts` | Zustand auth with 3-tier init |
| `lms/frontend/src/app/router/index.tsx` | 100+ lazy routes, 5 role layouts |
