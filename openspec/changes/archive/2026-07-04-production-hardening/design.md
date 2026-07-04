## Context

The LMS backend uses a Firestore-compatible adapter layer (`database/adapter.ts`) over Supabase. This was built to minimize code changes during the Firestore→Supabase migration. The adapter:
- Bypasses RLS by using the Supabase service_role key for every query
- Uses `require()` for lazy imports, killing TypeScript checking
- Stores 30+ collections as JSONB blobs in a single `nosql_docs` table with no schema
- Provides pseudo-transactions that aren't actually atomic

The frontend stores JWT tokens in localStorage (via zustand persist), making them stealable via any XSS. CORS is open to all origins on Vercel deployments. Express JSON body limit is 100MB.

## Goals / Non-Goals

**Goals:**
- Remove Firestore adapter layer; use Supabase client directly in all services
- Route user queries through anon-key Supabase client with RLS enforcement
- Move JWT storage from localStorage to httpOnly cookies
- Fix CORS to allow only explicit origins in all environments
- Reduce JSON body limit to safe values
- Implement real ACID transactions via pg pool
- Migrate all `nosql_docs` data to typed tables
- Add per-route Zod validation with standardized error responses
- Consolidate 71 route files into feature modules
- Add auth-specific rate limiting
- CSRF protection for state-changing endpoints

**Non-Goals:**
- Not rewriting business logic in services (only changing data access pattern)
- Not changing the mobile app auth flow (shared module handles this separately)
- Not adding Redis caching (future work)
- Not splitting the monolith into microservices (future work)
- Not adding E2E tests (separate initiative)

## Decisions

### 1. Direct Supabase Client vs. Repository Pattern
**Decision:** Direct Supabase client calls in services. No repository abstraction.
**Rationale:** The adapter layer proved that abstractions over Supabase add maintenance cost without value. Supabase's typed client (`supabase.from('table').select().eq()`) IS the query builder. Adding another wrapper creates the same problems. Services already import `getSupabaseAdmin()` — they'll import `getSupabaseClient()` instead.
**Alternative considered:** Repository pattern per domain (authRepo, schoolRepo, etc.) — rejected as premature abstraction that would need maintenance for all 60+ tables.

### 2. Two Supabase Clients: Anon + Service Role
**Decision:** Create `getSupabaseClient()` (anon key, respects RLS) for user-scoped queries and `getSupabaseAdmin()` (service role) for admin/cron operations only.
**Rationale:** RLS policies are the tenant isolation boundary. Using the service role bypasses them entirely. The anon key client defaults to RLS enforcement. Admin operations (batch jobs, system reports) still need service role.
**Migration pattern:** Every `collections.x().where('schoolId','==',id).get()` becomes `supabaseClient.from('x').select('*').eq('school_id', id)`. The `school_id` filter is enforced by RLS but also added explicitly as defense in depth.

### 3. httpOnly Cookies vs. Encrypted localStorage
**Decision:** httpOnly cookies set by backend, read by Express middleware, attached automatically to requests.
**Rationale:** localStorage is accessible to any JS running on the page. httpOnly cookies are not. The backend already has the auth infrastructure (Supabase sessions, token refresh). Cookies prevent XSS token theft entirely.
**Trade-off:** Requires backend change to set cookies on login/refresh. Frontend reads token from cookie via API response, not localStorage.

### 4. Route Consolidation Strategy
**Decision:** Group 71 routes into 7 domain modules: `auth`, `school`, `finance`, `academics`, `hr`, `content`, `infrastructure`. Each module has its own `routes.ts` that imports only its own controllers.
**Auto-discovery:** Convention-based — `routes/auth/*.routes.ts` maps to `/api/auth/*`. No manual import list.
**Rationale:** 71 manual imports in `routes/index.ts` is unscalable. Each new feature currently adds 3 lines (import + mount + file). Auto-discovery via glob pattern eliminates this.

### 5. Migration Strategy for nosql_docs
**Decision:** Data migration run as a one-time script, not in application code. Each typed table gets a `migrate_from_nosql` check at startup.
**Rationale:** Lazy migration (read from both, write to typed) adds complexity. A single migration script with backup, verify, and rollback is safer.
**Order:** Create typed tables (done in migration 021) → copy data → verify counts → switch reads → drop old references.

## Risks / Trade-offs

- **[High] CORS breakage:** Vercel preview branches will lose open CORS. Developers must add preview URLs to allowlist. Mitigation: Add wildcard for `*.vercel.app` during transition, remove after.
- **[Medium] Cookie CSRF:** httpOnly cookies don't prevent CSRF. Mitigation: Add CSRF token via `csrf` middleware (double-submit cookie pattern) on all state-changing endpoints.
- **[Medium] Migration data loss:** nosql_docs → typed table migration could lose data if schemas don't match. Mitigation: Backup all nosql_docs before migration. Run migration in transaction with count verification. Keep rollback script.
- **[Low] Performance regression:** Direct Supabase calls may be slightly slower than the adapter for JSONB queries on nosql_docs. Mitigation: Typed tables have proper indexes. Expected net positive.
- **[Low] Auth cookie size:** Large JWTs in cookies can hit header size limits. Mitigation: Keep token payload minimal. Use Supabase's default session tokens (~1KB).

## Migration Plan

### Phase 1 — Quick Wins (Days 1-2)
1. Reduce JSON body limit to 1MB
2. Fix CORS to explicit allowlist (add `*.vercel.app` wildcard)
3. Remove duplicate `/fee`/`/fees` route
4. Fix dynamic `require()` → static imports in adapter
5. Fix `/ready` endpoint dynamic import
6. Add auth route rate limiting

### Phase 2 — Data Access Rewrite (Days 3-7)
1. Create `getSupabaseClient()` (anon key) alongside `getSupabaseAdmin()`
2. Rewrite each service: replace `collections.x()` with `supabase.from('x')`
3. Remove adapter layer files after all callers migrated
4. Fix transactions to use pg pool client
5. Add per-route Zod validation

### Phase 3 — Auth & Security (Days 8-10)
1. Backend: set httpOnly cookie on login/refresh
2. Frontend: remove localStorage token read, read from cookie
3. Add CSRF middleware
4. Fix CSP to use nonces
5. Add Helmet permissionsPolicy

### Phase 4 — Consolidation (Days 11-14)
1. Merge analytics v1 and v2
2. Consolidate routes into feature modules
3. Standardize error response format
4. Fix auth token refresh queue
5. Remove deprecated `class_ids`/`class_id` from user queries

### Rollback Strategy
- Each phase is independently rollbackable via git revert
- Data migration (Phase 2) has backup-first approach
- Auth cookie change (Phase 3) keeps old localStorage read as fallback for 1 week

## Open Questions

- Should the CSRF token be per-session or per-request? (Per-session is simpler, per-request is more secure)
- Should rate limit config be environment-variable driven or hardcoded? (Env vars for prod tuning)
- What's the cookie domain for multi-subdomain deployments? (Needs infra decision)
