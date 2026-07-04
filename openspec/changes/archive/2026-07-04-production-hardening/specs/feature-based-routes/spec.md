## ADDED Requirements

### Requirement: Routes grouped into 7 domain modules
Route files SHALL be organized into domain modules under `routes/`: `auth/`, `school/`, `finance/`, `academics/`, `hr/`, `content/`, `infrastructure/`. Each module SHALL have an `index.ts` that exports its router. The main `routes/index.ts` SHALL mount only the 7 module routers.

#### Scenario: Routes are grouped by domain
- **WHEN** a developer adds a new attendance endpoint
- **THEN** it goes in `routes/academics/attendance.routes.ts`

Module mapping:
- `auth/`: login, register, logout, refresh, mfa, device-tokens
- `school/`: schools, classes, subjects, enrollments, academic-years, classrooms
- `finance/`: fee, payroll
- `academics/`: attendance, exams, quizzes, assignments, grades, lessons, courses, textbooks, timetable, coding, pre-primary, virtual-labs, concept, question-bank, question-papers, test-*
- `hr/`: staff, leave, transport, inventory, notice, settings
- `content/`: upload, cloudinary, ai, youtube, ocr, teacher-videos, content-publishing
- `infrastructure/`: health, ready, metrics, audit-logs, search, jobs

### Requirement: Auto-discovery via glob pattern
The main router SHALL auto-discover route files using a glob pattern: `routes/*/index.ts`. Adding a new module SHALL require only creating the directory and index.ts file, not editing `routes/index.ts`.

#### Scenario: New module added
- **WHEN** a developer creates `routes/analytics/index.ts` that exports a router
- **THEN** the main router automatically mounts it at `/api/analytics`

### Requirement: Duplicate routes removed
The duplicate `/fee` and `/fees` route registrations SHALL be consolidated to a single `/fee` mount in the finance module.

#### Scenario: Duplicate removed
- **WHEN** routes are reorganized
- **THEN** only `router.use('/fee', feeRoutes)` exists; `/fees` is removed
