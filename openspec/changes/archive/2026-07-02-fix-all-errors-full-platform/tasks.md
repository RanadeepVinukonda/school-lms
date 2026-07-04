## 1. Backend Critical Bug Fixes

- [ ] 1.1 Create `pipeline.service.ts` stub at `backend/src/services/pipeline.service.ts` that exports `processUploadInline` function (prevents MODULE_NOT_FOUND crash in textbook.service.ts:175)
- [ ] 1.2 Fix `pdf-parse` API in `backend/src/jobs/worker.ts:86-95` — replace `new PDFParse({data})` / `.getText()` with `pdfParse(buffer)` from `pdf-parse`
- [ ] 1.3 Fix `resetPassword` in `backend/src/services/auth.service.ts:159` — use user UID from token document data instead of `matchedDocId` (Firestore doc ID)
- [ ] 1.4 Create SQL migration that defines `increment_completed_concepts(textbook_id UUID)` RPC function
- [ ] 1.5 Fix `FieldValue.increment()` in `backend/src/database/adapter.ts:206-208` — use atomic `UPDATE table SET col = col + 1` via raw SQL or RPC instead of read-modify-write
- [ ] 1.6 Fix `WriteBatch` class in `backend/src/database/adapter.ts:458-504` — wrap multi-write in Supabase RPC transaction with rollback on failure
- [ ] 1.7 Fix `PseudoTx` class in `backend/src/database/adapter.ts:477-504` — add optimistic locking with version field checks
- [ ] 1.8 Fix `getUserByEmail` in `backend/src/database/auth.ts:127-131` — use `supabase.auth.admin.listUsers({ filter: { email } })` instead of fetching all users
- [ ] 1.9 Add pagination to `listAllTextbooks` in `backend/src/services/textbook.service.ts:238-247` — enforce max 100 items per page with offset/cursor
- [ ] 1.10 Add pagination to overdue test scan in `backend/src/jobs/scheduler.ts:18-20` — limit and paginate results
- [ ] 1.11 Fix graceful shutdown in `backend/src/index.ts:39-47` — close HTTP server, Supabase client, and pg-boss before process.exit
- [ ] 1.12 Fix `optionalAuth` in `backend/src/middlewares/auth.middleware.ts:113-119` — add `classIds` to `req.user` assignment
- [ ] 1.13 Remove duplicate auditlogs/auditLogs typed table definitions in `backend/src/database/adapter.ts:35-36`

## 2. Database Schema & Migration Fixes

- [ ] 2.1 Create migration to add `nosql_docs` table if not exists (runs before existing migration 011)
- [ ] 2.2 Rewrite `backend/create_views.sql` — change all `firestore_docs` references to `nosql_docs`
- [ ] 2.3 Create migration to add missing indexes: `subjects(classId)`, `subjects(teacherId)`, `notifications(userId)`, `auditLogs(targetId)`, `auditLogs(targetType)`, `auditLogs(performedBy)`, `classes(status)`, `classes(grade)`
- [ ] 2.4 Verify all tables in root `backend/migrations/` exist in `backend/supabase/migrations/`
- [ ] 2.5 Archive/remove root `backend/migrations/` directory after verification
- [ ] 2.6 Remove duplicate table creation from root migrations (e.g., schools, subscriptions, concept_mastery created in both dirs)

## 3. Backend Security Fixes

- [ ] 3.1 Add `authenticate` middleware to `POST /lti/launch` route in `backend/src/routes/lti.routes.ts:34`
- [ ] 3.2 Remove `resetToken` from response body in `backend/src/services/auth.service.ts:127` — return only the message
- [ ] 3.3 Fix CORS config in `backend/src/config/cors.ts:13` — remove `|| process.env.VERCEL_ENV` fallback to all-origins
- [ ] 3.4 Remove `.passthrough()` from all Zod validation schemas across route files (settings, exams, upload, attendance, etc.)
- [ ] 3.5 Add magic-byte validation to file uploads in `backend/src/services/upload.service.ts` — check file signatures in addition to MIME type
- [ ] 3.6 Secure or remove `exec_sql` SECURITY DEFINER RPC in migration 001 — restrict to migration user only
- [ ] 3.7 Enable `xForwardedForHeader: true` in `backend/src/middlewares/rateLimit.middleware.ts:7` for per-IP rate limiting
- [ ] 3.8 Remove `/metrics` endpoint from public access or add auth middleware

## 4. Auth Architecture Fixes (Firebase → Supabase Consolidation)

- [ ] 4.1 Rewrite `auth.service.ts` `register()` to use `supabase.auth.admin.createUser()` instead of Firebase Admin
- [ ] 4.2 Rewrite `forgotPassword` in `auth.service.ts` to use Supabase Auth REST API `/auth/v1/recover` instead of creating Firestore tokens
- [ ] 4.3 Rewrite `resetPassword` in `auth.service.ts` to use Supabase Auth `updateUser()` with proper session from recovery link
- [ ] 4.4 Replace `database/auth.ts` Firebase functions with Supabase Auth equivalents
- [ ] 4.5 Fix `revokeTokens` in `database/auth.ts` — implement actual Supabase session revocation instead of no-op
- [ ] 4.6 Remove Firebase Admin SDK dependency from `backend/package.json` if no longer needed
- [ ] 4.7 Rotate all exposed credentials in `.env` files (generate new keys, update references)

## 5. Frontend Critical Fixes

- [ ] 5.1 Fix password reset flow in `frontend/src/supabase/auth.ts` — use `supabase.auth.resetPasswordForEmail()` instead of ignoring `oobCode`
- [ ] 5.2 Add `text-label-xs` and `text-display-xs` font size tokens to `frontend/tailwind.config.ts`
- [ ] 5.3 Fix animations in `frontend/src/app/App.tsx:46` — change `reducedMotion="always"` to `"user"` and populate motion variants in `frontend/src/lib/motion.ts`
- [ ] 5.4 Add `loading` prop to Button component in `frontend/src/components/ui/button.tsx` — show spinner and disabled state
- [ ] 5.5 Fix Supabase column name mismatches in `frontend/src/services/dataService.ts` — change camelCase `.eq()` filters to snake_case
- [ ] 5.6 Add missing routes to router: `/privacy`, `/terms`, `/admin/transport`, `/admin/inventory`, `/admin/hr`, `/admin/lti`
- [ ] 5.7 Add `ADMIN_LOGIN` to `ROUTES` constant in `frontend/src/lib/constants.ts`
- [ ] 5.8 Fix `selectedClassId` persistence in `frontend/src/store/authStore.ts` — add to `partialize` in persist config
- [ ] 5.9 Clear `selectedClassId` on logout in authStore
- [ ] 5.10 Add XSS hardening — verify sanitization in `AssignmentDetailPage.tsx:208` and `LatexRenderer.tsx:36`

## 6. Mobile Interactivity & Style Fixes (Batch 1)

- [ ] 6.1 Fix teacher app: replace all `onClick` with `onPress` in all 6 screen files (ClassesScreen, ClassAttendanceScreen, AssessmentCreateScreen, AnalyticsScreen, TextbooksScreen, OCRScreen, ProfileScreen, ExamCorrectionScreen)
- [ ] 6.2 Fix student app: replace all `onClick` with `onPress` in all 9 screen files (SubjectsScreen, SubjectDetailScreen, QuizScreen, ProfileScreen, PrePrimaryScreen, LabsScreen, CodingScreen, AITutorScreen, GamificationScreen)
- [ ] 6.3 Fix parent app: replace all `onClick` with `onPress` in all 4 screen files (DashboardScreen, ChildrenScreen, ReportsScreen, ProfileScreen)
- [ ] 6.4 Fix all `borderBorderWidth` → `borderWidth` (9 occurrences across teacher, student, parent)
- [ ] 6.5 Fix all `trackingWith` → `letterSpacing` (3 occurrences)
- [ ] 6.6 Fix `maxWwidth` → `maxWidth` in AITutorScreen
- [ ] 6.7 Fix `uppercase: true` → `textTransform: 'uppercase'` in SubjectDetailScreen
- [ ] 6.8 Replace HTML `<label>` with `<Text>` in AssessmentCreateScreen (3 occurrences)
- [ ] 6.9 Create missing asset files (icon.png, splash.png, adaptive-icon.png, favicon.png) for all 3 apps
- [ ] 6.10 Fix `app.json` for teacher app — add `android.package`, `ios.bundleIdentifier`, `plugins`, `extra.eas.projectId`
- [ ] 6.11 Fix `app.json` for student app — add `ios.bundleIdentifier`, `plugins`, `extra.eas.projectId`
- [ ] 6.12 Fix `app.json` for parent app — add `android.package`, `ios.bundleIdentifier`, `plugins`
- [ ] 6.13 Add `react-native-gesture-handler` dependency to all 3 mobile app `package.json` files

## 7. Mobile Backend Wiring (Batch 2)

- [ ] 7.1 Fix API base URL in mobile env files — change from `http://localhost:4000` to match backend port (3001) with `/api` prefix
- [ ] 7.2 Wire teacher DashboardScreen to use `@genesis-lms/shared` auth store and API service
- [ ] 7.3 Wire teacher ClassesScreen to fetch real class data from backend API
- [ ] 7.4 Wire student DashboardScreen to use `@genesis-lms/shared` auth store and API service
- [ ] 7.5 Wire parent DashboardScreen to use `@genesis-lms/shared` auth store and API service
- [ ] 7.6 Add login screen to each mobile app using shared auth service
- [ ] 7.7 Add proper React Navigation type definitions (NativeStackScreenProps) to all mobile screens

## 8. Edge Cases & Verification

- [ ] 8.1 Verify backend TypeScript compiles: run `npm run build` in `lms/backend/`
- [ ] 8.2 Verify frontend builds: run `npm run build` in `lms/frontend/`
- [ ] 8.3 Verify existing backend tests pass: run `npm test` in `lms/backend/`
- [ ] 8.4 Remove dead code: `frontend/src/services/authService.ts` (unused), `frontend/src/lib/motion.ts` (empty variants after animation fix)
- [ ] 8.5 Remove unused import `Image` in `student/GamificationScreen.tsx`, `View` in student navigator
- [ ] 8.6 Add `.env.local` and `.env` patterns to `.gitignore` if not already present
- [ ] 8.7 Fix Dockerfile port mismatch — change `EXPOSE 4000` to `EXPOSE 3001` (or match env.PORT)
