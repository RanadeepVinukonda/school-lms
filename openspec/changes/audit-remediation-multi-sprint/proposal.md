## Why

The comprehensive audit (2026-07-03) scored the entire codebase at **8.0/20 (Poor)** — DB has no FKs and broken RLS (1.6/4), backend has NaN risks and Firestore bindings (2.0/4), frontend has inline supabase calls (2.5/4), business logic has 16 P1 bugs (1.5/4), and mobile apps are non-functional prototypes (0.4/4). These issues compound: wrong analytics data misleads teachers, duplicate attendance marks inflate reports, missing RLS leaks data across schools, and mobile apps crash on launch. A coordinated multi-sprint remediation is needed.

## What Changes

- **BREAKING**: Database schema fixes — add all missing FKs, unique constraints, CHECK constraints, indexes, and RLS policies across all tables
- **BREAKING**: Fix migration ordering — merge two migration directories into a single ordered sequence, remove references to non-existent tables
- **BREAKING**: Fix business logic bugs — attendance dedup, teacher double-book, fee overpayment, payroll duplicate, pipeline race conditions
- **BREAKING**: Mobile app rebuild — fix all React Native API errors (onClick→onPress, borderBorderWidth, alert, label, trackingWith), add auth, integrate 24 screens with real API
- **BREAKING**: Analytics fixes — replace avg-of-averages with weighted average, fix teacher comparison double-count, add NaN guards, fix trends tab
- **BREAKING**: Remove remaining Firestore bindings — replace batch.write(), batch.create(), Firestore where() syntax with Supabase adapter
- Frontend fixes — move inline supabase calls to React Query, fix N+1 queries, add loading/error/empty states, fix thick placeholders, add dark mode variants
- UI fixes — dropdowns show class-section names, analytics undefined% fixed, badges/quick links layout, back navigation, student timetable display

## Capabilities

### New Capabilities
- `sprint-1-database-schema`: Fix all FKs, constraints, RLS, indexes, migration ordering, array column replacement
- `sprint-2-backend-bugfix`: Fix 16 P1 business logic bugs, replace Firestore bindings, add missing validators, NaN guards
- `sprint-3-frontend-ui`: Fix inline supabase calls, dropdowns, analytics display, thick placeholders, dark mode, badges, quick links, back nav, student timetable
- `sprint-4-mobile-rebuild`: Fix all RN API errors, add auth gating, integrate 24 screens with real API, add loading/error/empty states

### Modified Capabilities
- `database-consolidation`: Scope expanded from adapter unification to full schema integrity (FKs, constraints, RLS)
- `school-erp`: Requirements updated for attendance dedup, timetable conflict detection, fee overpayment prevention
- `analytics-engine`: Requirements updated for weighted averages, NaN-safe calculations, teacher comparison fix
- `mobile-experience`: Requirements updated — complete rewrite needed (not just polish)
- `error-handling-audit`: Requirements updated to cover all 45+ backend services and missing validators
- `multi-tenant-saas`: Requirements updated for complete RLS coverage on all 20+ tables
- `firebase-removal`: Finish Firestore-to-Supabase migration (batch writes, where() syntax, collection refs)

## Impact

- **Database**: All migration files, schema.sql, create_views.sql affected. New migration to fix ordering.
- **Backend** (`lms/backend/src/`): All 49 services, 44 controllers, 16 validators, routes updated for bugfixes and Firestore removal
- **Frontend** (`lms/frontend/src/`): App.tsx, AdminLayout, NotificationDropdown, 10+ admin pages, 20+ student pages, analytics pages
- **Mobile** (`lms/mobile/`): All 24 screens across 3 apps rewritten, auth flow added, shared API client used
- **Search** (`lms/search/`): Index population queries may need minor updates
