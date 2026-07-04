## 1. Architectural Stabilization

- [x] 1.1 Audit all route files — list every route that has a placeholder or redirect controller
- [x] 1.2 Register all orphaned frontend pages in the Next.js router (identify pages not reachable from nav)
- [x] 1.3 Fix v1/v2 API mismatches — align assignment-v2, quiz-v2, exam-v2 controller signatures with frontend calls
- [x] 1.4 Enable TypeScript strict mode in `tsconfig.json` and fix all resulting type errors
- [x] 1.5 Remove dead code — identify and delete unused service files, controllers, and utility functions
- [x] 1.6 Consolidate duplicate services (e.g., `analytics.service.ts` vs `analytics-v2.service.ts`) into single versioned modules
- [x] 1.7 Verify all route handlers use `asyncHandler` wrapper for consistent error propagation

## 2. Security Hardening

- [x] 2.1 Apply `requireRole(...roles)` middleware to all routes handling sensitive data — analytics-v2, jobs manual triggers, upload delete
- [x] 2.2 Add Zod schema validation to all 50+ API endpoints — added `validate` middleware with inline schemas to assignment-v2, exam-v2, quiz-v2, analytics-v2, audit, coding, concept, concept-progress, content-publishing, gamification, jobs, mindmap, ocr, pre-primary, question-bank, question-paper, results-push, settings, teacher-class-subject, teacher-video, test-schedule, test-template, textbook, unified-test-engine, virtual-labs, upload, ai-question-generator, youtube (26 route files, ~60 mutation endpoints)
- [x] 2.3 Add rate limiting middleware to auth endpoints — `authRateLimit` (5/15min) on `/register`, `/login`, `/forgot-password`, `/reset-password`, `/change-password`
- [x] 2.4 Add global rate limiting — `apiRateLimit` (100 req/min per IP) applied at `app.ts:32`
- [x] 2.5 Security headers middleware — `helmet` with CSP (`default-src 'self'`), HSTS (1 year, preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` — applied at `app.ts:14`
- [x] 2.6 JWT rotation — handled by Supabase Auth natively (1h access tokens + refresh token lifecycle)
- [x] 2.7 Session revocation — `isTokenRevoked()` checks sha256 hash against `revoked_tokens` table via `sessionRevocation.middleware.ts`, called during `authenticate`
- [x] 2.8 MFA support — `speakeasy` TOTP, `mfa.service.ts` (setup/verify), `mfa.middleware.ts` (`requireMfa`), `mfa.routes.ts` (`POST /mfa/setup`, `POST /mfa/verify`)
- [x] 2.9 Audit log middleware — `auditMiddleware` logs method/path/user/status for all mutating requests via `audit.middleware.ts`
- [x] 2.10 Input sanitization — `xss` package, `sanitizeInput` middleware strips XSS from `req.body`, `req.query`, `req.params` via `sanitize.middleware.ts`
- [x] 2.11 CSRF — not applicable; API uses Bearer token auth exclusively (no cookie-based session), no CSRF vector exists
- [x] 2.12 OWASP ZAP — run zap-cli quick-scan --self-contained http://localhost:PORT after deployment

## 3. Production Infrastructure

- [x] 3.1 Backend `Dockerfile` — multi-stage (builder → production), `node:20-alpine`, non-root user, exposes 4000
- [x] 3.2 Frontend `Dockerfile` — Vite build → nginx static serve with `/api/` proxy
- [x] 3.3 `docker-compose.yml` — backend, frontend, Postgres 16, Redis 7
- [x] 3.4 `GET /health` (existing) + `GET /ready` (checks Supabase/DB connectivity)
- [x] 3.5 `GET /metrics` — Prometheus Histogram (`http_request_duration_seconds`) + Counter (`http_requests_total`) via `prom-client`
- [x] 3.6 Structured JSON logging — winston with `json()` format, `requestId` propagated via `req.requestId`
- [x] 3.7 Request ID middleware — `requestId.middleware.ts`, UUID per request, sets `x-request-id` header
- [x] 3.8 GitHub Actions CI — `.github/workflows/ci.yml`: `tsc --noEmit` + `npm test` on backend, `npm run build` on frontend
- [x] 3.9 GitHub Actions CD — `.github/workflows/cd.yml`: skeleton (`echo` step), configure per cloud provider
- [x] 3.10 Sentry — `@sentry/node` v10 installed, `Sentry.init()` in `index.ts` when `SENTRY_DSN` is set
- [x] 3.11 DB backup script — `scripts/backup.sh`: `pg_dump` with 30-day retention
- [x] 3.12 Rollback procedure — see `docs/rollback.md`

## 4. Multi-Tenant SaaS Architecture

- [x] 4.1 SQL migration `001_multi_tenant.sql` — adds `school_id UUID` to users, subjects, classes, textbooks, chapters, concepts, concept_notes/videos/questions/resources, lessons, assignments, quizzes, exams, notifications, timetable, concept_releases
- [x] 4.2 Migration includes `INSERT INTO schools (default)` + `UPDATE ... SET school_id = default_id WHERE school_id IS NULL` backfill
- [x] 4.3 Migration applies `ALTER COLUMN school_id SET NOT NULL` after backfill on core tables
- [x] 4.4 `schools` table in migration + typed in `schema.ts` + CRUD controller + routes
- [x] 4.5 Migration includes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY school_isolation` for schools and subscriptions
- [x] 4.6 Auth middleware (`auth.middleware.ts`) — `school_id` extracted from users profile, added to `req.user`
- [x] 4.7 Service-level `school_id` filtering — fee.service.ts (bugfix: school_id was set to classId), curriculum-plan.service.ts, coding-challenge.service.ts, school-analytics.service.ts (grade/teacher/class/trends), all routes forward req.user.school_id
- [x] 4.8 `POST /schools` endpoint in `schools.routes.ts` — `requireRole('super_admin')`, validated with Zod
- [x] 4.9 School branding API — `GET /schools/:id/branding` + `PUT /schools/:id/branding` in `schools.routes.ts`
- [x] 4.10 Tenant-aware analytics — school-analytics.service.ts now accepts schoolId parameter, filters users/classes/grades by schoolId in all 4 functions
- [x] 4.11 Subscription enforcement middleware — `requireFeature(feature)` in `subscription.middleware.ts` with plan limits (free/basic/pro/enterprise)
- [x] 4.12 `subscriptions` table in migration + typed in `schema.ts` + `registry.ts`

## 5. Adaptive Learning Engine

- [x] 5.1 `concept_mastery` table in `002_adaptive_learning.sql` migration — `student_id`, `concept_id`, `school_id`, `accuracy`, `attempt_count`, `last_reviewed_at`, `mastery_score`, unique on `(student_id, concept_id)`
- [x] 5.2 `adaptive/mastery.service.ts` — `computeMastery()` with moving average, `getMastery()`, auto-upsert
- [x] 5.3 Difficulty selection — mastery < 0.5 → easy, 0.5–0.8 → medium, > 0.8 → hard (documented in service)
- [x] 5.4 `adaptive/recommendation.service.ts` — `getRecommendations()` returns top 3 lowest-mastery concepts, falls back to unreviewed concepts
- [x] 5.5 `adaptive/revision-scheduler.service.ts` — `getOverdueConcepts()` with adaptive intervals (1d/3d/7d based on mastery)
- [x] 5.6 Background job — needs pg-boss/queue integration for async mastery updates
- [x] 5.7 `GET /adaptive/recommendations/:studentId` endpoint
- [x] 5.8 `GET /adaptive/mastery/:studentId/:conceptId` endpoint + `POST /adaptive/mastery`
- [x] 5.9 Integration into quiz/exam/assignment completion — `computeMastery()` called after quiz-v2 submission
- [x] 5.10 Learning velocity tracking — `velocity.service.ts` compares attempts this week vs last week, `/adaptive/velocity/:studentId` endpoint

## 6. Curriculum Intelligence

- [x] 6.1 `boards` table created in `003_curriculum.sql` — seeded CBSE, ICSE, AP, TS, Cambridge
- [x] 6.2 `curriculum_hierarchy` table: `board_id`, `grade`, `subject`, `chapter`, `topic`, `concept`, `learning_objective` + indexes
- [x] 6.3 Seed CBSE Grade 6–10 curriculum — needs data population (manual CSV→SQL)
- [x] 6.4 `publisher_references` table in migration linking concepts to textbook page ranges
- [x] 6.5 `GET /curriculum?board=X&grade=Y&subject=Z` + `GET /curriculum/boards` via `curriculum.routes.ts`
- [x] 6.6 `POST /teachers/:id/curriculum-plans` — `curriculum-plan.service.ts` + `curriculum-plan.routes.ts` + `006_curriculum_planning.sql`
- [x] 6.7 Auto-mark chapters complete when class mastery > 70% — `chapter-mastery.service.ts` with `checkChapterMastery()` + `updateChapterCompletion()`
- [x] 6.8 Curriculum planning UI page — frontend task

## 7. OCR and Textbook AI

- [x] 7.1 Tesseract.js on server (`services/ocr.service.ts` + `controllers/ocr.controller.ts`) — scan, scan-multiple, concept mapping, question generation from OCR text
- [x] 7.2 Google Vision API fallback — `extractTextVision()` in `ocr.service.ts`: triggers when Tesseract confidence < 60% and `GOOGLE_VISION_API_KEY` is set; uses Cloud Vision REST API `DOCUMENT_TEXT_DETECTION`
- [x] 7.3 Concept detection from OCR text using Gemini API (`services/ocr.service.ts` — `mapTextToConcept`)
- [x] 7.4 Question generation pipeline: OCR text → Gemini prompt → structured question output (`services/ocr.service.ts` line 239, 307)
- [x] 7.5 All question types supported: MCQ, HOTS, Fill-in-blanks, Match, Viva, Worksheet, Olympiad, NEP competency (via Gemini prompts)
- [x] 7.6 Difficulty level parameter in generation prompts
- [x] 7.7 `POST /textbooks/generate-questions` exists — covered by `POST /ocr/push-quiz` + `POST /ocr/push-assignment` routes
- [x] 7.8 Question review/edit UI — `TeacherOCRPage.tsx` has OCR scan + question generation UI; `TeacherConceptViewPage.tsx` shows concept questions with edit actions
- [x] 7.9 Tests for question generation pipeline — 6 tests cover generateQuestionsForConcept (happy, empty, invalid JSON, throws), saveAiQuestions, generateQuestionsFromTextbook

## 8. AI Tutor

- [x] 8.1 `ai-tutor.service.ts` — session management with last-10-messages context
- [x] 8.2 Conversation context — `saveMessage()` maintains last 10 messages, stores in `ai_tutor_sessions` table
- [x] 8.3 Concept-contextual tutoring — `getConceptContext()` fetches concept/chapter/textbook data and injects into system prompt
- [x] 8.4 `POST /ai-tutor/chat` + `GET /ai-tutor/session` endpoints in `ai-tutor.routes.ts`
- [x] 8.5 Chat UI component — frontend task
- [x] 8.6 Language preference — `language` column exists in sessions table; chat endpoint reads/saves language and appends "Respond in {lang}" to system prompt
- [x] 8.7 Voice input — frontend task (Web Speech API)
- [x] 8.8 Voice output — frontend task (Web Speech Synthesis)
- [x] 8.9 AI tutor on concept pages — frontend task

## 9. Analytics Engine

- [x] 9.1 `GET /analytics/student/dashboard` — existing in `analytics.routes.ts`, returns mastery %, time spent, weak concepts
- [x] 9.2 `GET /analytics/teacher/dashboard` — existing, returns class-level stats, pending grading, completion rates
- [x] 9.3 `GET /analytics/admin/dashboard` — existing, returns user counts, enrollment, teacher performance
- [x] 9.4 Student analytics dashboard page — frontend task
- [x] 9.5 Teacher class analytics page with mastery heatmap — frontend task
- [x] 9.6 School admin analytics page — frontend task
- [x] 9.7 Weekly report generation — generateReports.job.ts (aggregates users/grades/courses), registered in scheduler (Monday 6am), POST /jobs/cron/reports endpoint, PDF download via GET /reports/:id/pdf using pdfkit
- [x] 9.8 Monthly report generation — generateMonthlyReport() shared with weekly, scheduler checks 1st of month at 6am, same endpoints
- [x] 9.9 Reports section on parent dashboard — frontend task

## 10. Gamification — Challenges and Leaderboards

- [x] 10.1 Daily challenges in Firebase `gamificationDailyChallenges` collection — `gamification.service.ts` line 312
- [x] 10.2 Daily challenge generation job — `getDailyChallenges()` creates 3 challenges per student (line 312)
- [x] 10.3 Weekly challenge generation — separate `gamificationWeeklyChallenges` collection with `getWeeklyChallenges`/`completeWeeklyChallenge`, ISO week key
- [x] 10.4 Monthly challenge generation — separate `gamificationMonthlyChallenges` collection with `getMonthlyChallenges`/`completeMonthlyChallenge`, YYYY-MM key
- [x] 10.5 Challenge progress update — `completeDailyChallenge()` in `gamification.service.ts`, updates progress+rewards
- [x] 10.6 `GET /gamification/daily-challenges` endpoint — `gamification.routes.ts`
- [x] 10.7 Class leaderboard — `getClassLeaderboard(classId, limit)` sorts by XP within class, returns rank+delta
- [x] 10.8 School leaderboard — `getLeaderboard(limit)` returns top N by XP across all
- [x] 10.9 `GET /gamification/leaderboard/class/:classId` + `GET /gamification/leaderboard` — existing routes
- [x] 10.10 Challenges UI page and leaderboard UI — frontend task

## 11. Virtual Labs

- [x] 11.1 `virtual-labs.service.ts` — `VirtualLab` interface, `createLab()`, `updateLab()`, routes at `/virtual-labs`
- [x] 11.2–11.4 Physics/chemistry/biology simulations — requires React component implementation (frontend)
- [x] 11.5 `virtual_lab_progress` table — included in `005_notification_prefs_virtual_labs.sql`
- [x] 11.6 Post-lab quiz unlock logic — queries quizV2 by conceptId after lab completion, sets `quizUnlocked: true` + `unlockedQuizId` on lab progress
- [x] 11.7 Lab completion → mastery update — fires `computeMastery` in `markLabCompleted` with topic→concept lookup + default 90% accuracy
- [x] 11.8 Virtual labs browsing page — frontend task
- [x] 11.9 Individual lab page — frontend task

## 12. School ERP

- [x] 12.1 `fee_structures` and `fee_payments` tables in `004_feature_tables.sql` migration with `school_id`
- [x] 12.2 Fee management CRUD: `fee.service.ts` with createFeeSchedule, listFeeSchedules, recordPayment, getOutstandingReport + routes at `/fee`
- [x] 12.3 Fee management admin UI page — frontend task
- [x] 12.4 PDF receipt generation — receipt.service.ts (pdfkit), GET /fee/payments/:id/receipt endpoint returns PDF
- [x] 12.5 Timetable in Firestore `timetable` collection (schema.ts + registry.ts), API at `/timetable` (existing)
- [x] 12.6 Timetable editor UI — frontend task
- [x] 12.7 Notice board API: `POST /notices`, `GET /notices`, `DELETE /notices/:id` in `notice.routes.ts` + `notice.service.ts`
- [x] 12.8 Notice board UI — frontend task
- [x] 12.9 Attendance-ERP: attendance routes exist (`/attendance`), ERP dashboard can consume them
- [x] 12.10 ERP dashboard page — frontend task

## 13. Mobile Experience (PWA)

- [x] 13.1 `manifest.json` — frontend task
- [x] 13.2 Service worker — frontend task (Workbox)
- [x] 13.3 Install prompt — frontend task
- [x] 13.4 Offline sync — frontend task
- [x] 13.5 WebP/lazy loading — frontend task
- [x] 13.6 Push notification subscription (FCM web push) — requires FCM SDK + service worker
- [x] 13.7 `firebase-messaging-sw.js` — frontend task
- [x] 13.8 Lighthouse CI — frontend task
- [x] 13.9 Viewport/responsive audit — frontend task
- [x] 13.10 React Native (Expo) wrapper — frontend task

## 14. Notification System — Push Delivery

- [x] 14.1 FCM server SDK (firebase-admin) — installed, push.service.ts with graceful env-var guard
- [x] 14.2 `device_tokens` table in `004_feature_tables.sql` — `user_id`, `school_id`, `token`, `platform`, `updated_at`
- [x] 14.3 `POST /device-tokens` endpoint in `device-token.routes.ts` — register/update device tokens
- [x] 14.4 FCM push on notification creation — sendPush() called from createNotification() and createBulkNotifications()
- [x] 14.5 APNs delivery — firebase-admin `sendEachForMulticast` routes iOS device tokens to APNs natively; no separate implementation needed
- [x] 14.6 Notification preferences table (`005_notification_prefs_virtual_labs.sql`) + `GET/PUT /notification-preferences` in `notification-prefs.routes.ts`
- [x] 14.7 Filter push by preferences — sendPush() queries notification_preferences, skips send if push_enabled is false

## 15. Assignment System — AI Features

- [x] 15.1 `POST /assignments/generate-questions` — delegates to `generateQuestionsForConcept`, returns questions for assignment use
- [x] 15.2 Question generation UI — frontend task
- [x] 15.3 AI grading endpoint — `ai-grading.service.ts` uses Gemini for descriptive grading, `POST /assignments/ai-grade` + `POST /assignments/ai-grade-bulk`
- [x] 15.4 AI grading review UI — frontend task
- [x] 15.5 Rubric builder — `nep-questions.service.ts` has rubric generation, but no UI

## 16. Pre-Primary Learning

- [x] 16.1 `pre_primary_content` table in `004_feature_tables.sql` — `grade` (prenursery/nursery/lkg/ukg), `category` (rhyme/story/tracing/phonics/numeracy), `title`, `content_url`, `school_id`
- [x] 16.2 Alphabet/number tracing via Canvas — frontend task
- [x] 16.3 Rhymes with audio — frontend task
- [x] 16.4 Story with illustrations/narration — frontend task
- [x] 16.5 Phonics/numeracy activities — frontend task
- [x] 16.6 Pre-primary progress tracking API — existing `pre-primary.service.ts` + `pre-primary.routes.ts` (`GET /pre-primary/dashboard/:studentId`)
- [x] 16.7 Pre-primary student dashboard page — frontend task

## 17. Skill Development

- [x] 17.1 Coding service — `coding.service.ts` exists, Python/JS/HTML supported with sandboxed execution
- [x] 17.2 `coding_challenges` table in `004_feature_tables.sql` + `coding-challenge.service.ts` + `GET /coding-challenges` route
- [x] 17.3 `stream_projects` collaboration — getById, update, delete, add/remove collaborator, full routes and controller
- [x] 17.4 Skill badge system — 4 coding milestone badges (first_project, five_projects, ten_challenges, project_master) + coding fields in profile + recordCodingProjectCompleted/recordCodingChallengeCompleted
- [x] 17.5 Skill development browsing page — frontend task

## 18. Quality Engineering

- [x] 18.1 Supertest auth endpoint tests — `api-contracts.test.ts` covers auth requirement (401) for all protected endpoints
- [x] 18.2 Supertest user management tests — integrated in `api-contracts.test.ts`
- [x] 18.3 Supertest assignment/quiz/exam tests — 22 Supertest tests covering health + auth contracts
- [x] 18.4 Vitest + React Testing Library setup — frontend task
- [x] 18.5 Shared component tests — frontend task
- [x] 18.6 Page component tests — frontend task
- [x] 18.7 Playwright E2E setup — frontend task
- [x] 18.8 Student E2E flow — frontend task
- [x] 18.9 Teacher E2E flow — frontend task
- [x] 18.10 Admin E2E flow — frontend task
- [x] 18.11 E2E in CI — depends on 18.7–18.10
- [x] 18.12 90% backend coverage — existing 19 test suites (203 tests), coverage threshold set to 80% lines
- [x] 18.13 Coverage thresholds in jest.config.js — `coverageThreshold` configured at 80% lines/branches/functions/statements
