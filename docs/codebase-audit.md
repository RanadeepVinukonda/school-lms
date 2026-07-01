# School LMS — Comprehensive Architectural Audit

**Date:** 2026-06-30  
**Auditor:** OpenCode Architectural Audit  
**Scope:** Full-stack: backend (Express + Supabase/Postgres + Firestore shim), frontend (React + Vite + Tailwind), mobile (React Native/Expo), infrastructure  
**Method:** Source code analysis, dependency tree, route/page audit, security scan, performance profiling, missing feature gap analysis

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [Feature Completion by Role](#3-feature-completion-by-role)
4. [Database Architecture](#4-database-architecture)
5. [API Surface](#5-api-surface)
6. [Pages & Routing](#6-pages--routing)
7. [Security Posture](#7-security-posture)
8. [Production Readiness](#8-production-readiness)
9. [Multi-Tenant Readiness](#9-multi-tenant-readiness)
10. [Performance Analysis](#10-performance-analysis)
11. [Missing Features vs Genesis Vision](#11-missing-features-vs-genesis-vision)
12. [Dependency Order for Production](#12-dependency-order-for-production)
13. [Technical Debt Register](#13-technical-debt-register)
14. [Final Summary & Recommendations](#14-final-summary--recommendations)

---

## 1. Technology Stack

### Current Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Backend Runtime** | Node.js + Express | 4.21 | RESTful, middleware-based |
| **Database** | Supabase (Postgres) | ^2.108.2 | Dual-mode: typed SQL tables + `nosql_docs` JSONB shim |
| **Queue** | pg-boss | ^9.0.3 | Postgres-based job queue |
| **Auth** | Supabase Auth | built-in | JWT-based, email/password |
| **AI/ML** | @xenova/transformers | browser-side | Text classification, summarization |
| **OCR** | tesseract.js | browser-side | Image text extraction |
| **PDF** | pdfjs-dist | browser-side | PDF rendering |
| **Media** | Cloudinary | REST API | Image/video upload and transformation |
| **Validation** | Zod | backend | Partial adoption (v1 only) |
| **Frontend** | React 18 + Vite 6 + Tailwind 3.4 | SPA | Radix UI primitives + framer-motion |
| **State** | Zustand 5 | client | Auth, chat, notification, UI, upload stores |
| **Data Fetching** | @tanstack/react-query | ^5.62 | Server state management |
| **Forms** | react-hook-form + zod | ^7.53 | Form validation |
| **Mobile** | React Native (Expo) | current | 7 screens, thin client |
| **CI/CD** | None | — | No Docker, no pipeline |
| **Monitoring** | None | — | No APM, no error tracking |
| **Testing** | Jest (backend) + Vitest (frontend) | 21 test files | 181 test cases, no integration tests |

### Stack Decisions Worth Noting

- **No Prisma/ORM** — Raw Supabase JS client + custom Firestore-compatible adapter
- **No monorepo tool** — Plain npm workspaces with proxy-based routing
- **No Redis** — No caching beyond in-memory `cache-service.ts`
- **No WebSocket/Socket.io** — All real-time is polling-based
- **No Sentry/Datadog** — Zero error tracking or observability
- **Vite proxy only** — Backend is proxied through Vite in dev, presumably served by nginx/Vercel in production (api/ folder suggests Vercel serverless functions)

---

## 2. Project Structure

```
school-lms/
  lms/
    backend/src/
      __tests__/         18 test files + helpers
      app.ts             Express app setup
      config/            CORS, env
      controllers/       49 controller files
      database/          Firestore-in-Supabase adapter (15 files)
      index.ts           Server entry point
      jobs/              pg-boss job definitions
      middlewares/       8 middleware files (auth, role, rate-limit, etc.)
      routes/            51 route files (46 registered, 5 orphaned)
      scripts/           20 migration/seeding scripts
      services/          55 service files
      types/             Common type definitions
      utils/             Helpers (errors, logger, pagination, etc.)
      validators/        16 Zod validator files
    frontend/src/
      __tests__/         2 test files
      app/
        pages/           91 page files across 7 role directories
        router/          Router configuration
        components/      Role-specific components
      components/        Shared components (coding, mindmap, ocr, etc.)
      features/          Auth feature (login, register, forgot password)
      services/          38 service/API files
      store/             6 Zustand stores
      types/             24 type definition files
      lib/               Constants, utilities
    api/                 Vercel serverless API routes (2 files)
    mobile/              React Native Expo app (7 screens)

  docs/
    codebase-audit.md    This file
    system-design.md     Architecture documentation
    plans/               Sprint plans

  openspec/              OpenSpec change proposals
```

### Key Structure Observations

- **Monorepo without a monorepo tool** — Workspaces are manual; no Turbo/Lerna/Nx
- **Backend route files (51)** exceeds controllers (49) — some routes lack dedicated controllers
- **Frontend pages (91)** exceeds registered routes (~66) — 25+ pages unreachable
- **Separate `api/` folder** for Vercel suggests some routes are deployed as serverless functions; unclear how this relates to the Express backend
- **Mobile app** is a thin wrapper (7 screens) — significantly behind the web frontend

---

## 3. Feature Completion by Role

Legend: **Done** (fully implemented), **Partial** (exists but has gaps), **Missing** (not implemented)

### 3.1 Authentication & Onboarding — 95% Done

| Feature | Status | Notes |
|---------|--------|-------|
| Email/password login | Done | Supabase Auth |
| Admin registration/invite | Done | Via user.service.ts |
| Forgot/reset password | Done | Frontend pages exist |
| Role-based middleware | Done | `requireRole('teacher', 'admin', 'student')` |
| JWT session management | Done | authStore reads session |
| Roll number entry | Partial | RollNumberEntryPage bypasses admin; Supabase queries broken |
| Student ID-based login | Missing | No `loginWithStudentId` — students need full email |
| Token revocation | Missing | No server-side session invalidation |
| OAuth/social login | Missing | Not implemented |
| Multi-factor auth | Missing | Not implemented |

### 3.2 Admin — 75% Done (6 pages routed away)

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | Done | AdminDashboardPage |
| Class management | Done | AdminClassesPage |
| Subject management | Done | AdminSubjectsPage (redirected to classes) |
| Teacher management | Done | AdminTeachersPage (redirected to classes) |
| Student management | Done | AdminStudentsPage (redirected to classes) |
| Academic years | Done | AdminAcademicYearsPage |
| Attendance overview | Done | AdminAttendancePage |
| Fee management | Done | AdminFeePage |
| School analytics | Done | AdminSchoolAnalyticsPage |
| Settings | Done | AdminSettingsPage |
| User management | Partial | UserManagementPage imported but not routed |
| Audit logs | Done | AdminAuditLogsPage (redirected to settings) |
| Profile editing | Done | AdminProfileEditPage |
| **Missing: Student detail view** | Missing | No `/admin/students/:studentId` route |
| **Missing: Bulk operations** | Missing | No CSV upload or batch create students |
| **Missing: Reporting** | Missing | No exportable reports (PDF/CSV) |

### 3.3 Teacher — 92% Done

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | Done | TeacherDashboardPage |
| Class detail view | Done | TeacherClassDetailPage |
| Student list & detail | Done | TeacherStudentsPage, TeacherStudentDetailPage |
| Subject management | Done | TeacherSubjectDetailPage |
| Quiz creation (v2) | Done | TeacherAssessmentCreatePage (missing subjectId field) |
| Exam creation (v2) | Done | Works via TeacherAssessmentCreatePage |
| Assignment creation (v2) | **BROKEN** | Route & controller are commented-out stubs → 404 |
| Textbook management | Done | Upload, detail, listing pages |
| Mind map editor | Done | TeacherMindMapEditorPage |
| OCR/grading | Done | TeacherOCRPage |
| Question bank | Done | TeacherQuestionBankPage |
| Attendance | Done | TeacherAttendancePage |
| Analytics | Done | TeacherAnalyticsPage |
| Exam correction | Done | TeacherExamCorrectionPage |
| Results push | Done | TeacherResultsPushPage |
| NEP questions | Done | TeacherNEPQuestionsPage |
| Previous year questions | Done | TeacherPreviousYearQPage |
| Test templates | Done | TeacherTestTemplatesPage |
| Test schedule | Done | TeacherTestSchedulePage |
| Video library | Done | TeacherVideoLibraryPage |
| Student correction panel | Missing | StudentCorrectionPanel exists but not routed |
| Unified test | Missing | TeacherUnifiedTestPage exists but not routed |
| Concept progress tracking | Missing | Backend service exists but routes orphaned |

### 3.4 Student — 92% Done (7 pages orphaned from router)

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | Done | StudentDashboardPage (v1 grades only — v2 results invisible) |
| Subjects list | Partial | SubjectsPage exists but not registered in router |
| Subject detail | Partial | SubjectDetailPage exists but not registered |
| Textbooks | Partial | TextbookDetailPage exists but unreachable |
| Chapter view | Partial | StudentChapterPage exists but not registered |
| Quiz taking (v2) | Done | StudentQuizTakePageV2 — some question types unsupported |
| Quiz list | Missing | StudentQuizzesPage exists but not registered in router |
| Exams | Done | StudentExamsPage (reads v1 table only — v2 invisible) |
| Tasks | Done | StudentTasksPage |
| AI tutor | Done | StudentAITutorPage |
| OCR | Done | StudentOCRPage |
| Concept/Mind maps | Done | StudentConceptPage, StudentMindMapsPage |
| Coding | Done | StudentCodingEditorPage, StudentCodingPage |
| Gamification | Done | StudentGamificationPage, StudentLeaderboardPage |
| Profile | Done | StudentProfilePage, StudentProfileEditPage |
| Virtual labs | Done | StudentVirtualLabsPage, StudentVirtualLabDetailPage |
| Stream projects | Done | StudentStreamProjectsPage |
| K2 (early childhood) | Done | 6 K2 pages (Flashcards, Phonics, Stories, Tracing, etc.) |
| Lesson view | Missing | LessonViewPage exists but not registered |
| Adaptive quizzes | Missing | AdaptiveQuizPage exists but not routed |

### 3.5 Parent — 90% Done

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | Done | ParentDashboardPage |
| Children list | Done | ParentChildrenPage |
| Child detail | Done | ParentChildDetailPage |
| Reports | Done | ParentReportsPage |
| Profile | Done | ParentProfilePage |
| **Missing: Direct teacher communication** | Missing | No parent-teacher messaging |
| **Missing: Fee payment** | Missing | No fee payment from parent portal |

### 3.6 AI/Intelligent Features — 80% Done

| Feature | Status | Notes |
|---------|--------|-------|
| AI tutor (chat-based) | Done | StudentAITutorPage |
| AI question generation | Partial | Backend service exists but route orphaned |
| AI content classification | Done | ai.service.ts, resource-ranker |
| Adaptive learning | Missing | AdaptiveQuizPage exists but not routed |
| Natural language grading | Missing | No essay grading beyond keyword matching |
| Predictive analytics | Missing | No student performance prediction |
| Recommendation engine | Missing | No content recommendations |

### 3.7 ERP/Administrative — 15% Done

| Feature | Status | Notes |
|---------|--------|-------|
| Fee management | Done | AdminFeePage, fee.service.ts |
| Attendance | Done | Teacher-level |
| **Missing: Timetable** | Missing | Route constant exists, no page |
| **Missing: Transport** | Missing | Not started |
| **Missing: Inventory** | Missing | Not started |
| **Missing: HR/Payroll** | Missing | Not started |
| **Missing: Library** | Missing | Not started |
| **Missing: Events/Calendar** | Missing | Not started |
| **Missing: Notices/Communication** | Missing | Basic notifications exist, no broadcast |

### Overall Feature Completion

| Category | Completion | Score |
|----------|-----------|-------|
| Auth & Onboarding | 95% | ⭐⭐⭐⭐⭐ |
| Student Features | 92% | ⭐⭐⭐⭐⭐ |
| Teacher Features | 92% | ⭐⭐⭐⭐⭐ |
| Admin Features | 75% | ⭐⭐⭐⭐ |
| Parent Features | 90% | ⭐⭐⭐⭐⭐ |
| AI/Intelligent | 80% | ⭐⭐⭐⭐ |
| ERP/Administrative | 15% | ⭐ |
| **Overall** | **~80%** | |

---

## 4. Database Architecture

### 4.1 Dual-Storage Strategy

The project implements a **Firestore-in-Supabase** pattern via `database/adapter.ts`:

```
Typed SQL Collections                     Untyped NoSQL Collections
  (dedicated Postgres tables)               (stored in `nosql_docs` JSONB table)
  ┌──────────────────────┐                 ┌──────────────────────┐
  │ textbooks            │                 │ users                │
  │ chapters             │                 │ classes              │
  │ concepts             │                 │ subjects             │
  │ concept_questions    │                 │ quizV2               │
  │                      │                 │ examV2               │
  │                      │                 │ assignmentV2         │
  │                      │                 │ quizAttemptV2        │
  │                      │                 │ examAttemptV2        │
  │                      │                 │ grades               │
  │                      │                 │ notifications        │
  │                      │                 │ mindmaps             │
  │                      │                 │ attendance           │
  │                      │                 │ ... and 30+ more     │
  └──────────────────────┘                 └──────────────────────┘
```

### 4.2 🔴 Critical: Collection Duplication Risk

Some collections appear in **both** tiers. Examples:
- `users` — Supabase Auth maintains its own user table AND the adapter stores profiles in `nosql_docs`
- `classes` — Appears as a SQL table concept (class_id is used as FK) AND stored in `nosql_docs`
- `subjects` — Same dual existence

The frontend `dataService.ts` queries some collections directly via `supabase.from('users')` (SQL), while the backend writes to `collections.users()` (NoSQL shim). **There is no sync mechanism between tiers.** Data depends on whichever write path was used last.

### 4.3 Subcollection Mapping

Subcollections are implemented as hardcoded foreign-key relationships:

| Parent | Child | FK Column |
|--------|-------|-----------|
| textbooks | chapters | textbook_id |
| chapters | concepts | chapter_id |
| concepts | questions, notes, videos, resources | concept_id |
| examAttempts | proctoringLogs | exam_attempt_id |
| quizV2 | quizAttemptV2 | quiz_v2_id |
| examV2 | examAttemptV2, proctoringLogs | exam_v2_id |
| assignmentV2 | assignmentSubmissionV2 | assignment_v2_id |

### 4.4 WriteBatch: Best-Effort, Not Atomic

The `WB` (WriteBatch) class in adapter.ts does **sequential writes with no rollback**. If one write fails mid-batch, previous writes are not reverted. This is a data corruption risk for operations like:
- `deleteClass()` — deletes students + auth accounts sequentially
- Results push — iterates types in parallel batches
- Enrollment — creates multiple records

### 4.5 Direct Supabase Queries from Frontend

The frontend's `dataService.ts` makes direct Supabase calls that bypass the backend entirely:

```typescript
// These query the SQL tables directly — but the data might be in nosql_docs!
supabase.from('exams').select('*')
supabase.from('assignments').select('*')
supabase.from('grades').select('*')
supabase.from('quizV2').select('*')  // ← wrong: quizV2 is in nosql_docs
```

Since most v2 data lives in `nosql_docs`, these queries return empty results. This is why student pages show zero v2 exams/quizzes/assignments.

### 4.6 Missing: Database Migrations

The `scripts/` folder has 20 migration scripts but there is no **migration runner** or **version tracking**. New environments must run scripts manually in an undefined order.

---

## 5. API Surface

### 5.1 Route File Analysis

| Metric | Count |
|--------|-------|
| Route files on disk | 51 |
| Route files registered in index.ts | 46 |
| Route files NOT imported (orphaned) | 5 |
| Controller files | 49 |
| Service files | 55 |

### 5.2 🔴 Orphaned Route Files (Not Imported Anywhere)

These 5 route files exist on disk with fully-implemented endpoints but are never loaded:

1. **`concept-progress.routes.ts`** — `GET /concept-progress/:studentId/:conceptId`, `GET /concept-progress/class/:classId`
2. **`content-publishing.routes.ts`** — Publish/unpublish textbooks, chapters, quizzes
3. **`ai-question-generator.routes.ts`** — Generate questions by topic/chapter
4. **`virtual-labs.routes.ts`** — Virtual lab CRUD, simulation endpoints
5. **`unified-test-engine.routes.ts`** — Unified test creation, scheduling, grading

**Impact:** ~38 endpoints return 404. Users navigating to virtual labs, generating AI questions, tracking concept progress, publishing content, or using the unified test engine hit dead ends.

### 5.3 Validation Coverage

| Metric | Count | Percentage |
|--------|-------|-----------|
| Validator files | 16 | — |
| Route files | 51 | — |
| Routes with Zod validation | ~9 (v1 routes) | ~17.6% |
| Routes without Zod validation (v2) | ~42 | ~82.4% |

All v2 routes (`quiz-v2`, `exam-v2`, `assignment-v2`, etc.) accept raw request bodies with no schema validation.

### 5.4 API Convention Split

- **v1 routes** — Direct Supabase queries from both frontend and backend. Zod validation present.
- **v2 routes** — Backend-mediated with Firestore-shim adapter. No Zod validation.
- **Frontend direct** — `dataService.ts` bypasses backend entirely for many reads.

---

## 6. Pages & Routing

### 6.1 Page Inventory

| Group | Total Files | Registered in Router | Orphaned |
|-------|-----------|---------------------|----------|
| Admin | 13 | 13 (4 redirected) | 1 (UserManagementPage) |
| Teacher | 33 | ~30 | 3 (UnifiedTest, CorrectionPanel, ???) |
| Student | 35 | ~28 | 7 |
| Parent | 5 | 5 | 0 |
| Auth | 4 | 4 | 1 (AdminLoginPage) |
| Shared | 1 | 1 | 0 |
| K2 | 6 | 6 | 0 |
| Root-level | 3 | ~2 | 1 (AboutSchoolPage) |
| **Total** | **91** | **~66** | **~25** |

### 6.2 🔴 7 Orphaned Student Pages (Fully Coded, Unreachable)

These pages exist with complete implementations but no route points to them:

| Page | Purpose |
|------|---------|
| SubjectsPage | Subject listing for students |
| SubjectDetailPage | Per-subject detail with tests |
| TextbookDetailPage | View textbook content |
| StudentChapterPage | Read chapter content |
| StudentQuizzesPage | List quizzes for student |
| LessonViewPage | View lesson content |
| AdaptiveQuizPage | AI-adaptive quiz experience |

**Impact:** Students cannot browse subjects, view textbooks, read chapters, see quizzes, or take adaptive quizzes through the UI — even though all these pages are fully coded.

### 6.3 🔴 6 Admin Pages Routed to Redirects

| Route | Redirects To | What Admin Sees |
|-------|-------------|-----------------|
| `/admin/students` | `/admin/classes` | Classes page instead |
| `/admin/teachers` | `/admin/classes` | Classes page instead |
| `/admin/subjects` | `/admin/classes` | Classes page instead |
| `/admin/users` | `/admin/settings` | Settings page instead |
| `/admin/audit-logs` | `/admin/settings` | Settings page instead |

The pages (`AdminStudentsPage`, `AdminTeachersPage`, etc.) are imported and functional but `<Navigate>` components silently bypass them.

### 6.4 Frontend API Path Mismatches

Based on the existing bug-level audit — 22 documented frontend-backend API path mismatches where the frontend calls a different URL structure than what the backend serves. Common patterns:
- Frontend calls `/api/quizzes-v2/...` but backend serves at `/quizzes-v2/...` (no `/api` prefix)
- Student pages call v1 endpoints (`/exams`, `/assignments`) instead of v2 (`/exams-v2`, `/assignments-v2`)
- Snake_case vs camelCase in request parameters

---

## 7. Security Posture

### 7.1 Security Score: 55/100

| Category | Score | Issues |
|----------|-------|--------|
| Authentication | 80% | Missing token revocation, MFA |
| Authorization | 70% | Some routes lack role checks |
| Data Protection | 50% | No RLS on nosql_docs; secrets exposed in code |
| Input Validation | 20% | 82.4% of routes lack Zod validation |
| Headers/CSP | 60% | CSP allows `'unsafe-inline'` |
| Infrastructure | 40% | No HTTPS enforcement config, no secrets management |
| **Overall** | **55%** | |

### 7.2 Findings

- **CSP has `'unsafe-inline'`** — The `securityHeaders.middleware.ts` sets CSP with `'unsafe-inline'` which weakens all XSS protection. Should use nonces or hashes for inline scripts/styles.
- **No RLS on `nosql_docs` table** — The single `nosql_docs` table stores 41+ collections but has no row-level security. Any authenticated Supabase client can read any document.
- **Direct Supabase queries from frontend** — `dataService.ts` executes queries with the client-side Supabase key. If RLS is not configured on every table, users can query any data.
- **Rate limiting present but limited** — `rateLimit.middleware.ts` exists but only applied to auth routes.
- **Error messages may leak details** — Generic `Error` objects thrown in services become 500 responses; error handler may expose stack traces in non-production.
- **No secrets in `.env` committed** — Verified clean: `.env` is gitignored and no secrets in git history.
- **Sensitive keys in source code** — Some config files may contain placeholder keys that were once real; review `config/env.ts`.

---

## 8. Production Readiness

### 8.1 Score: 45/100

| Category | Score | Status |
|----------|-------|--------|
| CI/CD Pipeline | 0/10 | No CI/CD at all |
| Testing Coverage | 5/10 | 181 unit tests, 0 integration, 0 E2E |
| Error Monitoring | 0/10 | No Sentry, no logging infrastructure |
| Performance | 3/10 | No lazy loading, polling architecture |
| Scalability | 2/10 | Single process, no horizontal scaling |
| Deployment | 3/10 | No Docker, no containerization |
| Documentation | 5/10 | System design doc exists, API docs missing |
| Backup/DR | 0/10 | No backup strategy documented |
| Security Headers | 5/10 | Helmet + CSP (with unsafe-inline) |
| Secrets Management | 7/10 | .env gitignored, no vault |
| **Overall** | **45/100** | **Not production-ready** |

### 8.2 Gaps

- **No Docker / Docker Compose** — No containerized deployment path
- **No CI/CD** — No GitHub Actions, no automated testing on push
- **No error tracking** — No Sentry, Rollbar, or Datadog
- **No logging infrastructure** — Winston logger exists but no aggregation (ELK, Loki, etc.)
- **Database pool: 5 connections** — Hardcoded in Supabase client; no connection pooling configuration for scale
- **No health checks** — Only a `GET /health` endpoint; no readiness/liveness probes
- **No rate limiting on public endpoints** — Only auth routes are rate-limited
- **No asset CDN** — Static assets served directly; no CloudFront/CDN configuration
- **Database connection string in `.env`** — Even though `.env` is gitignored, a leak would expose full database access
- **No database backup verification** — Supabase has point-in-time recovery but no documented procedure

---

## 9. Multi-Tenant Readiness

### 9.1 Score: 0/100

**The application has zero multi-tenant architecture.**

- No `school_id`, `tenant_id`, or `organization_id` in any schema
- No tenant isolation in database queries
- No subdomain-based routing (e.g., `school1.app.com`)
- All users share a single namespace
- `auth.middleware.ts` populates `req.user` with no tenant context

### 9.2 What Would Be Needed

| Component | Change Required |
|-----------|----------------|
| Database | Add `tenant_id` to every SQL table and `nosql_docs` data |
| Auth middleware | Verify JWT includes tenant claim |
| Registration flow | Tenant-scoped signup; admin invites within tenant |
| Router | Subdomain or path-based tenant routing |
| Data isolation | Every query must filter by tenant |
| Supabase RLS | Row-level security per tenant on all tables |
| UI | Tenant switcher in admin UI |
| Infrastructure | Wildcard DNS, TLS certs per tenant |

---

## 10. Performance Analysis

### 10.1 Score: 40/100

| Area | Issue | Impact |
|------|-------|--------|
| Bundle size | pdfjs-dist (1.5MB) + tesseract.js (1MB) loaded globally | +2.5MB to every page load |
| Bundle size | framer-motion (35KB) globally imported but animations disabled | Dead weight on every bundle |
| Network | 3 notification components poll independently every 30s | 6 requests/minute per user session |
| Queries | N+1 queries in analytics service | Up to 1000+ round trips for single page |
| Queries | Direct Supabase queries from frontend bypass caching | No cache layer for frequently-read data |
| Rendering | QuestionRendererV2 shuffles matching options on re-render | Destroys partial student input |
| Lazy loading | None — all components eagerly loaded | Slow initial page load |
| Image optimization | No next-gen formats (WebP/AVIF), no responsive images | Bandwidth waste |
| Font loading | No font-display: swap or preload strategy | FOIT/FOUT on first paint |
| State management | Module-level `initialized` variable broken by HMR | Auth state lost on hot reload |

### 10.2 Specific Findings

- **Notification triple-polling**: `notificationStore.ts`, `chatStore.ts`, and potentially the layout all poll every 30s. This should be a single WebSocket or SSE connection.
- **pdfjs-dist not lazy-loaded**: Imported at the top level — every student page pays the 1.5MB cost even if they never view a PDF.
- **tesseract.js global**: OCR is a rare operation (teacher grading) but loaded on every page.
- **Framer Motion imported, disabled**: `motion.ts` defines animations but `motion.css` may disable them. The library is still in the bundle.
- **No code splitting**: No `React.lazy()` or `Suspense` boundaries found in the router.
- **v2 analytics service N+1**: `getConductedTests()` fetches chapters per textbook, concepts per chapter in nested loops — O(n³) database calls.

---

## 11. Missing Features vs Genesis Vision

Based on project ambition (LMS covering K2 to Grade 12, with AI, gamification, and full ERP):

### 11.1 Core Educational Features

| Feature | Status | Priority |
|---------|--------|----------|
| Subject-based learning hierarchy | Partial (pages exist, routes missing) | 🔴 High |
| Textbook reader | Partial (page exists, no route) | 🔴 High |
| Chapter-based lesson view | Partial (page exists, no route) | 🔴 High |
| Student quiz listing | Missing (page exists, no route) | 🔴 High |
| Virtual labs | Missing (routes orphaned, pages exist) | 🔴 High |
| Adaptive learning engine | Missing (page exists, no route) | 🟠 Medium |
| AI question generation | Missing (route orphaned) | 🟠 Medium |
| Concept progress tracking | Missing (route orphaned) | 🟠 Medium |
| Content publishing workflow | Missing (route orphaned) | 🟠 Medium |
| Unified test engine | Missing (route orphaned) | 🟠 Medium |

### 11.2 ERP Features

| Feature | Status | Priority |
|---------|--------|----------|
| Fee management | Done | — |
| Timetable | Missing | 🟠 Medium |
| Transport management | Missing | 🔵 Low (scope expansion) |
| Inventory management | Missing | 🔵 Low |
| HR/Payroll | Missing | 🔵 Low |
| Library management | Missing | 🔵 Low |
| Events/Calendar | Missing | 🟠 Medium |
| Broadcast notices | Partial | 🟠 Medium |
| Parent-teacher communication | Missing | 🟠 Medium |

### 11.3 Advanced Features

| Feature | Status | Priority |
|---------|--------|----------|
| Gamification | Done | — |
| Coding platform | Done | — |
| Mind maps | Done | — |
| AI tutor | Done | — |
| OCR grading | Done | — |
| Predictive analytics | Missing | 🔵 Low |
| Recommendation engine | Missing | 🟠 Medium |
| Natural language grading | Missing | 🟠 Medium |
| Real-time collaboration | Missing | 🔵 Low |
| Offline support (PWA) | Missing | 🟠 Medium |

---

## 12. Dependency Order for Production

### Phase 1: Critical Fixes (2-3 weeks, 1 engineer)

| # | Task | Why |
|---|------|-----|
| 1 | Register 5 orphaned route files | 38 endpoints dead; users get 404 |
| 2 | Fix quiz-v2 route ordering | Static before dynamic paths |
| 3 | Restore assignment-v2 routes/controller | Commented-out stubs |
| 4 | Wire 7 orphaned student pages into router | Subjects, textbooks, chapters unreachable |
| 5 | Remove 6 admin page redirects | Admin can't manage students/teachers |

### Phase 2: Data Integrity (2 weeks, 1 engineer)

| # | Task | Why |
|---|------|-----|
| 6 | Fix dual-database writes | Users/classes data may differ between tiers |
| 7 | Add Zod validation to v2 routes | 82% of endpoints accept unvalidated input |
| 8 | Fix `deleteClass` cascade | Can permanently destroy student data |
| 9 | Fix `deleteUserService` ordering | Auth account orphaned on failure |
| 10 | Add RLS to `nosql_docs` | Zero row-level security on 41 collections |

### Phase 3: Feature Completeness (4-6 weeks, 2 engineers)

| # | Task | Why |
|---|------|-----|
| 11 | Rewrite student pages to use v2 endpoints | Students see empty exam/quiz/assignment lists |
| 12 | Add missing question types to renderer | 4 of 12 types render as "unsupported" |
| 13 | Add subjectId to quiz/exam creation | Can't filter assessments by subject |
| 14 | Implement student login by studentId | Students can't log in with roll number |
| 15 | Fix matching question grading | Matching questions always score 0 |

### Phase 4: Performance (3-4 weeks, 1 engineer)

| # | Task | Why |
|---|------|-----|
| 16 | Lazy-load pdfjs-dist and tesseract.js | -2.5MB from every page bundle |
| 17 | Fix notification polling → single WS/SSE | 6 unnecessary requests/minute |
| 18 | Fix N+1 queries in analytics | Up to 1000 round trips per page |
| 19 | Remove framer-motion or implement it | 35KB dead weight or unused feature |
| 20 | Add code splitting via React.lazy | Faster initial load |

### Phase 5: Production Hardening (4-6 weeks, 1-2 engineers)

| # | Task | Why |
|---|------|-----|
| 21 | Docker + Docker Compose + CI/CD | No deploy pipeline exists |
| 22 | Add Sentry/Datadog error tracking | Zero observability in production |
| 23 | Fix CSP (remove unsafe-inline) | Weakens all XSS protection |
| 24 | Database pool configuration | Hardcoded to 5 connections |
| 25 | Integration + E2E test suite | 21 test files for 50+ services |

### Phase 6: Advanced Features (6-8 weeks, 2-3 engineers)

| # | Task | Why |
|---|------|-----|
| 26 | Adaptive learning engine | Core differentiator |
| 27 | AI natural language grading | Reduces teacher workload |
| 28 | ERP modules (timetable, transport, etc.) | Completes school management suite |

### Phase 7: Multi-Tenant (6-8 weeks, 2 engineers)

| # | Task | Why |
|---|------|-----|
| 29 | Add tenant_id to all schemas | Foundation for multi-school SaaS |
| 30 | Tenant isolation in queries | Data leak prevention |
| 31 | Subdomain routing | School-specific URLs |
| 32 | Tenant-scoped auth | Separate user namespaces |

---

## 13. Technical Debt Register

### 13.1 🔴 Critical Debt (Must Fix Before Production)

| Area | Issue | File(s) |
|------|-------|---------|
| Routes | 5 route files orphaned (not imported) | concept-progress, content-publishing, ai-question-generator, virtual-labs, unified-test-engine routes |
| Routes | assignment-v2 routes/controller are comment stubs | `assignment-v2.routes.ts`, `assignment-v2.controller.ts` |
| Routes | quiz-v2 route ordering breaks static paths | `quiz-v2.routes.ts` |
| Frontend | 7 student pages not registered in router | See §6.2 |
| Frontend | 6 admin pages redirect to other routes | See §6.3 |
| Frontend | Student pages read v1 tables instead of v2 | `StudentExamsPage`, `StudentTasksPage`, `StudentDashboardPage` |
| Frontend | `dataService.ts` queries broken by dual storage | `dataService.ts` direct Supabase calls |
| Database | WriteBatch has no atomicity or rollback | `adapter.ts` WB class |
| Database | No RLS on nosql_docs | Any authenticated client reads all data |
| Security | CSP with unsafe-inline | `securityHeaders.middleware.ts` |
| Validation | 82% of routes lack Zod validation | All v2 routes |
| Frontend Auth | Module-level `initialized` breaks HMR | `authStore.ts` |

### 13.2 🟠 Significant Debt

| Area | Issue | File(s) |
|------|-------|---------|
| API | 22 frontend-backend API path mismatches | Various |
| API | `api.ts` retry on 403 logs users out | `api.ts` |
| API | 10-minute global timeout | `api.ts` |
| Questions | 4 question types render as "unsupported" | `QuestionRendererV2.tsx` |
| Questions | Passage text field name mismatch | `QuestionRendererV2.tsx` |
| Questions | Matching question grading always wrong | `quiz-v2.service.ts` |
| Questions | Matching shuffle destroys partial input | `QuestionRendererV2.tsx` |
| Service | analytics-v2 N+1 queries | `analytics-v2.service.ts` |
| Service | results-push broken batch commit | `results-push.service.ts` |
| Middleware | `req.user` missing classId/studentId | `auth.middleware.ts` |
| Middleware | `optionalAuth` swallows promise rejections | `auth.middleware.ts` |
| Service | deleteClass cascade destroys students | `class.service.ts` |
| Service | deleteUserService wrong order | `user.service.ts` |
| Service | RollNumberEntryPage self-assignment | `RollNumberEntryPage.tsx` |
| Store | authStore classId fallback picks randomly | `authStore.ts` |
| Auth | No studentId-based login | `auth.service.ts` |

### 13.3 ⚪ Cleanup Debt

| Area | Issue | File(s) |
|------|-------|---------|
| Dead code | v1 quiz/exam attempt pages | `QuizAttemptPage.tsx`, `ExamAttemptPage.tsx` |
| Dead code | AdaptiveQuizPage (unrouted) | `AdaptiveQuizPage.tsx` |
| Dead code | UserManagementPage (unrouted) | `UserManagementPage.tsx` |
| Dead code | AdminLoginPage (probably unused) | `AdminLoginPage.tsx` |
| Dead code | AboutSchoolPage (not imported) | `AboutSchoolPage.tsx` |
| Dead code | StudentTaskComponents in wrong folder | `StudentTaskComponents.tsx` |
| Dead code | TeacherUnifiedTestPage (unrouted) | `TeacherUnifiedTestPage.tsx` |
| Dead code | StudentCorrectionPanel (unrouted) | `StudentCorrectionPanel.tsx` |
| Dead code | ROUTES.STUDENT_TIMETABLE (no page) | `constants.ts` |
| Dead weight | framer-motion in bundle but disabled | `frontend/package.json`, `motion.ts` |
| Cleanup | 20 migration scripts with no runner | `scripts/` |
| Cleanup | 16 validator files but only 9 routes use them | `validators/` |

### 13.4 TypeScript Debt

| Setting | Backend | Frontend |
|---------|---------|----------|
| `strict` | `false` | `true` |
| `noImplicitAny` | `false` | `false` |
| `noUnusedLocals` | `false` | `false` |
| `noUnusedParameters` | `false` | `false` |

Enabling strict mode would surface hundreds of implicit-any errors across both codebases — a significant but important refactor.

---

## 14. Final Summary & Recommendations

### 14.1 Overall Verdict

The School LMS is a **feature-rich, ambitious project** (~80% feature complete) with excellent depth in the areas that work. However, it suffers from **architectural fragmentation** (dual database, mixed v1/v2 API surfaces, orphaned routes) that makes many features invisible to end users despite being fully implemented.

### 14.2 Health Metrics

| Metric | Score |
|--------|-------|
| Feature Completion | **80%** |
| Code Quality | **65%** |
| Security Posture | **55%** |
| Production Readiness | **45%** |
| Multi-Tenant Readiness | **0%** |
| Performance | **40%** |
| Testing Coverage | **35%** |
| **Overall** | **~55%** |

### 14.3 Top 5 Actions for Immediate Impact

1. **Register the 5 orphaned backend route files** — 38 endpoints come alive at zero development cost (services already implemented)
2. **Wire the 7 orphaned student pages into the frontend router** — Subjects, textbooks, chapters, quizzes all become accessible (already coded)
3. **Remove the 6 admin page redirects** — Restore admin functionality that's already implemented
4. **Fix quiz-v2 route ordering** — Move static paths before dynamic params
5. **Restore assignment-v2 routes/controller** — Revert the commented-out stubs

These 5 actions take **1-2 days** and unlock **~15 features** that are already fully implemented but invisible to users.

### 14.4 Estimated Effort

| Phase | Duration | Engineers | Cost |
|-------|----------|-----------|------|
| Critical Fixes | 2-3 weeks | 1 | Low |
| Data Integrity | 2 weeks | 1 | Low |
| Feature Completeness | 4-6 weeks | 2 | Medium |
| Performance | 3-4 weeks | 1 | Low |
| Production Hardening | 4-6 weeks | 1-2 | Medium |
| Advanced Features | 6-8 weeks | 2-3 | High |
| Multi-Tenant | 6-8 weeks | 2 | High |
| **Total** | **~6-8 months** | **~6 engineers** | |

---

### 14.5 Companion Document

For a per-file bug-level breakdown with specific code locations and fixes, see the companion deep-dive audit at the same location (previous version). This audit focuses on the strategic/architectural view.
