## Why

Production audit scored the app 58/100 readiness and 52/100 security. The Firestore-to-Supabase migration left an adapter layer that bypasses RLS, hides type errors, and makes every query ~2x slower than direct Supabase calls. CORS allows all origins on Vercel. JWT tokens in localStorage are stealable via XSS. JSON body limit of 100MB enables trivial DDoS. These issues must be fixed before adding more features — every new feature builds on a leaky foundation.

## What Changes

- Replace `getSupabaseAdmin()` service-role client with anon-key client for user-scoped queries; service role reserved for admin ops
- Replace `localStorage` token persistence with httpOnly cookies
- Remove Firestore adapter abstraction; use Supabase client directly
- Fix CORS to use explicit allowlist regardless of environment
- Reduce JSON body limit to 1MB (5MB for uploads)
- Replace `'unsafe-inline'` CSP with nonce-based inline scripts
- Fix transactions to use pg pool client (not Supabase REST) for actual ACID
- Migrate all `nosql_docs` collections to typed tables
- Fix N+1 queries in attendance, notification, fee services
- Consolidate 71 route files into feature-based modules
- Remove duplicate `/fee` and `/fees` routes
- Add per-route Zod request validation
- Add auth route rate limiting
- Fix auth token refresh queue infinite loop
- Consolidate analytics v1 and v2 engines
- Add standard error response format across all endpoints
- Add CSRF protection for state-changing endpoints

## Capabilities

### New Capabilities
- `direct-supabase-integration`: Replace Firestore-compatible adapter with direct Supabase client calls. Remove adapter layer (~600 lines). All queries go through typed Supabase client with RLS enforcement.
- `http-only-auth`: Move JWT from localStorage to httpOnly cookies. Auth refresh via cookie-based flow. Eliminates XSS token theft vector.
- `request-validation`: Per-route Zod schema validation for all request bodies, params, and queries. Consistent error responses format.
- `feature-based-routes`: Consolidate 71 route files into domain modules (auth, school, finance, academics, hr, content, infrastructure). Auto-discover routes.
- `analytics-consolidation`: Merge analytics v1 and v2 engines. Weighted averages, NaN-safe calculations, single source of truth.

### Modified Capabilities
- `cors-security`: CORS allowlist enforced in all environments, including Vercel deployments.
- `rate-limiting`: Auth-specific rate limits (5/15min) applied to all auth endpoints, separate from global API limit.
- `data-integrity`: Transactions use pg pool client for real ACID guarantees. WriteBatch replaced with Supabase transactions.
- `error-handling`: Standard error response shape `{ success: boolean, error?: { code, message, details }, data?: T }` across all endpoints.

## Impact

- **Database**: All `nosql_docs` collections migrated to typed tables. ~30 collections need migration scripts. Risk of data loss if migration fails — requires backup-first approach.
- **Backend API**: Every service file changes from `collections.x().doc(id).get()` to `supabase.from('x').select('*').eq('id', id).single()`. ~80 services affected. Breaking change to internal API layer.
- **Frontend**: Token storage changes from localStorage read to cookie read. Auth service rewritten. No UI changes.
- **Security**: CORS behavior changes — Vercel preview deployments lose open CORS. May break dev workflows until allowlist is updated.
- **Infrastructure**: Rate limit tuning needed after auth route limits are applied. Monitor for false positives.
