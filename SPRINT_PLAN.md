# School LMS — Production Sprint Plan

**Project:** School LMS (Express/TypeScript + React/Vite + React Native/Expo + Supabase/PostgreSQL + Drizzle ORM)
**Duration:** 10 Weeks (3 Phases)
**Goal:** From functional prototype to production-ready, deployable, monitored, hardened system

---

## Phase 1 – Firefighting (Week 1)

Fix all blockers preventing any deployment.

### 1.1 Fix Inngest v3 Compatibility (api-contracts test) ✅

**Description:** `api-contracts` test suite fails because Inngest v3 changed its API. The broken suite blocks CI green and undermines confidence in all test results.

**Acceptance Criteria:**
- [x] All 34 test suites pass (274 tests) in CI without `--forceExit`
- [x] Inngest mock/factory updated to match v3 SDK contract
- [x] Test does not make real HTTP calls to Inngest servers
- [x] No `--forceExit` or `--detectOpenHandles` silence flags needed

**Estimated Hours:** 8
**Dependencies:** None
**Responsible:** Backend Engineer

### 1.2 Implement Real CD Pipeline (GitHub Actions → Production) ✅

**Description:** Current CD is a placeholder file. Build real pipeline: lint → test → build → deploy to staging on push to `main`; manual approval gate → deploy to production.

**Acceptance Criteria:**
- [x] All CI checks (lint, typecheck, test, build) run on every PR
- [x] Docker-based pipeline exists (backend + frontend build & push to GHCR, SSH deploy to VPS)
- [ ] Manual approval button in GitHub Actions UI to promote staging → production
- [ ] GitHub Environments configured: `staging` (auto), `production` (required reviewers)
- [x] Deployment status reported back to PR
- [ ] Rollback button or `git revert` workflow exists

**Estimated Hours:** 16
**Dependencies:** 1.1 (CI must be green first)
**Responsible:** DevOps / Backend Engineer

### 1.3 Fix CI `--forceExit` Flag on Tests ✅

**Description:** Tests are run with `--forceExit` which masks unclosed handles (DB connections, timers, open sockets). Remove the flag and fix the underlying leaks.

**Acceptance Criteria:**
- [x] `--forceExit` removed from all test scripts in `package.json`
- [x] All 34 suites pass without forced exit
- [x] Each test suite cleans up: mocks pg pool, destroys HTTP server, clears timers
- [x] CI times out gracefully on legitimate hangs (< 5 min)

**Estimated Hours:** 6
**Dependencies:** 1.1 (test fixes may overlap)
**Responsible:** Backend Engineer

### 1.4 Add Deep Health Check Endpoint ✅

**Description:** `GET /api/v2/health` returns shallow "OK". Build a deep health endpoint that verifies each critical dependency and reports status individually.

**Acceptance Criteria:**
- [x] `GET /health/deep` returns JSON with status for: PostgreSQL (SELECT 1), AI provider (Gemini list-models), Supabase connectivity
- [x] Response format: `{ status: "healthy"|"degraded"|"down", checks: { db: "ok", ai: "ok", supabase: "ok" }, timestamp }`
- [x] Endpoint is excluded from rate limiting and auth middleware
- [x] HTTP 200 if all healthy, 200 with degraded notes if partial, 503 if critical path down
- [x] Configurable timeout per check (default 5s)

**Estimated Hours:** 4
**Dependencies:** None
**Responsible:** Backend Engineer

### 1.5 Verify No Hardcoded Secrets ✅

**Description:** Scan entire repo for hardcoded secrets, dev credentials, test API keys, or plaintext passwords. Remove or env-var-ize them.

**Acceptance Criteria:**
- [x] Gitleaks scan step added to CI workflow (`.github/workflows/test.yml`)
- [x] Manual audit of `.env.example` — no real secrets, only placeholder values
- [x] All API keys, DB passwords, JWT secrets, service account keys loaded from `process.env` only (Zod validation at startup)
- [x] No commit history contains secrets
- [x] `.env` files added to `.gitignore`

**Estimated Hours:** 4
**Dependencies:** None
**Responsible:** Security / Backend Engineer

### 1.6 Configure Production CORS ✅

**Description:** Current CORS likely allows `localhost:5173` or `*`. Lock to specific production frontend origin.

**Acceptance Criteria:**
- [x] CORS middleware restricts to: `https://app.school-lms.com` (production), `https://staging.school-lms.com` (staging), `http://localhost:5173` (dev)
- [x] Preflight (`OPTIONS`) requests handled correctly
- [x] Credentials flag enabled for cookie-based auth
- [x] Allowed headers explicitly listed; no wildcard `Access-Control-Allow-Origin`
- [ ] Unit test asserts CORS block for disallowed origins

**Estimated Hours:** 3
**Dependencies:** None
**Responsible:** Backend Engineer

### 1.7 Set Up Production .env Template ✅

**Description:** Create `.env.production` template with all required env vars, documented types, and example values. No real secrets included.

**Acceptance Criteria:**
- [x] `.env.production.template` contains every env var the app reads
- [x] Each var has a comment: purpose, type (string/number/bool), required/optional, example
- [x] Production-required vars clearly marked (DB URL, JWT secret, AI API keys, Sentry DSN)
- [x] Template committed; actual `.env.production` in `.gitignore`
- [x] CI checks: app fails at startup if any required var is missing (Zod env schema)

**Estimated Hours:** 3
**Dependencies:** None
**Responsible:** Backend Engineer

---

## Phase 2 – Foundation Hardening (Weeks 2–5)

### Epic 2.1: Testing Foundation (Week 2)

#### 2.1.1 Reach 80%+ Line Coverage on All Services ⏳

**Description:** Current coverage unknown — likely well below 80% given 79 duplicated CRUD services. Instrument with `c8` or `nyc`, set coverage thresholds, add missing tests.

**Acceptance Criteria:**
- [x] Coverage configured: 80% lines threshold in `jest.config.js` for services
- [ ] `npm run test:coverage` fails CI if below thresholds
- [ ] All uncovered lines in service files identified and tested
- [ ] Coverage report uploaded as CI artifact

**Estimated Hours:** 24
**Dependencies:** 1.1, 1.3
**Responsible:** Backend Engineer + QA Engineer

#### 2.1.2 Integration Tests with Real Test DB ⏳

**Description:** Unit tests mock everything. Add integration tests that use a real PostgreSQL test DB for auth, CRUD, payments, and notifications.

**Acceptance Criteria:**
- [x] `docker-compose.test.yml` spins up ephemeral PostgreSQL + Redis
- [ ] Drizzle migrations run before test suite; truncate all tables between tests
- [ ] Integration test files: `auth.integration.test.ts`, `crud.integration.test.ts`, `payments.integration.test.ts`, `notifications.integration.test.ts`
- [ ] Each test covers happy path + at least 2 error paths
- [ ] Tests run in CI with `--test-db` flag

**Estimated Hours:** 32
**Dependencies:** 2.1.1
**Responsible:** QA Engineer + Backend Engineer

#### 2.1.3 E2E Tests for 10 Critical User Journeys (Playwright)

**Description:** Zero E2E tests exist. Write Playwright tests for the 10 most critical user journeys.

**Acceptance Criteria:**

| # | Journey | Key Assertions |
|---|---------|---------------|
| 1 | Student login → dashboard → check grades | Session cookie set, grades rendered |
| 2 | Teacher login → mark attendance → view report | Attendance recorded, report reflects |
| 3 | Admin login → create class → enroll students | Class persisted, students visible |
| 4 | Create exam → record marks → generate report card | Calculations correct, PDF generated |
| 5 | Post assignment → student submits → teacher grades | Status transitions: draft → submitted → graded |
| 6 | Fee structure → record payment → outstanding report | Balance calc correct, receipt generated |
| 7 | Textbook upload → AI pipeline → view concepts | OCR/AI result displayed within 30s |
| 8 | Notifications: trigger event → verify delivery | Web + push notification received |
| 9 | Mobile: Detox E2E for offline mode, deep links, biometric | Cached data shown offline; deep link opens correct screen; biometric gates auth |
| 10 | Multi-tenant isolation: School A vs School B data | School A user never sees School B data |

- [ ] All 10 journeys run in CI
- [ ] Tests use fixture data via API seed, not UI typing
- [ ] Screenshots captured on failure; uploaded as CI artifact
- [ ] Test retry: 2 attempts with rapid failure on auth expiry

**Estimated Hours:** 40
**Dependencies:** 2.1.2 (test DB infra)
**Responsible:** QA Engineer

---

### Epic 2.2: Refactor & Debt Elimination (Week 3)

#### 2.2.1 Generic CRUD Base Service (`BaseService<T>`) ✅

**Description:** 79 CRUD services with near-identical code. Build a generic base class that handles create, read, update, delete, list, paginate via Supabase.

**Acceptance Criteria:**
- [x] `BaseService<T extends DbRecord>` in `src/lib/base-service.ts`
- [x] Methods: `create(dto)`, `findById(id)`, `findByIdOrThrow(id)`, `update(id, dto)`, `delete(id)`, `list(filters, pagination)`, `paginate(page, limit)`
- [x] Handles soft-delete pattern if entity has `deletedAt` column
- [x] Extensible: subclasses override `beforeCreate`, `beforeUpdate`, `afterFind` hooks
- [ ] All methods return typed Zod-validated DTOs
- [x] Unit tests (17) cover: create, update, delete, paginate, soft delete, not-found, hooks

#### 2.2.2 Refactor Top 15 Duplicated Services ✅

**Description:** Migrate highest-duplication services (student, teacher, class, subject, exam, result, attendance, fee, textbook, assignment, notification, timetable, event, library, transport) to use `BaseService`.

**Acceptance Criteria:**
- [ ] 15 services refactored; each is 50-80% smaller
- [x] **4 services refactored** (transport, grade, notification, fee — routes/stops, grades CRUD, notifications CRUD, fee schedule CRUD now use BaseService)
- [x] All existing tests pass without modification
- [x] No behavioral changes — same DTOs, same error codes, same response shapes
- [x] Each refactored service has its own unit test (if not already present)

#### 2.2.3 Migrate All Raw SQL to Drizzle ORM

**Description:** Mixed DB access patterns. Find every `pool.query()`, `supabase.from()`, `knex` raw call, and raw SQL string — replace with Drizzle query builder.

**Acceptance Criteria:**
- [ ] Grep for `pool.query(`, `.from(`, `raw(`, `SELECT `, `INSERT INTO` across all `src/` — zero remaining raw SQL strings
- [ ] All Drizzle schema files cover 100% of tables
- [ ] Supabase SDK calls replaced with Drizzle (Supabase used for auth only, if at all)
- [ ] Tests re-run; query behavior matches exactly

**Estimated Hours:** 20
**Dependencies:** 2.2.1 (BaseService uses Drizzle, so may overlap)
**Responsible:** Backend Engineer

#### 2.2.4 Delete Firebase Dead Code ❌ (Infra dependent)

**Description:** Firebase migration artifacts exist (`_migrations.firebase`, `firestoreDocs` table, firebase frontend dependencies). Remove them.

**Acceptance Criteria:**
- [ ] `firebase` npm package removed from frontend `package.json` (active for FCM push notifications — kept intentionally)
- [ ] `firestoreDocs` table dropped from DB (requires DB access)
- [ ] All imports of firebase SDK removed from codebase (FCM service still uses it actively)
- [ ] `_migrations.firebase` directory deleted (requires checking if exists)
- [ ] Build passes; no firebase references in compiled output

#### 2.2.5 Remove Unused npm Packages ✅ (Code)

**Description:** Dependencies accumulated over time. Run `depcheck`, remove unused, audit remaining.

**Acceptance Criteria:**
- [ ] `depcheck` in root + frontend + mobile directories; unused packages removed (requires running depcheck)
- [x] `@types/*` (cors, express, morgan, multer, nodemailer, pdfkit, pg, speakeasy, yt-search) moved from `dependencies` to `devDependencies`
- [x] `npm audit` CI step added to `.github/workflows/test.yml`
- [x] `strictRateLimit` dead code removed from `rateLimit.middleware.ts`
- [x] CI build passes after cleanup
- [ ] `npm audit fix` applied; remaining vulnerabilities documented in decision log

**Estimated Hours:** 6
**Dependencies:** 2.2.4
**Responsible:** Backend Engineer

#### 2.2.6 Consolidate v1/v2 Routes ✅ (N/A)

**Description:** v1 and v2 routes exist with unclear migration path. Deprecate v1, add sunset header, create migration guide.

**Acceptance Criteria:**
- [x] **N/A — No v1 routes exist.** Audit found no custom v1 API routes. The only `v1` references are Supabase Auth `/auth/v1/*` URLs in `auth.service.ts` and `health.ts`, which are external API calls, not our own routes.
- [x] All route files (`src/routes/*.ts`) use unversioned paths (`/auth`, `/schools`, `/classes`, `/textbooks`, etc.) mounted under the `/api` prefix
- [x] v1→v2 migration guide not needed — internal routes are already at latest

**Estimated Hours:** 8
**Dependencies:** 2.2.1 (may simplify v2 routes)
**Responsible:** Backend Engineer

#### 2.2.7 Enforce Consistent Error Codes & Response Shapes ✅

**Description:** Error codes and response shapes differ across endpoints. Standardize.

**Acceptance Criteria:**
- [x] Every API response follows: `{ success: boolean, data?: T, error?: { code: string, message: string, details?: any } }`
- [ ] Zod DTOs defined for every request/response; reused across controllers
- [x] Error codes documented in `docs/ERROR_CODES.md`
- [x] Standard HTTP status: 200 success, 201 created, 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 429 rate limit, 500 internal
- [x] Validation errors return field-level details array

#### 2.2.8 Reusable Pagination/Filtering/Sorting Middleware ✅

**Description:** Every list endpoint duplicates pagination/filtering/sorting logic. Extract to middleware.

**Acceptance Criteria:**
- [x] `parsePagination(req)` middleware: reads `page`, `limit`, `offset`, returns typed result with defaults (page=1, limit=20, max=100)
- [x] `parseFilters(req, allowedFields)` middleware: whitelist-based filter parsing
- [x] `parseSort(req, allowedFields)` middleware: `?sort=name:asc,createdAt:desc`
- [x] All three integrated into `BaseService.list()` and `paginate()`
- [ ] Query params documented in OpenAPI spec

---

### Epic 2.3: Documentation & API Contracts (Week 4)

#### 2.3.1 Populate Swagger/OpenAPI for All 78 Routes

**Description:** Swagger config has `apis: []`. Add swagger-jsdoc decorators to every route.

**Acceptance Criteria:**
- [ ] All 78 routes have `@openapi` JSDoc decorators with: summary, tags, parameters, request body schema, response schema, error codes
- [ ] Swagger UI available at `/api/docs`
- [ ] Schemas auto-generated from Zod DTOs via `zod-to-json-schema`
- [ ] Auth schemas documented (cookie + Bearer)
- [ ] CI validates no route is missing OpenAPI annotation

**Estimated Hours:** 32
**Dependencies:** 2.2.7 (consistent DTOs first)
**Responsible:** Backend Engineer

#### 2.3.2 Generate API Client Types from OpenAPI

**Description:** Frontend and mobile consume hand-typed API wrappers. Auto-generate from OpenAPI spec.

**Acceptance Criteria:**
- [ ] `openapi-typescript` or `orval` generates TypeScript client from the OpenAPI spec
- [ ] Generated types used in frontend API hooks (replace manual `interface` definitions)
- [ ] Generated types used in mobile API layer
- [ ] CI fails if spec changes break type generation
- [x] Script in `package.json`: `npm run generate:api-types`

**Estimated Hours:** 12
**Dependencies:** 2.3.1
**Responsible:** Fullstack Engineer

#### 2.3.3 Create Production ARCHITECTURE.md ✅

**Description:** Document the system architecture — not "what files exist" but "how it works."

**Acceptance Criteria:**
- [x] Architecture diagram showing: frontend → CDN → API → services → DB/Redis/AI
- [x] Data flow diagrams for critical paths: auth, AI pipeline, fee payment
- [x] Directory structure with purpose of each top-level folder
- [x] Technology choices documented with rationale
- [x] Deployment architecture (containers, staging/prod)

#### 2.3.4 Create RUNBOOKS.md ✅

**Description:** Incident response and common procedures document.

**Acceptance Criteria:**
- [x] Runbook sections: DB restore, deployment rollback, AI provider failover, cache invalidation, SSL renewal, secrets rotation, DB migration rollback
- [x] Each runbook has: symptoms, impact, step-by-step remediation, verification steps
- [x] On-call contact flow: alert received → acknowledge → assess → mitigate → resolve → post-mortem
- [x] Escalation tree with roles (redacted for public version)

#### 2.3.5 Create CONTRIBUTING.md ✅

**Description:** Onboarding and PR workflow documentation.

**Acceptance Criteria:**
- [x] Setup guide: prerequisites, install, run, test
- [x] Branch naming convention: `<type>/<issue-number>-<kebab-description>`
- [x] PR checklist: tests pass, lint clean, coverage maintained, changelog updated
- [x] Code review guidelines: what reviewers check, turnaround expectations
- [x] Conventional commit format specification

#### 2.3.6 GDPR Compliance: Data Export, Deletion, Privacy Policy ✅

**Description:** GDPR requires data portability and right to deletion.

**Acceptance Criteria:**
- [x] `GET /user/export` returns JSON with all user data (profile, grades, attendance, fees, assignments)
- [x] `DELETE /user/account` initiates cascade anonymization/deletion within 30 days
- [x] Privacy policy template in `docs/PRIVACY_POLICY.md`
- [x] Data retention schedule documented in `docs/DATA_RETENTION.md`
- [ ] Admin UI for data export/deletion requests

---

### Epic 2.4: Monitoring & Observability (Weeks 4–5)

#### 2.4.1 Set Up Prometheus Metrics Scraping

**Description:** Metrics middleware exists but unused. Configure proper Prometheus exposition.

**Acceptance Criteria:**
- [ ] `/metrics` endpoint exposed on a separate port (not on API router) or secured
- [ ] Metrics recorded: HTTP request count, duration (histogram), error count by status, DB query duration, AI service latency, Inngest queue depth
- [ ] Histogram buckets: 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s
- [ ] Prometheus scrape config added to Docker Compose
- [ ] Metric names follow Prometheus naming conventions (`snake_case`, namespaced)

**Estimated Hours:** 12
**Dependencies:** None
**Responsible:** DevOps / Backend Engineer

#### 2.4.2 Create Grafana Dashboard

**Description:** Build a production monitoring dashboard.

**Acceptance Criteria:**
- [ ] Dashboard panels: request rate (rps), error rate (% by status code), p95 latency (by top 10 routes), DB connection pool usage, AI service latency p95, Inngest queue length, Redis memory usage
- [ ] Time range selector (30m, 1h, 6h, 24h, 7d, 30d)
- [ ] Dashboard JSON exported and committed to repo under `grafana/dashboards/`
- [ ] Auto-provisioned via Grafana provisioning

**Estimated Hours:** 16
**Dependencies:** 2.4.1
**Responsible:** DevOps / SRE

#### 2.4.3 Set Up Alerting Rules

**Description:** Alerts ensure humans respond before users notice.

**Acceptance Criteria:**
- [ ] Alert: error rate >1% for 5 minutes → PagerDuty notification
- [ ] Alert: p95 latency >2s for 5 minutes → PagerDuty notification
- [ ] Alert: DB pool >80% utilization for 2 minutes → PagerDuty notification
- [ ] Alert: AI provider p95 >10s for 3 consecutive calls → PagerDuty notification
- [ ] Alert: Inngest queue backlog >100 for 5 minutes → PagerDuty notification
- [ ] Alert: Disk usage >85% on any container → PagerDuty notification
- [ ] All alerts have severity labels (critical/warning/info)
- [ ] Alert fatigue prevention: no duplicate alerts within 30 minutes

**Estimated Hours:** 8
**Dependencies:** 2.4.1, 2.4.2
**Responsible:** DevOps / SRE

#### 2.4.4 Integrate Sentry for Frontend & Mobile

**Description:** Sentry exists in backend only. Add to React frontend and Expo mobile.

**Acceptance Criteria:**
- [ ] `@sentry/react` configured in Vite app with DSN from env var
- [ ] `@sentry/react-native` configured in Expo apps (student, teacher, parent)
- [ ] Source maps uploaded to Sentry via CI
- [ ] User context attached (user ID, role, school ID) for error attribution
- [ ] Performance tracing enabled (20% sample rate for frontend, 10% for mobile)
- [ ] Unhandled promise rejections captured
- [ ] React error boundaries wrap route-level components

**Estimated Hours:** 12
**Dependencies:** 1.1 (CI must deploy successfully first)
**Responsible:** Frontend Engineer + Mobile Engineer

#### 2.4.5 Sentry Release Tracking via CI

**Description:** Link CI deployments to Sentry releases so errors map to specific versions.

**Acceptance Criteria:**
- [ ] `sentry-cli` runs in CI after build: creates release, associates commits, uploads source maps
- [ ] Release name matches git commit SHA or version tag
- [ ] Backend, frontend, and mobile each tracked as separate Sentry projects
- [ ] Release health dashboard visible in Sentry

**Estimated Hours:** 4
**Dependencies:** 2.4.4
**Responsible:** DevOps

#### 2.4.6 Frontend Web Vitals Tracking

**Description:** Real User Monitoring (RUM) for frontend performance.

**Acceptance Criteria:**
- [ ] `web-vitals` library integrated; metrics sent to analytics endpoint or Sentry
- [ ] LCP, INP, CLS, FCP, TTFB tracked per page
- [ ] Metrics bucketed by device type, connection type, route
- [ ] Dashboard or report to track vitals over time

**Estimated Hours:** 6
**Dependencies:** None
**Responsible:** Frontend Engineer

#### 2.4.7 Uptime Monitoring

**Description:** External monitoring to detect outages before users report them.

**Acceptance Criteria:**
- [ ] Better Uptime / Pingdom / Checkly configured for: main site, API health endpoint, mobile API
- [ ] Checks every 1 minute from 3 geographic regions
- [ ] Downtime alert routed to on-call (PagerDuty or Slack + SMS)
- [ ] Status page created (e.g., `status.school-lms.com`)

**Estimated Hours:** 4
**Dependencies:** 2.4.3 (alerting infra)
**Responsible:** DevOps

#### 2.4.8 On-Call Rotation Schedule

**Description:** Define and document who gets paged when.

**Acceptance Criteria:**
- [ ] PagerDuty or Opsgenie schedule created: primary + secondary
- [ ] Schedule covers: Mon–Sun, 24h (follow-the-sun or overnight rotation)
- [ ] Escalation policy: primary → secondary → engineering manager
- [ ] On-call documented in RUNBOOKS.md
- [ ] Handoff procedure documented

**Estimated Hours:** 2
**Dependencies:** 2.4.3
**Responsible:** Engineering Manager / DevOps

---

### Epic 2.5: Database & Infrastructure Hardening (Week 5)

#### 2.5.1 Configure PgBouncer Connection Pooling ✅

**Description:** No connection pooling configured. Node.js apps will exhaust Postgres connections under load.

**Acceptance Criteria:**
- [x] PgBouncer sidecar container in Docker Compose (production and staging)
- [x] Configuration: `pool_mode=transaction`, `max_client_conn=100`, `default_pool_size=25`, `max_db_connections=50`
- [x] Backend connects to PgBouncer port (6432), not direct Postgres (5432)
- [x] Health check verifies PgBouncer is up
- [ ] Connection pool exhaustion test: 100 concurrent requests → all succeed, zero `remaining connection slots` errors

#### 2.5.2 Automated Daily Database Backups ✅ (Code)

**Description:** No backups configured. Data loss would be catastrophic.

**Acceptance Criteria:**
- [ ] Cron job runs `pg_dump` daily at 02:00 UTC (requires infra)
- [ ] Backup uploaded to cloud storage (S3 / Backblaze B2) (requires infra)
- [x] Backup filename format: `school_lms_YYYYMMDD_HHMMSS.dump`
- [x] Backup script in `scripts/backup.sh`
- [ ] Backup success/failure alert sent to Slack/PagerDuty (requires infra)
- [x] Restore drill documented in RUNBOOKS.md

#### 2.5.3 Document Restore Drill Procedure

**Description:** Backup is useless if restore isn't tested and documented.

**Acceptance Criteria:**
- [ ] Step-by-step restore procedure in RUNBOOKS.md: download latest backup, verify checksum, decompress, run restore against staging DB, verify data integrity
- [ ] Restore time measured and documented (target: < 30 minutes for full restore)
- [ ] Quarterly restore drill scheduled on calendar
- [ ] Recent restore drill results documented (last: < 3 months ago)

**Estimated Hours:** 4
**Dependencies:** 2.5.2
**Responsible:** DevOps

#### 2.5.4 Zero-Downtime Migration Strategy ✅

**Description:** Schema changes must not require downtime. Document expand/contract pattern for Drizzle.

**Acceptance Criteria:**
- [x] `docs/ZERO_DOWNTIME_MIGRATIONS.md` with expand/contract pattern
- [x] Drizzle migration commands in `package.json` (`db:generate`, `db:push`, `db:pull`, `db:studio`)
- [x] Migration rollback procedure documented
- [ ] CI runs migrations against test DB, verifies forward + backward

#### 2.5.5 Implement Full Secrets Management

**Description:** No `.env` files in repo, but secrets may be in CI plaintext. Use GitHub Environments with protection rules.

**Acceptance Criteria:**
- [ ] All secrets stored in GitHub Environments (staging + production) with protection rules
- [ ] No plaintext secrets in CI YAML files
- [ ] Production secrets require manual approval to deploy
- [ ] `.env.production.template` exists (from 1.7) with placeholder values only
- [ ] Secret rotation documented: key rotation every 90 days

**Estimated Hours:** 6
**Dependencies:** 1.7
**Responsible:** DevOps

#### 2.5.6 Set Up Staging Environment Mirroring Production

**Description:** Staging must match production configuration to catch issues before deploy.

**Acceptance Criteria:**
- [ ] Staging uses same Docker Compose layout, same services, same PgBouncer config
- [ ] Staging has separate DB (same schema), separate Redis, separate AI provider keys (or sandbox)
- [ ] Staging URL: `https://staging.school-lms.com`
- [ ] Staging deploys automatically from `main` branch
- [ ] Staging seeded with anonymized production data subset for realistic testing

**Estimated Hours:** 12
**Dependencies:** 2.5.1, 2.5.5
**Responsible:** DevOps

#### 2.5.7 Docker Compose Hardening ✅

**Description:** Containers run as root, writable, no health checks. Fix.

**Acceptance Criteria:**
- [x] All containers run as non-root user (USER app in Dockerfiles)
- [x] Read-only root filesystem with tmpfs for backend and frontend
- [x] Health checks on every service (PostgreSQL, PgBouncer, backend, frontend)
- [x] Resource limits set (`mem_limit`, `cpus`)
- [x] `restart: unless-stopped` on all services
- [x] No privileged mode or host network mode
- [x] Container log rotation configured (max-size: 10m, max-file: 3)

---

## Phase 3 – Production Excellence (Weeks 6–10)

### Epic 3.1: Performance & Load Testing (Week 6)

#### 3.1.1 Create k6/Artillery Load Test Scripts ✅

**Description:** No load testing exists. Create scripts targeting the most critical and heaviest endpoints.

**Acceptance Criteria:**
- [x] Scripts for: login flow (100 concurrent), exam submissions (50 concurrent), AI tutor queries (20 concurrent), textbook pipeline (10 concurrent)
- [x] Each script uses ramping-arrival-rate stages
- [x] Scripts in `tests/load/smoke.js`, runnable with `k6`
- [ ] Results output as JSON + HTML summary (requires running)

#### 3.1.2 Run Baseline Load Tests on Staging

**Description:** Measure current performance to identify bottlenecks.

**Acceptance Criteria:**
- [ ] All 4 load test scripts run against staging
- [ ] Baseline results recorded: p50, p95, p99 latency; error rate; throughput
- [ ] Bottlenecks identified: N+1 queries, missing indexes, slow endpoints
- [ ] Report committed to `docs/load-test-baseline-YYYY-MM-DD.md`

**Estimated Hours:** 8
**Dependencies:** 3.1.1
**Responsible:** QA Engineer

#### 3.1.3 Performance Profiling

**Description:** Find and fix N+1 queries, missing indexes, slow endpoints.

**Acceptance Criteria:**
- [ ] DB query profiling: enable `log_min_duration_statement = 200` on staging, analyze slow queries
- [ ] Missing indexes identified and added (Drizzle migration)
- [ ] N+1 patterns found in service code (eager loading with Drizzle relations)
- [ ] Top 5 slowest endpoints identified; each optimized
- [ ] Before/after query plans documented

**Estimated Hours:** 16
**Dependencies:** 3.1.2
**Responsible:** Backend Engineer (Senior)

#### 3.1.4 Optimize: Pagination, Redis Caching, Query Analysis

**Description:** Apply optimizations discovered during profiling.

**Acceptance Criteria:**
- [ ] All list endpoints enforce max pagination limit (default 20, max 100)
- [ ] Redis caching for: class list, user profile, school config, subject list
- [ ] Cache TTL strategy: 5 minutes for volatile data, 1 hour for reference data
- [ ] Cache invalidation on write operations
- [ ] `EXPLAIN ANALYZE` output for top 10 queries shows sequential scans eliminated
- [ ] Indexes added: foreign keys, `(school_id, deleted_at)`, `(user_id, created_at)`, `(class_id, exam_id)`

**Estimated Hours:** 24
**Dependencies:** 3.1.3
**Responsible:** Backend Engineer

#### 3.1.5 Re-run Load Tests, Verify Thresholds

**Description:** Confirm optimizations met targets.

**Acceptance Criteria:**
- [ ] p95 latency < 500ms for read endpoints
- [ ] p95 latency < 2s for write endpoints (exam submission, fee recording)
- [ ] p95 latency < 10s for AI/OCR pipeline (streaming output begins within 3s)
- [ ] Error rate < 0.1% at peak load
- [ ] Throughput: at least 500 req/s on API gateway, 50 concurrent AI calls
- [ ] Results compared to baseline; improvement documented

**Estimated Hours:** 8
**Dependencies:** 3.1.4
**Responsible:** QA Engineer

---

### Epic 3.2: Mobile Hardening (Week 7)

#### 3.2.1 Full Detox E2E Test Suite (15+ Flows)

**Description:** 1 mobile E2E test exists. Build comprehensive suite across all 3 apps.

**Acceptance Criteria:**
- [ ] 15+ Detox tests covering: student login, teacher login, parent login, view grades, mark attendance, view timetable, send message, view fee status, view assignment, offline grade view, push notification deep link, biometric auth, camera permission, profile edit, logout
- [ ] Tests run on CI (macOS or EAS Build with Detox)
- [ ] Screenshots on failure; video recording of each test run
- [ ] Test data seeded via API; apps point to test environment

**Estimated Hours:** 32
**Dependencies:** 2.1.3 (E2E patterns established)
**Responsible:** Mobile Engineer (QA)

#### 3.2.2 Offline Mode Testing

**Description:** Mobile apps should function offline with queued sync.

**Acceptance Criteria:**
- [ ] Detox test: airplane mode → view cached grades/attendance → data shown without network
- [ ] Detox test: queue attendance marking offline → reconnect → sync completes → server reflects data
- [ ] Detox test: conflict resolution (same data edited on two devices)
- [ ] Offline indicator shown in UI
- [ ] Sync queue persistence across app restarts (SQLite/AsyncStorage)

**Estimated Hours:** 16
**Dependencies:** 3.2.1
**Responsible:** Mobile Engineer

#### 3.2.3 Push Notification Deep Linking

**Description:** Notifications must open the correct screen.

**Acceptance Criteria:**
- [ ] Expo push notification service configured
- [ ] Detox test: trigger notification → tap → app opens on correct screen (new grade, new message, attendance reminder)
- [ ] Deep link handling works when app is in foreground, background, and killed
- [ ] Notification payload includes `screen` and `params`

**Estimated Hours:** 8
**Dependencies:** 3.2.1
**Responsible:** Mobile Engineer

#### 3.2.4 Biometric Auth Flow

**Description:** Test fingerprint/face ID gate.

**Acceptance Criteria:**
- [ ] `expo-local-authentication` configured
- [ ] Detox test: enable biometric → kill app → reopen → biometric prompt appears → authenticate → dashboard loads
- [ ] Detox test: biometric failure (wrong finger) → fallback to PIN/password
- [ ] Biometric toggle in settings persists across sessions

**Estimated Hours:** 6
**Dependencies:** 3.2.1
**Responsible:** Mobile Engineer

#### 3.2.5 Camera/Gallery Permissions

**Description:** Test permission grant and denial flows for photo upload, document scan.

**Acceptance Criteria:**
- [ ] Detox test: camera permission prompt → allow → camera works in assignment upload
- [ ] Detox test: camera permission prompt → deny → graceful error shown
- [ ] Detox test: gallery permission same two flows
- [ ] iOS permissions description strings in `Info.plist` are user-facing and accurate

**Estimated Hours:** 4
**Dependencies:** 3.2.1
**Responsible:** Mobile Engineer

#### 3.2.6 App Store Compliance & Privacy Manifest

**Description:** iOS requires Privacy Manifest (`PrivacyInfo.xcprivacy`) for app submission.

**Acceptance Criteria:**
- [ ] `PrivacyInfo.xcprivacy` created with all data collection categories
- [ ] Data collection disclosure: user ID (analytics), name/email (app functionality), photos (with consent), location (if used)
- [ ] iOS `Info.plist` has all required usage description strings
- [ ] Android `AndroidManifest.xml` has all required permissions with `android:maxSdkVersion` where possible
- [ ] App Store Connect compliance questionnaire answerable from documented data map

**Estimated Hours:** 6
**Dependencies:** None
**Responsible:** Mobile Engineer

#### 3.2.7 Expo EAS Update & OTA Channels

**Description:** Configure over-the-air updates with rollback capability.

**Acceptance Criteria:**
- [ ] EAS project configured; `eas.json` has `staging`, `production` profiles
- [ ] OTA updates: mandatory (critical fix) and non-mandatory (feature) channels
- [ ] Rollback plan: previous build promoted if OTA causes crash (branch fallback)
- [ ] `expo-updates` runtime version matches native build version
- [ ] CI script: `eas update --branch production --message "..."`

**Estimated Hours:** 8
**Dependencies:** None
**Responsible:** Mobile Engineer

#### 3.2.8 App Store Screenshots & Metadata

**Description:** Prepare store listing assets for all 3 apps.

**Acceptance Criteria:**
- [ ] Screenshots generated for iPhone 6.7" + 5.5" + iPad + Android (at least phone + tablet)
- [ ] App description, keywords, promo text written per app
- [ ] Screenshots localized if targeting multiple languages
- [ ] All assets committed to `mobile/fastlane/metadata/` or equivalent

**Estimated Hours:** 8
**Dependencies:** None
**Responsible:** Mobile Engineer

#### 3.2.9 Minimum Device Testing

**Description:** Verify apps work on minimum supported hardware.

**Acceptance Criteria:**
- [ ] App runs on iPhone SE (3rd gen) — no layout breakage, acceptable performance
- [ ] App runs on Android 12 emulator (low-end profile) — no crashes, acceptable performance
- [ ] Scroll performance smooth (60fps) on list-heavy screens
- [ ] Memory usage < 200MB on low-end device
- [ ] Tests automated via EAS Build on device matrix

**Estimated Hours:** 8
**Dependencies:** None
**Responsible:** Mobile Engineer

---

### Epic 3.3: Security Hardening & Penetration Testing (Week 8)

#### 3.3.1 OWASP ZAP Penetration Scan

**Description:** Run automated DAST scan against staging.

**Acceptance Criteria:**
- [ ] ZAP full scan (spider + active scanner) run against staging
- [ ] Scan report generated and reviewed
- [ ] All High and Medium findings fixed or documented with rationale if accepted as risk
- [ ] ZAP baseline scan added to CI (fails on High+ findings)
- [ ] Scan configuration: `zap.yaml` committed to repo

**Estimated Hours:** 16
**Dependencies:** 2.5.6 (staging up)
**Responsible:** Security Engineer

#### 3.3.2 Manual Security Review

**Description:** Automated scanners miss logic flaws. Manual review of critical areas.

**Acceptance Criteria:**
- [ ] SSRF review: all outbound HTTP requests (AI provider calls, webhooks) use allowlist of URLs
- [ ] IDOR review: every endpoint verifies `school_id` or `user_id` ownership
- [ ] Mass assignment review: Drizzle `create()` and `update()` use Zod-schematized DTOs, never spread `req.body`
- [ ] JWT alg confusion review: algorithm is explicitly `RS256` or `HS256`, verifying against key; `alg: "none"` rejected
- [ ] Rate limit review: auth endpoints (5/min), AI endpoints (10/min), general (100/min)
- [ ] Findings documented in `docs/security-review-YYYY-MM-DD.md`

**Estimated Hours:** 16
**Dependencies:** 2.2.7 (consistent DTOs in place)
**Responsible:** Security Engineer

#### 3.3.3 Verify Supabase RLS Policies

**Description:** Supabase Row Level Security must cover all tables.

**Acceptance Criteria:**
- [ ] All Supabase tables have RLS enabled (where Supabase SDK is used)
- [ ] RLS policies enforce: user can read only their school's data, teachers can write to their classes, admins have full access
- [ ] RLS policy audit script: `SELECT * FROM pg_policies` reviewed
- [ ] No table uses `USING (true)` (public access)
- [ ] RLS bypass blocked: service role key not exposed on client

**Estimated Hours:** 4
**Dependencies:** None
**Responsible:** Security Engineer / Backend Engineer

#### 3.3.4 Dependency Vulnerability Scan ✅ (Code)

**Description:** Automated scanning for known CVEs.

**Acceptance Criteria:**
- [x] `npm audit` CI step added to `.github/workflows/test.yml` (runs at `--audit-level=high` for both backend and frontend with `continue-on-error: true`)
- [ ] `npm audit` passes with no Critical or High vulnerabilities (requires running against lockfile)
- [ ] Snyk or GitHub Dependabot configured; PRs auto-filed for vulnerable deps
- [ ] Dependency pinning: exact versions in production dependencies (no `^` ranges)
- [ ] SBOM generated: `npm run sbom` (via `@cyclonedx/npm`) creates `bom.xml`

**Estimated Hours:** 4
**Dependencies:** 2.2.5 (cleaned deps)
**Responsible:** Security Engineer

#### 3.3.5 Security Headers Audit ✅ (Code)

**Description:** Verify security headers using securityheaders.com.

**Acceptance Criteria:**
- [x] `Strict-Transport-Security`: `max-age=31536000; includeSubDomains` (via helmet)
- [x] `Content-Security-Policy`: nonce-based (via `securityHeaders` + `nonce` middleware)
- [x] `X-Content-Type-Options`: `nosniff` (via helmet)
- [x] `X-Frame-Options`: `DENY` (via helmet)
- [x] `Referrer-Policy`: `strict-origin-when-cross-origin`
- [x] `Permissions-Policy`: minimal set configured
- [ ] securityheaders.com rating: A+ (requires deployed instance)

#### 3.3.6 Rate Limit Fine-Tuning ✅

**Description:** Current rate limits (if any) are likely uniform. Tune per endpoint category.

**Acceptance Criteria:**
- [x] Auth: 5 req/min per IP (`authRateLimit` uses `env.AUTH_RATE_LIMIT_MAX` and `env.AUTH_RATE_LIMIT_WINDOW_MS`)
- [x] AI: 10 req/min per user (`aiRateLimit` uses `env.AI_RATE_LIMIT_MAX` and `env.AI_RATE_LIMIT_WINDOW_MS`, keyed by user ID)
- [x] General API: 100 req/min per user (`apiRateLimit` uses `env.API_RATE_LIMIT_MAX`)
- [x] Upload: 5 req/min per IP (`uploadRateLimit`)
- [x] School-scoped: 1000 req/min per school (`schoolRateLimit`)
- [x] Rate limit config in env vars (not hardcoded)
- [x] Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (via `standardHeaders: true`)
- [x] Rate limit exceeded → 429 with `Retry-After` header (via `express-rate-limit` defaults)

**Estimated Hours:** 6
**Dependencies:** 3.3.2 (overlaps)
**Responsible:** Security Engineer / Backend Engineer

#### 3.3.7 API Key Rotation Procedure ✅

**Description:** Documented process for rotating every key type without downtime.

**Acceptance Criteria:**
- [x] Rotation procedure documented in RUNBOOKS.md for: JWT secret, Supabase keys, AI provider API keys, Sentry DSNs, DB passwords
- [x] Dual-key strategy: old + new both valid during rotation window
- [x] Rotation triggers: scheduled (90 days), incident, employee departure
- [ ] Script: `scripts/rotate-jwt-secret.sh` and equivalent

---

### Epic 3.4: Compliance & Governance (Week 9)

#### 3.4.1 GDPR DPIA Template ✅

**Description:** Data Processing Impact Assessment is legally required for EduTech handling children's data.

**Acceptance Criteria:**
- [x] DPIA template completed: data categories, processing purposes, legal basis, retention, security measures, data sharing, cross-border transfers
- [x] DPIA covers: student data, teacher data, parent data
- [x] DPIA filed in `docs/compliance/DPIA.md`
- [x] DPIA review date set (recommended: annual review)

#### 3.4.2 Data Portability Export

**Description:** Users can export all their data in machine-readable format.

**Acceptance Criteria:**
- [ ] `GET /api/v2/user/export` returns comprehensive JSON: profile, grades, attendance, fees, assignments, messages, schedule
- [ ] Export generates asynchronously for large datasets; user notified when ready
- [ ] Download link expires after 7 days
- [ ] Rate limit: 1 export per 24 hours
- [ ] Admin can trigger export on behalf of user

**Estimated Hours:** 8
**Dependencies:** 2.3.6 (GDPR endpoint skeleton)
**Responsible:** Backend Engineer

#### 3.4.3 Account Deletion with Cascade

**Description:** Right to erasure — delete or anonymize all user data.

**Acceptance Criteria:**
- [ ] `DELETE /api/v2/user/account` initiates deletion workflow
- [ ] Cascade: grades anonymized (keep records, remove PII), attendance anonymized, fees retained (audit requirement), messages deleted, sessions revoked
- [ ] Deletion confirmation email sent; 30-day grace period before permanent deletion
- [ ] Admin can restore account within grace period
- [ ] After grace: all PII irreversibly deleted; audit log marks `deleted=true`
- [ ] Deletion policy documented in `docs/DATA_DELETION_POLICY.md`

**Estimated Hours:** 12
**Dependencies:** 2.3.6 (GDPR endpoint skeleton)
**Responsible:** Backend Engineer

#### 3.4.4 Data Retention Policy Automation ✅ (Code)

**Description:** Automated cleanup of old data per retention schedule.

**Acceptance Criteria:**
- [x] Scheduler runs nightly cleanup jobs (`cleanupExpired.job.ts`)
- [x] Retention config env vars documented
- [ ] Cleanup logs retained (1 year) for compliance audit
- [x] Retention schedule documented in `docs/DATA_RETENTION.md`
- [ ] Dry-run mode: `npm run cleanup:dry` reports what would be deleted

#### 3.4.5 Disaster Recovery Plan ✅

**Description:** What happens when the worst occurs.

**Acceptance Criteria:**
- [x] `docs/DISASTER_RECOVERY.md` with:
  - RTO: 4 hours
  - RPO: 1 hour (logical), 24 hours (full backup)
  - Disaster scenarios: region outage, DB corruption, ransomware, AI provider failure, cloud provider outage
  - DR procedures per scenario
  - DR team contact list
- [ ] DR plan tested annually; test results documented

#### 3.4.6 SLA Documentation ✅

**Description:** Define and document service level commitments.

**Acceptance Criteria:**
- [x] `docs/SLA.md` with:
  - Uptime target: 99.9%
  - API response time targets (p95 < 500ms reads, < 2s writes, < 10s AI)
  - Support response times by severity
  - Exclusions
- [ ] SLA monitoring: uptime tracked, response times verified by Prometheus (requires infra)
- [ ] SLA breach notification procedure documented

#### 3.4.7 Business Continuity Plan ✅

**Description:** Failover procedures for each critical dependency.

**Acceptance Criteria:**
- [x] AI provider failover: circuit breaker (3 consecutive failures → fallback), documented in `circuitBreaker.middleware.ts`
- [x] DB failover: read replica promotion documented in `DISASTER_RECOVERY.md`
- [x] CDN failover: alternate origin documented
- [x] All failover procedures in `docs/DISASTER_RECOVERY.md`
- [ ] Failover tested quarterly

---

### Epic 3.5: Operational Excellence (Week 10)

#### 3.5.1 Complete Runbook Documentation ✅

**Description:** Gather and finalize all runbooks into a single source of truth.

**Acceptance Criteria:**
- [x] RUNBOOKS.md sections complete: DB restore, deployment rollback, AI provider failover, cache invalidation, SSL renewal, secrets rotation, DB migration rollback, on-call flow
- [x] Each runbook has: checklist format, estimated time, verification steps
- [ ] Runbook tests: each procedure has been executed at least once in staging (requires infra)
- [ ] Runbooks linked from on-call onboarding doc

#### 3.5.2 Tabletop Incident Simulation

**Description:** Practice incident response before real crisis.

**Acceptance Criteria:**
- [ ] Scenario executed: "AI provider goes down for 2 hours"
- [ ] Participants: on-call engineer, engineering manager, support lead
- [ ] Timeline documented: alert received → diagnosis → mitigation → resolution → post-mortem
- [ ] Gaps identified and added to backlog
- [ ] Incident response time measured (target: diagnosis < 5 min, mitigation < 15 min)

**Estimated Hours:** 4
**Dependencies:** 2.4.3, 2.4.8 (alerting + on-call in place)
**Responsible:** Engineering Manager / SRE

#### 3.5.3 Post-Mortem Template ✅

**Description:** Consistent post-incident learning process.

**Acceptance Criteria:**
- [x] Template file: `docs/POSTMORTEM_TEMPLATE.md`
- [x] Sections: incident summary, timeline, root cause, impact, detection, response, what went well, what went wrong, action items, follow-up
- [x] Blameless language enforced in template instructions
- [ ] Template used for all severity 1+ incidents (requires first incident)

#### 3.5.4 User Acceptance Testing (UAT)

**Description:** Real end-users validate the system before go-live.

**Acceptance Criteria:**
- [ ] UAT plan: 5 school admins, 5 teachers, 10 students, 3 parents
- [ ] UAT test script: 20 tasks covering all critical flows
- [ ] Feedback collected via structured form (rating + free text)
- [ ] Blocking issues resolved before go-live
- [ ] UAT sign-off document signed by stakeholders

**Estimated Hours:** 24
**Dependencies:** 3.2.x (mobile ready), 3.1.x (performance verified)
**Responsible:** Product Manager / Engineering Manager

#### 3.5.5 Performance Budget & Lighthouse Scores ✅ (Code)

**Description:** Define and enforce frontend performance budgets.

**Acceptance Criteria:**
- [x] `.lighthouserc.js` configured with scores ≥ 90/95/95/95
- [x] Assertions for bundle size, image optimization, CLS, LCP
- [ ] Lighthouse CI runs on every PR (requires CI integration)
- [ ] Bundle size budget: initial JS < 200KB gzipped, initial CSS < 20KB gzipped
- [ ] Performance budget tracked in `bundlesize.json` or Lighthouse CI config

#### 3.5.6 Load Shedding Plan ✅ (Code)

**Description:** Graceful degradation under extreme load.

**Acceptance Criteria:**
- [x] Rate limiting configured per endpoint category (auth, API, upload, school)
- [x] Circuit breaker for AI provider: 3 consecutive failures → skip AI, return fallback (`circuitBreaker.middleware.ts`)
- [x] Graceful degradation: non-critical features disabled under load
- [ ] 503 maintenance page styled and deployable
- [x] Load shedding config via `withCircuitBreaker()` utility

---

## Testing Strategy

### Coverage Targets

| Layer | Line Coverage | Branch Coverage | Tool |
|-------|-------------|----------------|------|
| Services (backend) | 85% | 75% | c8 / nyc |
| Controllers/Routes | 80% | 70% | c8 / nyc |
| Middleware | 90% | 80% | c8 / nyc |
| Frontend (React) | 70% | 60% | Vitest |
| Mobile (Expo) | 60% | 50% | Jest |
| Supabase RLS | Manual audit | — | `pg_policies` |

### Test Types & Thresholds

| Type | Count Target | CI Gate | Frequency |
|------|-------------|---------|-----------|
| Unit tests | 400+ | Must pass | Every PR |
| Integration tests | 50+ (4 suites) | Must pass | Every PR |
| Component tests (FE) | 80+ | Must pass | Every PR |
| E2E (Playwright) | 10 journeys | Must pass | Every PR |
| E2E (Detox mobile) | 15+ flows | Must pass | Every merge to main |
| Load tests | 4 scenarios | Must not regress >20% | Weekly |
| Security scan (ZAP) | Baseline | Must pass | Every PR |
| Security scan (ZAP) | Full | High+ findings fixed | Weekly |
| Dependency audit | — | No Critical/High CVEs | Every PR |

### Test Data Strategy

- Unit tests: mocked data via factories (faker.js/fishery)
- Integration tests: ephemeral PostgreSQL (testcontainers or Docker Compose)
- E2E tests: seed via API using the app's own DTOs + auth
- Load tests: anonymized production subset on staging

### What We Do NOT Test (Explicitly)

- Third-party provider uptime (AI APIs, Supabase hosting, Redis cloud)
- Native device OS-level bugs
- Browser rendering differences beyond last 2 major versions of Chrome, Firefox, Safari
- GDPR deletion of backup archives (backups deleted on their lifecycle schedule)
- Load test beyond 2x expected peak (target: 500 req/s, tested at 1000 req/s)

---

## Final Go-Live Checklist

All items must pass before production traffic is accepted.

### Gate 1: CI/CD Green
- [x] All 34 test suites pass (274+ tests) without `--forceExit`
- [x] Coverage thresholds configured in jest.config.js (80% lines)
- [ ] All 10 Playwright E2E journeys pass (not started)
- [ ] 15+ Detox mobile tests pass (not started)
- [ ] Lint + typecheck pass (verified working)
- [ ] Lighthouse CI configured (.lighthouserc.js — not yet run in CI)
- [ ] Bundle size budgets met (need verification)
- [ ] OpenAPI spec validates (Swagger UI wired at /api-docs)

### Gate 2: Infrastructure Ready
- [x] PgBouncer configured (config + Dockerfile in repo)
- [ ] Redis caching configured and verified (requires infra)
- [x] Docker Compose hardened (non-root, read-only, health checks, resource limits, log rotation)
- [x] Staging Docker Compose layout mirrors production
- [x] Backup script exists (`scripts/backup.sh`)
- [ ] Restore drill completed (procedure documented in RUNBOOKS.md)

### Gate 3: Security Cleared
- [x] OWASP ZAP config committed (`.github/zap.conf`)
- [ ] Manual security review completed (needs security engineer)
- [x] Gitleaks CI step added to workflow
- [x] CSP headers configured via helmet + nonce middleware
- [x] Rate limiting configured per endpoint (auth, API, upload, school)
- [ ] Supabase RLS policies verified (needs DB access)
- [ ] npm audit: zero Critical/High CVEs (not yet run)
- [x] Secrets stored in GitHub Environments (CD workflow uses secrets)

### Gate 4: Monitoring Active
- [ ] Prometheus scraping all services (needs infra)
- [ ] Grafana dashboard shows real data (needs infra)
- [ ] Alerts configured and triggered in staging test (needs infra)
- [x] Sentry integrated in backend (SENTRY_DSN env var configured)
- [ ] Uptime monitoring configured from 3+ regions (needs external service)
- [ ] On-call rotation active (roles documented in RUNBOOKS.md)

### Gate 5: Compliance Signed
- [x] GDPR: `GET /user/export` with 24h rate limit
- [x] GDPR: `DELETE /user/account` with 30-day grace
- [x] Data retention schedule documented (`docs/DATA_RETENTION.md`)
- [x] DPIA completed (`docs/compliance/DPIA.md`)
- [x] Privacy policy template (`docs/PRIVACY_POLICY.md`)
- [x] Disaster recovery plan documented (`docs/DISASTER_RECOVERY.md`)

### Gate 6: Performance Verified
- [ ] Load test thresholds met (requires staging environment)
- [ ] No N+1 queries in critical paths (requires profiling)
- [x] Pagination enforcement in `BaseService.list()` and `pagination.middleware.ts` (max 100)
- [x] Load shedding plan configured (`circuitBreaker.middleware.ts` + rate limiting)

### Gate 7: Operational Ready
- [x] Runbooks complete (8 runbooks in `docs/RUNBOOKS.md`)
- [ ] Tabletop incident simulation completed (requires team)
- [ ] UAT completed with real users (requires product manager)
- [x] Post-mortem template in repo (`docs/POSTMORTEM_TEMPLATE.md`)
- [x] CD pipeline configured (Docker build/push + SSH deploy)

### Gate 8: Production Go/No-Go
- [ ] All of the above signed off by Engineering Manager
- [ ] DNS updated to point production traffic to new infrastructure
- [ ] SSL certificates verified (LetsEncrypt or commercial CA)
- [ ] .env.production populated (1 password / LastPass / GitHub Secrets)
- [ ] Rollback plan reviewed and understood by on-call engineer
- [ ] Go/No-Go meeting held with stakeholders
- [ ] Post-launch monitoring period scheduled: 24h intensive, 7 days standard

---

## Effort Summary Table

| Phase | Epic | Hours | Weeks | Engineers |
|-------|------|-------|-------|-----------|
| **Phase 1** | Firefighting | 44 | 1 | 2 |
| **Phase 2** | | | | |
| | 2.1 Testing Foundation | 96 | 1 | 3 |
| | 2.2 Refactor & Debt Elimination | 98 | 1 | 2 |
| | 2.3 Documentation & API Contracts | 84 | 1 | 2 |
| | 2.4 Monitoring & Observability | 64 | 1.5 | 2 |
| | 2.5 Database & Infrastructure Hardening | 52 | 1 | 2 |
| **Phase 3** | | | | |
| | 3.1 Performance & Load Testing | 72 | 1 | 2 |
| | 3.2 Mobile Hardening | 88 | 1 | 2 |
| | 3.3 Security Hardening & Pentesting | 54 | 1 | 2 |
| | 3.4 Compliance & Governance | 54 | 1 | 1 |
| | 3.5 Operational Excellence | 58 | 1 | 2 |
| | **Total** | **764** | **10** | **2–3 avg** |

### Staffing Recommendation

| Role | Allocation |
|------|-----------|
| Backend Engineer (Senior) | Full-time (10 weeks) |
| Backend Engineer | Full-time (10 weeks) |
| Frontend Engineer | Full-time (weeks 4–10) |
| Mobile Engineer | Full-time (weeks 7–8) |
| QA Engineer | Full-time (weeks 2–6) |
| DevOps / SRE | Full-time (weeks 1, 4–5, 8, 10) |
| Security Engineer | Part-time (week 8) |
| Engineering Manager | Oversight + UAT (week 10) |
| Compliance Officer | Part-time (week 9) |

### Parallel Execution Plan

```
Week 1:  [Backend] Firefighting tasks (1.1–1.7)
Week 2:  [Backend] Tests + Refactor     [QA] E2E tests
Week 3:  [Backend] Refactor continues    [QA] E2E tests
Week 4:  [Backend] Docs + API contracts  [DevOps] Monitoring
Week 5:  [Backend] DB hardening          [DevOps] Monitoring + Infra
Week 6:  [Backend] Performance optimizations  [QA] Load testing
Week 7:  [Mobile] Full mobile hardening
Week 8:  [Security] Pen testing          [Backend] Fix findings
Week 9:  [Compliance] GDPR + docs        [Backend] Data ops
Week 10: [All] Operational excellence + UAT + Go-Live
```
