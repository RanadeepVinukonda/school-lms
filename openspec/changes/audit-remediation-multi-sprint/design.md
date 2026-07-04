## Context

The comprehensive audit (8.0/20) identified systemic issues across all layers. The database lacks foreign keys, RLS, and business rule constraints — all validation is in application code and often wrong. The backend still has Firestore bindings from a partial migration. The frontend has inline supabase calls and N+1 queries. The mobile apps are non-functional prototypes with 46 `onClick` errors and zero API integration. These are not isolated bugs but a coordinated failure of architectural integrity.

## Goals / Non-Goals

**Goals:**
- Fix all database referential integrity (FKs, constraints, RLS, indexes)
- Fix 16 P1 business logic bugs (attendance, timetable, fee, analytics, payroll, pipeline)
- Complete Firestore-to-Supabase migration (remove all Firestore bindings)
- Fix frontend rendering bugs (inline supabase, N+1, dark mode, dropdowns)
- Rebuild mobile apps with correct RN APIs and real API integration
- Fix analytics calculations (weighted averages, NaN-safe, no double-count)

**Non-Goals:**
- No new features (pure remediation, no scope creep)
- No complete database normalization (that is a separate change)
- No UI redesign (fixing bugs, not reimagining)
- No mobile design changes (functional fixes only)

## Decisions

1. **Sprint ordering by dependency**: Sprint 1 (DB) → Sprint 2 (Backend) → Sprint 3 (Frontend) → Sprint 4 (Mobile). Each sprint unblocks the next.
2. **DB fixes are additive, not destructive**: Add FK constraints, RLS policies, and indexes via new migrations. Do not rewrite existing migrations to avoid breaking deployed instances.
3. **One migration to fix ordering**: A single "meta-migration" that creates missing tables referenced by earlier migrations, so the two migration directories can be applied in any order.
4. **Backend fixes in services, not controllers**: Business logic bugs are in service files. Controllers only need route/middleware fixes for authorization gaps.
5. **Mobile rewrite reuses shared module**: The existing `@genesis-lms/shared` has the right axios/supabase/zustand architecture but no screens consume it. Rebuild screens to use existing `api` client.
6. **Frontend fixes use React Query**: Replace inline supabase calls in App.tsx and AdminLayout with `useQuery` hooks. Fix N+1 with batch `in()` queries.

## Risks / Trade-offs

- **[Risk] DB migration ordering**: Adding FK constraints may fail if existing data has orphaned references. → Mitigation: Pre-migration audit script to find and fix orphans, run in a transaction with rollback.
- **[Risk] Backend bugfixes change API response shapes**: Frontend may break. → Mitigation: Add response mapping in services to maintain backward-compatible shapes for each sprint.
- **[Risk] Mobile rebuild is large**: 24 screens, 3 apps, auth flow. → Mitigation: Build student app first (most used), then teacher, then parent. Release per-app.
- **[Risk] Analytics fix changes historical numbers**: Teachers may see different averages. → Mitigation: Deploy analytics fix with before/after comparison in release notes.
- **[Risk] Sprint 3 depends on Sprint 2**: Can't fix analytics display until backend returns correct data. → Mitigation: Sprint 2.1 (backend bugs) and Sprint 3 (frontend UI) overlap where possible.
