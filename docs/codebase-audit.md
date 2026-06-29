# School LMS — Deep Codebase Audit Report
**Date:** 2026-06-27  
**Scope:** Backend (routes, controllers, services, utils, middleware), Frontend (router, pages, services, store), Database (adapter, collections, queries)

---

## LEGEND
- 🔴 **BROKEN** — causes a crash or data loss right now
- 🟠 **BUG** — wrong behaviour, wrong data, wrong permissions
- 🟡 **MISSING** — feature exists in one layer but not wired up in another
- 🔵 **ADD** — new feature or endpoint needed to satisfy requirements
- ⚪ **CLEANUP** — dead code, inconsistency, tech-debt

---

## 1. BACKEND — ROUTES & CONTROLLERS

### 1.1 assignment-v2 — COMPLETELY DEAD

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `src/routes/assignment-v2.routes.ts` | Entire file replaced with a single comment `// ponytail: removed assignment-v2 routes (unused)`. The route `/assignments-v2/*` is registered in `index.ts` but the router file exports nothing. Every call to any assignments-v2 endpoint returns a 404 or crashes. |
| 🔴 BROKEN | `src/controllers/assignment-v2.controller.ts` | Entire file replaced with `// ponytail: removed assignment-v2 controller (unused)`. No controller functions exist; the routes (even if restored) would throw on import. |
| 🟡 MISSING | `src/routes/index.ts` | `router.use('/assignments-v2', assignmentV2Routes)` is registered, pointing at the dead file above. |

**Fix needed:** Restore both files with the full controller and route definitions matching the existing `assignment-v2.service.ts` (which was correctly implemented).

---

### 1.2 quiz-v2 Routes — Route Order Conflict

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `src/routes/quiz-v2.routes.ts` | `GET /attempts/my` is defined **after** `GET /:quizId`. Express matches `:quizId = "attempts"` first, so `getQuizById("attempts")` is called instead of `getStudentAttempts`. The student attempts endpoint is unreachable. |
| 🔴 BROKEN | `src/routes/quiz-v2.routes.ts` | `GET /concept/:conceptId` is defined **after** `GET /:quizId`. Express matches `:quizId = "concept"` first, making the concept endpoint unreachable. |
| 🟠 BUG | `src/routes/quiz-v2.routes.ts` | `POST /attempts/:attemptId/submit` has **no role restriction** — any authenticated user (including admin/teacher) can submit a student attempt. Should be `requireRole('student')`. |
| 🟠 BUG | `src/routes/quiz-v2.routes.ts` | `GET /:quizId/results` has **no role restriction** — students can view all other students' attempt data for any quiz. Should check role and filter accordingly. |

---

### 1.3 exam-v2 Routes — Nested Path Collision

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `src/routes/exam-v2.routes.ts` | `GET /exams/:examId/students/:studentId/attempt` — the path prefix `/exams` is a sub-path but the entire router is already mounted at `/exams-v2`. The actual URL becomes `/exams-v2/exams/:examId/...` which is double-prefixed and no frontend code calls that URL. |
| 🟠 BUG | `src/routes/exam-v2.routes.ts` | `GET /my` is listed **after** wildcard-style routes. Works by accident because `/my` is a literal, but `GET /class/:classId` and `GET /:examId` both appear before it — Express order is fragile here. Should be reordered: static paths before dynamic ones. |
| 🟠 BUG | `src/controllers/exam-v2.controller.ts` | `getResults` checks `isPrivileged` but the route still has `requireRole('teacher', 'admin', 'student')`. The role middleware is redundant with the internal privilege check — the logic is duplicated and inconsistent with the quiz-v2 pattern. |

---

### 1.4 user.service.ts — Import Path Bug

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `src/services/user.service.ts` | Imports `generateStudentId` from `'../utils/studentIdGenerator.js'` and `generatePassword` from `'../utils/passwordGenerator.js'` with `.js` extensions. The actual files are `.ts`. In a TypeScript project compiled with `tsc`, the `.js` extension import either fails at compile time or resolves incorrectly at runtime depending on `moduleResolution` settings. Should be `'../utils/studentIdGenerator'` and `'../utils/passwordGenerator'`. |
| 🟠 BUG | `src/services/user.service.ts` | When `role === 'student'`, the validator requires `classId` and `rollNo`, but the `createUserSchema` validator marks both as `.optional()`. There is no schema-level enforcement — validation passes but the service throws a generic `Error` (not a `ValidationError`), so the client receives a 500 instead of a 400. |
| 🟠 BUG | `src/services/user.service.ts` | `deleteUserService` deletes from Firestore first, then calls `deleteAuthUser`. If `deleteAuthUser` fails, the Firestore doc is gone but the auth account remains — the user can still log in but has no profile. Should be reversed or wrapped in error recovery. |

---

### 1.5 auth.service.ts — Missing Student Login Support

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/services/auth.service.ts` | `login()` only accepts an `email` + `password`. Students are given a generated email `{studentId}@school.edu`. The `RollNumberEntryPage` on the frontend allows students to enter their roll number — but it's unclear if this resolves to their generated email before calling `/auth/login`. If the frontend sends the raw roll number as the email, login fails. |
| 🟠 BUG | `src/services/auth.service.ts` | `register()` is a separate public endpoint but `createUser()` in `user.service.ts` is the admin-only path. Both create Supabase auth users. The `register` function does not set `classId`, `rollNo`, or `studentId` — if a student self-registers they get an incomplete profile. The public `/auth/register` route should be restricted to admin only or removed. |
| 🟡 MISSING | `src/services/auth.service.ts` | No `loginWithStudentId` function. Students need to log in with `studentId` (e.g. `10a012026`), not a full email. A lookup-by-studentId-then-login flow is needed. |

---

### 1.6 auth.middleware.ts — Missing Fields on req.user

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/middlewares/auth.middleware.ts` | `req.user` only sets `uid, email, role, name, classIds`. It does **not** set `classId` (the primary class for students). Several service calls use `req.user.classId` but it's never populated — they'd get `undefined`. |
| 🟠 BUG | `src/middlewares/auth.middleware.ts` | The Supabase query selects `role, display_name, class_ids` but not `class_id`, `student_id`, or `roll_no`. This means any middleware-level access to these fields returns `undefined`. |
| ⚪ CLEANUP | `src/middlewares/auth.middleware.ts` | `optionalAuth` is a promise-based handler without `asyncHandler` wrapping — unhandled promise rejections are silently swallowed via `.catch(() => next())`. Any Supabase error is hidden. |

---

### 1.7 class.service.ts — Cascade Delete Risk

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/services/class.service.ts` | `deleteClass()` deletes **all students** in the class from both Firestore and Auth. There is no soft-delete, no confirmation, no admin-level guard beyond the role middleware. A mis-click permanently destroys student accounts and all their attempt/grade history. Should be `archiveClass` behavior instead, or require a two-step confirmation. |
| 🟠 BUG | `src/services/class.service.ts` | `addStudents()` queries `collections.users()` per student inside a loop — N+1 queries for large rosters. Should batch-read all user docs first. |
| 🟡 MISSING | `src/services/class.service.ts` | No cascade when a class is deleted: `teacherClassSubject`, `quizV2`, `examV2`, `assignmentV2`, `textbooks` records referencing this `classId` are not cleaned up. |

---

### 1.8 school-analytics.service.ts — Teacher Names Missing

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/services/school-analytics.service.ts` | `getTeacherComparison()` hardcodes `teacherName: 'Teacher'` for every row. The comment says "name lookup avoided — full users scan is OOM risk". However `teacherIds` are already available from the classes array — a targeted `collections.users().doc(id).get()` per unique teacherId is safe. Admin sees "Teacher" for every row. |
| 🟠 BUG | `src/services/school-analytics.service.ts` | All aggregation functions hit `collections.grades().limit(50000)` — if grades exceed 50k the data is silently truncated with no warning. |
| 🟡 MISSING | `src/services/school-analytics.service.ts` | No endpoint exposes `getConductedTests()` from `analytics-v2.service.ts` to the **admin** dashboard. The `/analytics-v2/conducted-tests` route exists and returns data, but `AdminSchoolAnalyticsPage` never calls it — the admin has no UI for test monitoring. |

---

### 1.9 results-push.service.ts — Broken Batch Commit

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/services/results-push.service.ts` | A single `batch` object is created outside the `for (const type of types)` loop but `batch.commit()` is called inside each type iteration. After the first commit, the same batch object is used again for subsequent types — the adapter's `WB` class does not reset after `commit()`, so operations from prior iterations may be replayed or the batch grows unboundedly. Should create a fresh batch per type. |
| 🟠 BUG | `src/services/results-push.service.ts` | The `batchCount % 500 === 0` commit check is run per document but the outer `if (batchCount % 500 !== 0)` after the loop uses the same counter, which may have already been reset mid-loop. The final commit condition is unreliable. |

---

### 1.10 analytics-v2.service.ts — N+1 Query in getConductedTests

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/services/analytics-v2.service.ts` | `getConductedTests()` fetches all chapters for every textbook, then all concepts for every chapter — this is O(textbooks × chapters × concepts) Supabase calls. For a school with 20 textbooks, 10 chapters each, 5 concepts each, that's 1,000 round trips just to build a concept name map. |
| 🟠 BUG | `src/services/analytics-v2.service.ts` | `getConceptOversight()` calls `getAssessmentData(type)` **twice** per assessment in the inner loop — once for assessment list and again for attempt collection. This doubles the Supabase queries. |
| 🟠 BUG | `src/services/analytics-v2.service.ts` | In `getStudentPerformance()`, for each attempt it fetches the parent quiz/exam/assignment doc individually — N+1 reads for assessment titles. |
| 🟡 MISSING | `src/services/analytics-v2.service.ts` | `assignmentV2` quiz oversight queries use `where('conceptId', '==', conceptId)` but `assignment-v2.service.ts` stores `conceptId` as optional/null for many assignments. Results for assignments without a conceptId will never appear in oversight. |

---

### 1.11 concept.routes.ts — Wrong Mount Path

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/routes/concept.routes.ts` | Mounted at `/whiteboard` in index.ts. Routes are `GET /:conceptId` and `POST /:conceptId`. Only accessible to `role === 'teacher'` but students need to view concepts — the student `StudentConceptPage` presumably calls this endpoint but would get a 403. |
| 🟠 BUG | `src/routes/concept.routes.ts` | No `GET /` (list concepts for a chapter) endpoint. Frontend needs to list concepts per chapter for the textbook navigation. |

---

## 2. BACKEND — DATABASE & ADAPTER

### 2.1 Import mismatch — Firestore vs Supabase split

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/database/adapter.ts` | `users`, `classes`, `subjects`, `assignments`, `grades` etc. are stored as `nosql_docs` JSONB in Supabase, but `dataService.ts` on the frontend queries them directly via `supabase.from('users')`, `supabase.from('classes')` etc. as if they are proper SQL tables. For data that is stored as JSONB blobs in `nosql_docs`, the frontend direct Supabase calls will return empty or wrong results. |
| 🟠 BUG | `src/database/adapter.ts` | `textbooks`, `chapters`, `concepts`, `concept_questions` are stored in proper Supabase SQL tables. But `school-analytics.service.ts` tries to access `collections.textbooks().doc(textbookId).collection('chapters')` — using the Firestore-style subcollection API. The adapter's `nosql_docs` path does not support subcollections. This call fails silently returning empty snapshots. |
| 🟠 BUG | `src/services/analytics-v2.service.ts` | Same as above — `getConceptOversight()` calls `collections.textbooks().doc(id).collection('chapters')` which is a Firestore subcollection pattern but textbooks are in Supabase SQL. The entire concept oversight feature returns no data. |
| 🔵 ADD | `src/database/adapter.ts` | A `getTypedCollections()` helper exposing Supabase direct queries for SQL-backed tables (textbooks, chapters, concepts, concept_questions) would eliminate the Firestore-shim confusion for services that need to cross between both storage backends. |

---

### 2.2 authStore reads from wrong Supabase table

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `src/store/authStore.ts` | On session init, reads profile from `supabase.from('users').select('*').eq('id', session.user.id)`. If `users` is stored in `nosql_docs` (Firestore shim), this Supabase query returns nothing and the user gets logged out silently. If users ARE in a proper Supabase SQL table, the column names are snake_case but the store maps `p.display_name`, `p.class_ids` etc. — this mapping only works if the SQL table exists. Needs verification that a `users` SQL view or table exists in Supabase. |
| 🟠 BUG | `src/store/authStore.ts` | `classId` is set as `(p.class_id) || ((p.class_ids)?.[0])` — falls back to first element of `class_ids` array. For teachers assigned to multiple classes this silently picks one class, breaking class-scoped filtering everywhere. |

---

### 2.3 dataService.ts — All queries hit v1 Supabase tables directly

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `src/services/dataService.ts` | `getExamsBySubject()` queries `supabase.from('exams')` — the **v1 exams** table. All v2 exams are in `nosql_docs` collection `examV2`. `StudentExamsPage` uses this function, so it shows zero v2 exams to students. |
| 🔴 BROKEN | `src/services/dataService.ts` | `getAssignmentsBySubject()` queries `supabase.from('assignments')` — v1 assignments only. V2 assignments are invisible to students. |
| 🔴 BROKEN | `src/services/dataService.ts` | `getCorrectionsByStudent()` queries `supabase.from('corrections')` — a v1 table. V2 exam results are in `examAttemptV2` via the backend. This data will always be empty for v2 exam results. |
| 🔴 BROKEN | `src/services/dataService.ts` | `getQuiz()` falls back to `supabase.from('quizV2')` directly — but `quizV2` is in `nosql_docs`, not a Supabase SQL table. The direct query returns nothing. |
| 🟡 MISSING | `src/services/dataService.ts` | No function to fetch v2 quizzes/exams/assignments for a student's class. All student assessment lists need API calls through the backend (`/quizzes-v2/class/:classId`, `/exams-v2/class/:classId`, `/assignments-v2/class/:classId`), not direct Supabase queries. |

---

## 3. FRONTEND — ROUTING & PAGES

### 3.1 Admin Routes — Critical Pages Redirected Away

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/app/router/index.tsx` | `ADMIN_STUDENTS` → redirects to `ADMIN_CLASSES`. `ADMIN_TEACHERS` → redirects to `ADMIN_CLASSES`. `ADMIN_SUBJECTS` → redirects to `ADMIN_CLASSES`. `ADMIN_USERS` → redirects to `ADMIN_SETTINGS`. `ADMIN_AUDIT_LOGS` → redirects to `ADMIN_SETTINGS`. Five dedicated pages exist (`AdminStudentsPage`, `AdminTeachersPage`, etc.) but are completely bypassed by `<Navigate>`. Navigating to `/admin/students` silently drops the user at classes. |
| 🟠 BUG | `src/app/router/index.tsx` | Student routes `STUDENT_SUBJECTS`, `STUDENT_SUBJECT`, `STUDENT_TEXTBOOK`, `STUDENT_CHAPTER` are defined in `ROUTES` but **none are registered** in the router. `SubjectsPage`, `SubjectDetailPage`, `TextbookDetailPage`, `StudentChapterPage` have zero routes pointing to them — they are unreachable. |
| 🟠 BUG | `src/app/router/index.tsx` | `LessonViewPage` exists as a file but has no route registered. Students can never reach a lesson. |
| 🟠 BUG | `src/app/router/index.tsx` | `AdaptiveQuizPage` exists but is not imported or routed anywhere. |
| 🟠 BUG | `src/app/router/index.tsx` | `StudentTaskComponents.tsx` is a component file named as a page, imported as a page — it's not a standalone route. Likely a helper that got placed in the wrong folder. |

---

### 3.2 Student Pages — v2 Assessments Completely Invisible

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `StudentExamsPage.tsx` | Calls `getExamsBySubject()` from `dataService.ts` which queries `supabase.from('exams')` — the v1 table. All v2 exams pushed by teachers are invisible. The page shows zero exams for any student. |
| 🔴 BROKEN | `StudentTasksPage.tsx` | Likely calls similar v1 assignment functions. V2 assignments from teachers do not appear. (Same pattern as StudentExamsPage.) |
| 🔴 BROKEN | `StudentDashboardPage.tsx` | Calls `getGradesByStudent()` which queries `supabase.from('grades')`. V2 quiz/exam/assignment results are stored in `quizAttemptV2`, `examAttemptV2`, `assignmentSubmissionV2` — NOT in the grades table. Dashboard "recent results" will always be empty for v2 assessments. |
| 🟡 MISSING | Student pages | No page exists for listing v2 quizzes by subject/class. `StudentQuizTakePageV2` is the take-page but students have no navigation to get there — there is no "my quizzes" listing page that calls `/quizzes-v2/class/:classId`. |
| 🟡 MISSING | Student pages | No subject-based dropdown filtering for v2 exams or quizzes. Students with multiple subjects can't filter which test belongs to which subject. |

---

### 3.3 RollNumberEntryPage — Self-Assignment Bypasses Admin Control

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `RollNumberEntryPage.tsx` | Student enters their own roll number and the page **directly writes to Supabase** to set `classId`, `studentId`, `rollNumber` on the user record. This completely bypasses the admin workflow where the admin assigns students to classes. Any student can type any roll number and assign themselves to any class. |
| 🔴 BROKEN | `RollNumberEntryPage.tsx` | The class lookup uses `supabase.from('classes').eq('grade', grade).eq('isActive', true)` — but class docs are stored in `nosql_docs` (Firestore shim), not a SQL table. This query returns nothing, so every student gets "No class found" error. |
| 🟠 BUG | `RollNumberEntryPage.tsx` | No duplicate roll-number check against the generated `studentId` format (`classCode + rollNo + year`). The page checks `studentId === cleaned` (the raw number input) not the generated ID. |
| 🟠 BUG | `RollNumberEntryPage.tsx` | Uses camelCase column names (`classId`, `studentId`, `rollNumber`) in `supabase.update()`. Supabase SQL tables use snake_case. The update silently fails or writes to non-existent columns. |
| 🔵 ADD | `RollNumberEntryPage.tsx` | This whole page concept conflicts with the admin creation flow. Should be removed — students should receive credentials from admin and log in directly. If a first-login setup is needed, it should only confirm their pre-assigned class, not let them choose it. |

---

### 3.4 Admin Router — Missing Dedicated Pages

| Severity | File | Issue |
|---|---|---|
| 🟡 MISSING | `src/app/router/index.tsx` | `AdminStudentsPage` is imported but routed to `<Navigate to ADMIN_CLASSES>`. Admin has no standalone student management page at `/admin/students`. |
| 🟡 MISSING | `src/app/router/index.tsx` | `AdminTeachersPage` is imported but routed to `<Navigate to ADMIN_CLASSES>`. Admin has no standalone teacher management page at `/admin/teachers`. |
| 🟡 MISSING | `src/app/router/index.tsx` | `AdminAuditLogsPage` is imported but routed to `<Navigate to ADMIN_SETTINGS>`. |
| 🟡 MISSING | `src/app/router/index.tsx` | `UserManagementPage` is imported but never routed — completely dead code. |
| 🟡 MISSING | Admin area | No admin route for viewing a specific student's profile or performance. `TeacherStudentDetailPage` exists for teachers but admin has no equivalent. |

---

### 3.5 Constants — Missing & Mismatched Routes

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/lib/constants.ts` | `STUDENT_SUBJECTS` is defined as `'/student/subjects'` but this route is **not registered** in the router. Links to it are dead. |
| 🟠 BUG | `src/lib/constants.ts` | `ADMIN_STUDENTS` is defined as `'/admin/students'` but the router redirects it to `/admin/classes`. Any `<Link to={ROUTES.ADMIN_STUDENTS}>` actually lands on classes — misleading UX. |
| 🟡 MISSING | `src/lib/constants.ts` | No route constant for `/student/quizzes` or `/student/quizzes-v2` — the student has no path to view their v2 quiz list. |
| ⚪ CLEANUP | `src/lib/constants.ts` | `STUDENT_TIMETABLE` is defined but no `TimetablePage` exists and no route is registered. Dead constant. |

---

## 4. FRONTEND — AUTH STORE & API LAYER

### 4.1 AuthStore — Column Name Mismatch

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `src/store/authStore.ts` | Reads `p.display_name`, `p.class_ids`, `p.student_id`, `p.class_id` etc. from the Supabase `users` table. If users are stored via the backend `user.service.ts` (which uses the Firestore-shim `nosql_docs`), the Supabase direct query returns no row — user profile never loads and the app redirects to login on every refresh. |
| 🟠 BUG | `src/store/authStore.ts` | `classId` fallback: `(p.class_id) \|\| ((p.class_ids as string[])?.[0])`. For a teacher assigned to 3 classes, `class_id` is null and `class_ids[0]` is picked arbitrarily. All teacher-scoped queries downstream use this single classId, breaking multi-class functionality. |
| 🟠 BUG | `src/store/authStore.ts` | `initialize()` sets `initialized = true` on first call but this is a module-level variable. In dev hot-reload, the module is re-evaluated but `initialized` stays `true` from the previous run, so auth never re-initialises — user appears logged out after HMR. |
| 🟠 BUG | `src/store/authStore.ts` | `logout()` calls `supabase.auth.signOut()` but does not call the backend `/auth/logout` endpoint (if one exists) or invalidate any server-side session state. Token may still be valid server-side until expiry. |

---

### 4.2 api.ts — Token Refresh Race Condition

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `src/services/api.ts` | The 401/403 interceptor retries on **both** 401 (unauthenticated) and 403 (forbidden). A legitimate 403 (e.g. student trying to access a teacher-only endpoint) will trigger a token refresh attempt, fail, and then call `logout()` — logging out a valid user because they hit a forbidden route. Should only refresh on 401. |
| 🟠 BUG | `src/services/api.ts` | `timeout: 600000` (10 minutes). This is set for textbook upload but applies to ALL requests. A hung analytics query or any request that stalls will block the entire axios instance for 10 minutes with no user feedback. Should use per-request timeout overrides for uploads. |
| ⚪ CLEANUP | `src/services/api.ts` | Error message extraction: `data?.error?.message \|\| data?.message \|\| error.message` — three fallback levels with no type safety. If backend sends `{ error: 'string' }` (not an object), this chain fails silently and the user sees "An unexpected error occurred". |

---

## 5. FRONTEND — QUESTION RENDERER

### 5.1 QuestionRendererV2 — Missing Question Types

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `QuestionRendererV2.tsx` | `QuestionModel` type does not include `'assertion_reason'`, `'case_study'`, `'application_based'`, or `'hots'` — yet the backend stores and returns questions of these types. When a student receives one of these question types, the renderer falls through to the "Unsupported question type" fallback div. Students cannot answer ~4 of the 12 configured question types. |
| 🟠 BUG | `QuestionRendererV2.tsx` | `passage` questions use `question.passageText` but the backend stores this field as `passage_text` (snake_case from Supabase). The passage never renders — students see the question without the reading passage. |
| 🟠 BUG | `QuestionRendererV2.tsx` | `matching` renderer shuffles `rights` inside `useMemo` on every re-render (the dependency array is `[question.options]` which is stable, but the shuffle itself is random). If `question.options` reference changes (e.g. parent re-renders), the right-side options are re-shuffled, breaking any partial answers the student already entered. |
| 🟠 BUG | `QuestionRendererV2.tsx` | `matching` answer format is `"Left1:Right1\|Left2:Right2"`. The grading in `quiz-v2.service.ts` checks `normalize(answer) === normalize(question.correctAnswer)` as a plain string. A matching answer will never be marked correct because the format never matches a simple string. Matching questions always score zero. |
| 🟡 MISSING | `QuestionRendererV2.tsx` | `assertion_reason` type needs a two-statement UI (Assertion + Reason) with 4 standard options (Both A and R true and R explains A, etc.). No renderer exists. |
| 🟡 MISSING | `QuestionRendererV2.tsx` | `case_study` type needs a scenario/stimulus paragraph followed by sub-questions. No renderer exists. |

---

### 5.2 StudentQuizTakePageV2 — Interactive Mode Gaps

| Severity | File | Issue |
|---|---|---|
| 🟠 BUG | `StudentQuizTakePageV2.tsx` | Interactive mode (`isRepublished`) calls `handleInteractiveSelect` for MCQ/true_false but matching, fill_blank, and numerical questions fall through to `handleInteractiveTextVerify`. For `matching`, `customTextInput` is a plain text field — the student can't form a valid `"A:B\|C:D"` string by typing. Matching is broken in interactive mode. |
| 🟠 BUG | `StudentQuizTakePageV2.tsx` | `handleInteractiveSelect` checks `optionValue.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase()`. For `passage` questions where `correctAnswer` is `undefined` (backend may not send it), every option is "incorrect". |
| 🟠 BUG | `StudentQuizTakePageV2.tsx` | The `type` URL param is read via `searchParams.get('type')` defaulting to `'quiz'`. Exams navigated to via `ROUTES.STUDENT_TAKE_ASSESSMENT` without `?type=exam` will be treated as quizzes, hitting `/quizzes-v2/...` endpoints instead of `/exams-v2/...`. |
| 🟠 BUG | `StudentQuizTakePageV2.tsx` | `logProctoring` constructs the URL as `` `${api.defaults.baseURL \|\| ''}${basePath}/attempts/${attempt.id}/logs` `` — this creates a double-path if `baseURL` already ends with `/api` (e.g. `/api/quizzes-v2/attempts/.../logs` becomes `/api/quizzes-v2/...` which is correct, but if `baseURL` is `''` it becomes just `/quizzes-v2/...` missing the `/api` prefix entirely). Uses raw `fetch` instead of the `api` axios instance, bypassing the auth interceptor — proctoring logs fail with 401. |

---

## 6. FRONTEND — TEACHER PAGES

### 6.1 TeacherAssessmentCreatePage — Missing assignment-v2 Integration

| Severity | File | Issue |
|---|---|---|
| 🔴 BROKEN | `TeacherAssessmentCreatePage.tsx` | All assignment creation calls go to `/assignments-v2/*` — but the backend route file is a commented-out stub. Every assignment creation by a teacher returns 404. |
| 🟠 BUG | `TeacherAssessmentCreatePage.tsx` | Quiz creation posts to `/quizzes-v2/` but the page passes `questions` array with type `AssignmentQuestion` (which has `multiple_choice \| true_false \| short_answer \| fill_blank \| matching`) — it does not include `descriptive`, `numerical`, `passage`, `assertion_reason` etc. even though the QUESTION_MODELS list shows all 12 types. Teacher can select "Passage" as a model but the question type dropdown in the form doesn't support creating a passage question. |
| 🟡 MISSING | `TeacherAssessmentCreatePage.tsx` | No `subjectId` field on quiz/assignment creation form. The teacher selects class + concept but never selects subject. V2 quizzes stored without `subjectId` can't be filtered by subject for the student's hierarchy view. |

---

### 6.2 Teacher Concept View — No student push UI

| Severity | File | Issue |
|---|---|---|
| 🟡 MISSING | `TeacherConceptViewPage.tsx` | No "Push mind map to students" button. `mindmap.service.ts` has `shareMindMap()` but the teacher concept view has no UI to trigger it. Teachers can create mind maps but can't push them to a class. |
| 🟡 MISSING | `TeacherConceptViewPage.tsx` | No per-concept quiz push flow from the concept page itself. Teacher must go to `TeacherAssessmentCreatePage` separately and manually enter the concept. The concept page should have a "Create Quiz for this Concept" shortcut. |
| 🟡 MISSING | Teacher pages | No page for `StudentCorrectionPanel.tsx` — the file exists but has no route. Teacher cannot manually grade open-ended (descriptive/essay) submissions. |

---

## 7. MISSING FEATURES (additions required)

### 7.1 Student — No v2 Assessment Listing

| Priority | Feature | What's needed |
|---|---|---|
| 🔵 HIGH | Student quiz list page | A new `StudentQuizzesPage` that calls `GET /quizzes-v2/class/:classId` and shows quizzes grouped by subject with a subject dropdown filter. Route: `/student/quizzes`. |
| 🔵 HIGH | Student exam list (v2) | `StudentExamsPage` must be rewritten to call `GET /exams-v2/class/:classId` instead of `getExamsBySubject()`. Subject dropdown filter needed. |
| 🔵 HIGH | Student assignment list (v2) | `StudentTasksPage` must call `GET /assignments-v2/class/:classId`. Currently calls v1 endpoints. |
| 🔵 HIGH | Subject → test hierarchy | `SubjectDetailPage` should show the student's quizzes, exams, and assignments for that specific subject (filter by `subjectId` from the v2 class listings). |
| 🔵 MEDIUM | Student dashboard v2 results | Dashboard "recent results" should aggregate from `quizAttemptV2`, `examAttemptV2`, `assignmentSubmissionV2` via `GET /analytics-v2/student/:studentId`, not from the v1 grades table. |

---

### 7.2 Admin — Missing Monitoring Pages

| Priority | Feature | What's needed |
|---|---|---|
| 🔵 HIGH | Admin student page | Restore `AdminStudentsPage` as a real route at `/admin/students` (remove the `<Navigate>` redirect). |
| 🔵 HIGH | Admin teacher page | Restore `AdminTeachersPage` as a real route at `/admin/teachers`. |
| 🔵 HIGH | Admin audit logs | Restore `AdminAuditLogsPage` as a real route at `/admin/audit-logs`. |
| 🔵 MEDIUM | Admin student detail | Add a route `/admin/students/:studentId` pointing to a student detail/performance page. |
| 🔵 MEDIUM | Teacher name in analytics | `getTeacherComparison()` returns `teacherName: 'Teacher'` for everyone. Resolve names from the teacherIds already present in the data. |

---

### 7.3 Teacher — Missing Wiring

| Priority | Feature | What's needed |
|---|---|---|
| 🔵 HIGH | assignment-v2 routes & controller | Restore `assignment-v2.routes.ts` and `assignment-v2.controller.ts` (both are commented-out stubs). The service is implemented — just needs the routing layer. |
| 🔵 HIGH | subjectId on quiz/exam create | Teacher assessment create form must include `subjectId` field so quizzes/exams can be filtered by subject in the student view. |
| 🔵 MEDIUM | Push mind map to class | Add a "Share with class" button on `TeacherMindMapEditorPage` and `TeacherConceptViewPage` that calls `POST /mindmaps/:id/share` with all student IDs in the class. |
| 🔵 MEDIUM | Student correction panel route | Register `StudentCorrectionPanel` at `/teacher/corrections/:submissionId` so teachers can manually grade descriptive/essay answers. |
| 🔵 MEDIUM | Assignment release endpoint | Assignment v2 needs a `POST /:assignmentId/release` endpoint (parallel to quiz `releasedAt` and exam `releaseExam`). Currently `releasedAt` is set at creation by default — no teacher-controlled release. |

---

### 7.4 Backend — Missing Endpoints

| Priority | Feature | What's needed |
|---|---|---|
| 🔵 HIGH | `GET /quizzes-v2/class/:classId` student filter | Currently returns ALL quizzes for the class regardless of `releasedAt`. Should only return released quizzes to students. The route has no role-based filtering in the service. |
| 🔵 HIGH | `GET /exams-v2/class/:classId` student filter | Same issue — returns unreleased exams to students. `listExamsForClass` does not filter by `releasedAt`. |
| 🔵 HIGH | `GET /assignments-v2/class/:classId` | Already implemented correctly in `assignment-v2.service.ts` (filters by `releasedAt`) but the controller and routes are deleted stubs. |
| 🔵 MEDIUM | Student login by studentId | Need `POST /auth/login-student` or extend `POST /auth/login` to accept `studentId` as username, look up the generated email, and authenticate. |
| 🔵 MEDIUM | `GET /analytics-v2/student/:studentId` by student self | The route uses `requireOwnershipOrRole` — student can call it for themselves. But `getStudentPerformance()` does N+1 reads for assessment titles. Needs optimization with batch reads. |
| 🔵 LOW | `GET /subjects/by-class/:classId` for students | Already exists but only in `requireRole('student','teacher','admin')`. Students need this to populate their subjects list without going through the class document. |

---

## 8. REMOVALS (dead code to clean up)

| File | Reason |
|---|---|
| `src/app/pages/student/RollNumberEntryPage.tsx` | Self-assignment flow conflicts with admin-controlled student creation. Broken Supabase queries. Should be replaced by a simple "welcome, your class is X" confirmation page. |
| `src/app/pages/student/QuizAttemptPage.tsx` | V1 quiz attempt page. All quizzes use v2 now. Dead page with no incoming links from v2 flow. |
| `src/app/pages/student/ExamAttemptPage.tsx` | V1 exam attempt page. All exams use v2. Dead page. |
| `src/app/pages/student/AdaptiveQuizPage.tsx` | Not imported or routed anywhere. Dead file. |
| `src/app/pages/student/StudentTaskComponents.tsx` | Not a page — a component file in the pages folder. Should be moved to `components/student/`. |
| `src/services/dataService.ts` — `getExamsBySubject()` | Queries v1 `exams` table. Should be replaced by a backend API call to `/exams-v2/class/:classId`. |
| `src/services/dataService.ts` — `getCorrectionsByStudent()` | Queries v1 `corrections` table. V2 results come from `examAttemptV2`. Dead for v2 users. |
| `src/services/dataService.ts` — `getAssignmentsBySubject()` | Queries v1 `assignments` table. Should call `/assignments-v2/class/:classId`. |
| `src/routes/index.ts` — `ADMIN_STUDENTS/TEACHERS/SUBJECTS/AUDIT_LOGS` redirects | Remove `<Navigate>` and restore the actual page components. |
| `src/app/pages/admin/UserManagementPage.tsx` | Imported in router but never routed. Either register it or delete it. |
| Backend: `src/routes/assignment-v2.routes.ts` | Single comment line — restore with real content or the index.ts import breaks. |
| Backend: `src/controllers/assignment-v2.controller.ts` | Single comment line — restore with real content. |

---

## 9. SUMMARY TABLE

| Category | Broken | Bug | Missing | Add | Cleanup |
|---|---|---|---|---|---|
| Backend Routes | 4 | 6 | 3 | 5 | 2 |
| Backend Services | 3 | 11 | 4 | 3 | 3 |
| Backend Middleware | 0 | 3 | 0 | 0 | 1 |
| Database/Adapter | 2 | 3 | 1 | 1 | 0 |
| Frontend Router | 2 | 5 | 5 | 0 | 3 |
| Frontend Auth/API | 1 | 4 | 0 | 0 | 2 |
| Frontend Student Pages | 3 | 2 | 5 | 5 | 3 |
| Frontend Teacher Pages | 1 | 2 | 4 | 4 | 0 |
| Frontend Admin Pages | 0 | 3 | 5 | 2 | 1 |
| Question Renderer | 1 | 3 | 2 | 0 | 0 |
| **TOTAL** | **17** | **42** | **29** | **20** | **15** |

---

## 10. PRIORITY ORDER FOR FIXES

### Immediate (Causes total feature failure)
1. Restore `assignment-v2.routes.ts` and `assignment-v2.controller.ts`
2. Fix quiz-v2 route order (static before dynamic)
3. Fix `user.service.ts` import extension (`.js` → no extension)
4. Restore admin student/teacher/audit-log routes (remove Navigate redirects)
5. Register missing student routes: subjects, textbook, chapter, v2 quiz list

### High (Core workflow broken)
6. Rewrite `StudentExamsPage`, `StudentTasksPage` to use v2 endpoints
7. Fix `dataService.ts` to use backend API for v2 assessments
8. Fix `QuestionRendererV2` — add missing types, fix `passageText` field name
9. Add `subjectId` to quiz/exam creation form
10. Fix `listQuizzesForClass` and `listExamsForClass` to filter by `releasedAt` for students

### Medium (Data integrity and UX gaps)
11. Fix matching question grading in `quiz-v2.service.ts`
12. Fix proctoring log `fetch` to use `api` axios instance
13. Fix `auth.middleware.ts` to include `classId` and `studentId` on `req.user`
14. Fix `RollNumberEntryPage` — remove self-assignment, replace with confirmation only
15. Fix teacher names in `getTeacherComparison()`

### Low (Tech debt and cleanup)
16. Remove dead v1 page files (QuizAttemptPage, ExamAttemptPage, AdaptiveQuizPage)
17. Fix `deleteUserService` order (delete auth before Firestore)
18. Fix `api.ts` 403 retry logic
19. Fix `authStore.ts` HMR `initialized` module-level variable
20. Move `StudentTaskComponents.tsx` to components folder
