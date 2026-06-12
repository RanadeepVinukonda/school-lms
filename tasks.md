# Implementation Plan: OpenCode LMS

## Overview

Full-stack implementation of the OpenCode LMS across 7 sprints covering: project bootstrap, RBAC, Admin portal (classes/subjects/teachers/students), Teacher portal (textbooks/AI pipeline/templates/tests), Student exam consoles (Normal + Interactive), adaptive profiling engine, analytics, and notification system.

Stack: React 18 / Vite / TypeScript / TailwindCSS / Radix UI (frontend), Express / TypeScript / firebase-admin (backend), Firebase Auth + Firestore + Storage.

## Tasks

### Sprint 1: Foundation & RBAC

- [x] 1. Project bootstrap and shared types
  - Write `frontend/src/types/index.ts` with all shared interfaces (User, Class, Subject, Junction, Textbook, Chapter, Concept, Question, Template, QuestionPaper, Test, AnswerRecord, Submission, Notification) and union types (Role, QuestionType, Difficulty, AdaptiveLevel, TestType, TextbookStatus)
  - Write `backend/src/types/index.ts` as a mirror of the frontend types
  - Write `frontend/src/utils/cn.ts` using clsx + tailwind-merge
  - Write `frontend/src/lib/queryKeys.ts` with the key factory for all domains
  - Write `frontend/src/lib/queryClient.ts` configuring TanStack React Query client (staleTime, retry)
  - Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14

- [x] 2. Backend: Express app setup and Firebase Admin
  - Write `backend/src/config/firebase.ts` initializing firebase-admin with service account credentials from env
  - Write `backend/src/config/env.ts` validating all required env vars (GOOGLE_APPLICATION_CREDENTIALS, GEMINI_API_KEY, PORT) using zod
  - Write `backend/src/index.ts` setting up Express with helmet, cors, json parsing, route mounting on /api, error handler middleware
  - Write `backend/src/utils/errors.ts` with AppError class (message, statusCode, code)
  - Requirements: 1

- [x] 3. Backend: RBAC middleware
  - Write `backend/src/middlewares/verifyToken.ts` decoding Firebase ID token via firebase-admin, attaching `req.user` (uid, role, email), returning 401 on missing/invalid token
  - Write `backend/src/middlewares/requireRole.ts` returning 403 if `req.user.role` is not in the allowed roles array
  - Write `backend/src/types/express.d.ts` augmenting Express Request with `user: { uid: string; role: Role; email: string }`
  - Requirements: 1, 3

- [x] 4. Frontend: Firebase auth integration and auth store
  - Write `frontend/src/store/authStore.ts` Zustand store with user, firebaseUser, isLoading, isAuthenticated, setUser, clearUser
  - Write `frontend/src/hooks/useAuth.ts` wrapping onAuthStateChanged — on sign-in fetches user Firestore doc from `users/{uid}`, calls setUser; on sign-out calls clearUser
  - Write `frontend/src/pages/LoginPage.tsx` with email/password sign-in form using React Hook Form + Zod, calling signInWithEmailAndPassword, showing toast on error
  - Requirements: 1

- [x] 5. Frontend: Router, ProtectedRoute, layouts
  - Write `frontend/src/components/ProtectedRoute.tsx` reading authStore, redirecting to /login if unauthenticated, redirecting to role-appropriate dashboard if role mismatch
  - Write `frontend/src/app/router.tsx` with all routes as specified in design section 5 (admin/*, teacher/*, student/*, /exam/:testId, /interactive/:testId, fallback)
  - Write `frontend/src/main.tsx` wrapping app in QueryClientProvider, RouterProvider, Toaster
  - Write `frontend/src/app/providers.tsx` composing all providers
  - Write `frontend/src/layouts/AdminLayout.tsx`, `TeacherLayout.tsx`, `StudentLayout.tsx` — each with a sidebar nav, header with notification bell, and Outlet
  - Requirements: 1

- [x] 6. Backend: Auth route
  - Write `backend/src/controllers/auth.controller.ts` with `verifyToken` endpoint that validates token via firebase-admin, fetches user doc from Firestore, returns user profile
  - Write `backend/src/routes/auth.routes.ts`
  - Mount on `/api/auth` in index.ts
  - Requirements: 1

## Sprint 2: Admin Portal — Classes, Subjects, Teachers, Students

- [x] 7. Backend: Class and Subject services + routes
  - Write `backend/src/validators/class.validator.ts` with Zod schemas for createClass (grade 1-20, section 1-10, academicYear YYYY-YYYY pattern) and createSubject (name 1-100, code alphanumeric 1-20, classId)
  - Write `backend/src/services/classService.ts`: `createClass` (checks duplicate grade+section+year, persists with isActive:true and createdAt), `listClasses`, `getClass`
  - Write `backend/src/services/subjectService.ts`: `createSubject` (validates classId exists, checks duplicate code case-insensitively within class, persists with classId), `listSubjectsByClass`, `getSubject`
  - Write `backend/src/controllers/admin.controller.ts` class/subject handlers
  - Write `backend/src/routes/admin.routes.ts` POST/GET /classes, POST/GET /classes/:classId/subjects, protected by requireRole("admin")
  - Requirements: 2

- [x] 8. Backend: Teacher creation service
  - Write `backend/src/utils/passwordGenerator.ts` using crypto.randomBytes generating a password of 12+ chars with at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
  - Write `backend/src/validators/teacher.validator.ts` Zod schema (displayName 1-100, email RFC5321)
  - Write `backend/src/services/userService.ts` `createTeacher`: validates input, calls firebase-admin `auth().createUser({email, password, displayName})`, on Auth success writes Firestore user doc with role:"teacher" and isActive:true; if Firestore write fails deletes the Auth user to avoid partial state; returns generated password once
  - Add teacher routes to admin.routes.ts: POST /teachers, GET /teachers
  - Requirements: 4

- [x] 9. Backend: Teacher allocation (junction) service
  - Write `backend/src/services/junctionService.ts`: `allocateTeacher` (validates teacher/class/subject all exist, attempts to set doc with ID `classId_subjectId` using Firestore set with merge:false — fails if already exists enforcing uniqueness, creates Junction with teacherId/classId/subjectId/assignedAt), `removeAllocation`, `listJunctions`
  - Add routes to admin.routes.ts: POST /allocate, DELETE /allocate/:junctionId
  - Requirements: 3

- [x] 10. Backend: Student creation service
  - Write `backend/src/utils/studentIdGenerator.ts`: `generateStudentId(academicYear, classCode, rollNo)` → `[AcademicYear]_[ClassCode]_[RollNo]` with 2-digit zero-padded rollNo
  - Write `backend/src/validators/student.validator.ts` Zod schema (displayName 1-100, classId, academicYear YYYY-YYYY, rollNo positive integer)
  - Add `createStudent` to `userService.ts`: validates all fields, verifies class exists, generates studentId, checks no existing user has same studentId in same class/year (conflict error), creates Firebase Auth account, persists user doc with role:"student"/isActive:true/classId/rollNo/academicYear/level:"beginner"
  - Add routes: POST /students, GET /students
  - Requirements: 5

- [x] 11. Frontend: Admin Portal — Classes & Subjects pages
  - Write `frontend/src/services/api.ts` base fetch wrapper that injects Firebase ID token as Authorization header
  - Write `frontend/src/services/adminApi.ts` with typed functions for all admin endpoints
  - Write `frontend/src/pages/admin/ClassesPage.tsx` — lists classes in a table, "Create Class" button opens Dialog with form (grade, section, academicYear), uses React Query + mutation, shows toast on success/error
  - Write `frontend/src/pages/admin/SubjectsPage.tsx` — lists subjects for selected class, "Create Subject" form (name, code)
  - Write `frontend/src/pages/admin/AdminDashboard.tsx` with summary cards
  - Requirements: 2

- [x] 12. Frontend: Admin Portal — Teachers & Allocation pages
  - Write `frontend/src/pages/admin/TeachersPage.tsx` — lists teachers in table, "Add Teacher" button opens form (displayName, email); on success shows one-time credentials modal (dismissible, displays email + generated password with "Copy" button, warns credentials not stored)
  - Write `frontend/src/pages/admin/AllocatePage.tsx` — three-step form: select class, select subject, select teacher; validates no existing junction; shows current allocations table with remove action
  - Requirements: 3, 4

- [x] 13. Frontend: Admin Portal — Students page
  - Write `frontend/src/pages/admin/StudentsPage.tsx` — lists students with filter by class, "Register Student" form (displayName, classId, academicYear, rollNo); displays auto-generated studentId on success
  - Requirements: 5

## Sprint 3: Teacher Portal — Textbooks & AI Pipeline

- [x] 14. Backend: Textbook upload and AI pipeline trigger
  - Add `pdf-parse` and `@google/generative-ai` (or use fetch) to backend dependencies
  - Write `backend/src/services/textbookService.ts`: `initiateUpload` — validates file is PDF ≤50MB (checked from content-length header and MIME), stores file to Firebase Storage at `textbooks/{textbookId}/original.pdf` via admin SDK, creates Firestore textbook doc with status:"processing", returns textbookId
  - The route calls `process.nextTick(() => runAIPipeline(textbookId))` immediately after responding
  - Write `backend/src/jobs/aiPipeline.ts` implementing full pipeline: download PDF from Storage, extract text with pdf-parse, build Gemini prompt, call Gemini API with structured output schema, parse JSON response, write chapters/concepts subcollections, update status to "ready"; on error: update status to "failed", write failureReason, call notificationService.notifyTeacherPipelineFailed
  - Write `backend/src/services/textbookService.ts` `reprocessTextbook` — validates current status is "failed", resets to "processing", re-enqueues pipeline
  - Add routes: POST /teacher/textbooks (multipart), GET /teacher/textbooks, GET /teacher/textbooks/:id/chapters, POST /teacher/textbooks/:id/reprocess
  - Requirements: 6

- [x] 15. Frontend: Teacher Portal — Textbooks page
  - Write `frontend/src/services/teacherApi.ts` with typed functions for all teacher endpoints
  - Write `frontend/src/pages/teacher/TextbooksPage.tsx` — lists textbooks with status badges (processing spinner, ready green, failed red); "Upload Textbook" button shows form with file picker (PDF only, max 50MB client-side validation), textbook title, class+subject selector; while status is "processing" shows animated progress indicator; failed textbooks show "Retry" button
  - Write `frontend/src/pages/teacher/TextbookDetailPage.tsx` — shows chapter/concept tree, expandable concept cards with notes, video links, question bank count
  - Requirements: 6

## Sprint 4: Test Template Engine

- [x] 16. Backend: Template creation and question paper compilation
  - Write `backend/src/validators/template.validator.ts` Zod schema enforcing all field bounds (title 1-200, timeLimitMinutes 1-300, questionCount 1-200, each distribution value 0-100, sum must equal 100, at least one allowedFormat)
  - Write `backend/src/services/templateService.ts`: `createTemplate` (validates, persists under test_templates with teacherId and createdAt), `listTemplates`
  - Write `backend/src/services/questionReformatter.ts` with `reformatToTrueFalse`, `reformatToFillBlank`, `reformat` as specified in design section 9; throws ReformatError for unsupported pairs
  - Write `backend/src/services/questionPaperCompiler.ts` implementing full compilation as specified in design section 9 (per-tier sampling, shortfall detection, Fisher-Yates shuffle when jumbleQuestions:true, reformatting, totalPoints calculation, Firestore persist)
  - Add routes: POST/GET /teacher/templates, POST/GET /teacher/question-papers
  - Requirements: 7, 8

- [x] 17. Frontend: Template builder and question paper UI
  - Write `frontend/src/pages/teacher/TemplatesPage.tsx` — lists templates; "New Template" button opens a multi-step form: step 1 title/timeLimit/questionCount/shuffle, step 2 difficulty distribution with 4 sliders (auto-ensures sum=100, shows live validation error if not), step 3 allowed formats checkboxes; save calls API
  - Add "Create Test" flow to `TextbookDetailPage.tsx` — clicking "Create Test" on a concept/chapter opens a modal: step 1 select existing template or create new, step 2 confirm compilation; calls POST /teacher/question-papers and then immediately opens test publish form
  - Requirements: 7, 8

- [x] 18. Backend: Test publication and republishing
  - Write `backend/src/validators/test.validator.ts` Zod schema (paperId, type enum, releasedAt, optional dueDate must be after releasedAt)
  - Write `backend/src/services/testService.ts`: `publishTest` (validates paper exists, type valid, dueDate check, creates test doc with isRepublished:false/showResults:false/attemptCount:0, calls notificationService.notifyStudentsOfTest), `closeTest` (sets isClosed:true), `republishTest` (validates test is closed or dueDate passed, creates new test doc with isRepublished:true referencing same paperId)
  - Add routes: POST/GET /teacher/tests, POST /teacher/tests/:id/close, POST /teacher/tests/:id/republish
  - Requirements: 9

- [x] 19. Frontend: Teacher tests management page
  - Write `frontend/src/pages/teacher/TeacherTestsPage.tsx` — table of tests with type badge, status, dates; "Publish" button opens form (title, type dropdown, releasedAt datetime picker, optional dueDate datetime picker); "Close" action button; "Republish" button on closed/overdue tests; routing to Normal vs Interactive console confirmed by isRepublished flag
  - Requirements: 9

## Sprint 5: Student Portal & Exam Consoles

- [x] 20. Backend: Student test and submission endpoints
  - Write `backend/src/services/testService.ts` `getStudentTests` — queries tests where classId matches student's classId, releasedAt ≤ now, ordered by releasedAt desc
  - Write `backend/src/validators/submission.validator.ts` Zod schema for submit payload (array of {questionId, selectedAnswer, timeSpentMs})
  - Write `backend/src/services/submissionService.ts` `submitTest` — grades each answer against question.correctAnswer, calculates earnedPoints, calls profilingEngine.calculateAccuracy/calculateComplexity/determineLevel, calls profilingEngine.persistSubmissionWithLevel (atomic write with 3-retry), triggers analyticsService.calculateConceptHealth for affected concepts, returns submission result
  - Add routes: GET /student/tests, GET /student/tests/:id, POST /student/tests/:id/submit, GET /student/submissions
  - Requirements: 12

- [x] 21. Frontend: Student dashboard and tests list
  - Write `frontend/src/services/studentApi.ts`
  - Write `frontend/src/pages/student/StudentDashboard.tsx` — cards showing upcoming tests count, overdue count, current level badge; notification bell with unread count
  - Write `frontend/src/pages/student/StudentTestsPage.tsx` — tabs: Upcoming, In Progress, Submitted, Overdue; each test card shows title, type, subject, dueDate countdown, "Start" button; on click checks isRepublished and navigates to /exam/:testId or /interactive/:testId
  - Requirements: 9, 14

- [x] 22. Frontend: Zustand exam store and core exam hooks
  - Write `frontend/src/store/examStore.ts` with full state as specified in design section 6 (questions, answers, questionStatus, currentIndex, timeRemainingMs, isSubmitted, all actions)
  - Write `frontend/src/hooks/useExamSession.ts` — loads test+paper via React Query, initializes examStore, runs setInterval ticking every 1s, auto-submits when timer hits 0, handles beforeunload warning
  - Write `frontend/src/hooks/useFullscreen.ts` — requestFullscreen on mount, fullscreenchange listener showing warning dialog on exit without ending session
  - Write `frontend/src/utils/formatTimer.ts` converting ms to MM:SS string
  - Requirements: 10

- [x] 23. Frontend: Question rendering components
  - Write `frontend/src/components/exam/QuestionRenderer.tsx` — switch on question.type rendering appropriate input: MCQ (radio group), TrueFalse (two radio buttons), FillBlank (text input), Matching (drag-and-drop or select pairs), Descriptive (textarea), Numerical (number input), Passage (passage text above + sub-questions)
  - Write `frontend/src/components/exam/QuestionPalette.tsx` — grid of color-coded boxes as specified (gray/yellow/green/blue), accepts statuses and onNavigate callback, floating panel
  - Write `frontend/src/components/exam/TimerDisplay.tsx` — shows MM:SS, turns red when < 60s
  - Requirements: 10

- [x] 24. Frontend: Normal Examination Console
  - Write `frontend/src/pages/NormalConsole.tsx` composing useExamSession + useFullscreen + QuestionPalette + QuestionRenderer + TimerDisplay; top bar with test title and timer; right sidebar with palette; bottom nav with Prev/Next/Mark for Review buttons; Submit button with confirmation dialog; fullscreen-exit warning overlay; submission confirmation screen on completion
  - Requirements: 10

- [x] 25. Frontend: Interactive Examination Console
  - Write `frontend/src/hooks/useAudioCues.ts` using Web Audio API (AudioContext) for playSuccess (ascending tone) and playError (descending buzz), with silent try/catch fallback
  - Write `frontend/src/hooks/useInteractiveSession.ts` managing per-question state machine (unanswered → incorrect → correct/exhausted), firstAttemptCorrect tracking, auto-advance setTimeout, final question submission
  - Write `frontend/src/pages/InteractiveConsole.tsx` — single question view with Framer Motion error (red border + shake) and success (green border + scale) variants; retry prompt on incorrect; correct answer reveal on exhaustion; results summary screen on completion (total, firstAttemptCorrect count, score %)
  - Requirements: 11

## Sprint 6: Analytics, Notifications, Profiling Engine

- [x] 26. Backend: Profiling engine
  - Write `backend/src/services/profilingEngine.ts` implementing calculateAccuracy (division-by-zero guard), calculateComplexity (max difficulty rank of correct answers, 0 if none), determineLevel (advanced/intermediate/beginner rules), persistSubmissionWithLevel (Firestore transaction with 3-retry loop) as specified in design section 10
  - Requirements: 12

- [x] 27. Backend: Notification service and overdue checker
  - Write `backend/src/services/notificationService.ts`: `notifyStudentsOfTest` (batch-writes notification docs for all students in class), `notifyTeacherReteach` (writes single notification with class/subject/concept metadata), `notifyPipelineFailed` (writes notification to teacher), `notifyStudentOverdue` (writes overdue notification)
  - Write overdue scheduler in `backend/src/index.ts` using setInterval every 5 minutes: queries tests where dueDate < now and isClosed:false, for each test queries students who haven't submitted, calls notifyStudentOverdue
  - Write `backend/src/routes/notification.routes.ts` and controller: GET /notifications (filtered by recipientId from token), PATCH /notifications/:id/read
  - Requirements: 14

- [x] 28. Frontend: Notification system
  - Write `frontend/src/store/notificationStore.ts` Zustand store (notifications array, unreadCount, setNotifications, markRead)
  - Write `frontend/src/hooks/useNotifications.ts` setting up Firestore onSnapshot listener on notifications where recipientId=uid, ordered by createdAt desc, limit 50; updates store; cleans up on unmount
  - Add notification bell to all role layouts: shows unread count badge, dropdown with notification list, "Mark as read" on click
  - Requirements: 14

- [x] 29. Backend: Analytics service and admin analytics routes
  - Write `backend/src/services/analyticsService.ts`: `getClassAnalytics` (aggregates all submissions by classId, calculates class-wide and subject-wide averages), `getStudentTestMatrix` (for each published test: each student's score %, attempt status, level), `calculateConceptHealth` (counts enrolled students, counts students with ≥60% on concept questions, returns health %; flags if <50%)
  - Write `backend/src/routes/analytics.routes.ts` and controllers: GET /admin/analytics/classes, GET /admin/analytics/concepts/:conceptId/health, POST /admin/analytics/concepts/:conceptId/reteach (calls notifyTeacherReteach, returns confirmation)
  - Requirements: 13

- [x] 30. Frontend: Admin Analytics page
  - Write `frontend/src/services/analyticsApi.ts`
  - Write `frontend/src/pages/admin/AnalyticsPage.tsx` — class selector, class-wide average score card, subject-wide averages table; student matrix table (name, score %, attempt status badge, level badge) for selected test; Concept Health section with list of concepts flagged in red (<50% health) with "Notify Teacher to Re-teach" button that shows confirmation dialog before calling API
  - Requirements: 13

## Sprint 7: Polish and Integration

- [x] 31. Frontend: Shared UI components
  - Write reusable shadcn-style components in `frontend/src/components/ui/`: Button (variants: default/outline/ghost/destructive), Input, Label, Select, Dialog, Badge (variants for level/status/type), Card, Table, Tabs, Progress, Spinner, Toast wrapper
  - These components are used by all pages; implement before or alongside pages that need them
  - Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14

- [x] 32. Backend: Error handling and validation middleware
  - Write `backend/src/middlewares/errorHandler.ts` — catches AppError instances and returns structured JSON {error: message, code}, catches Zod validation errors returning 400 with field-level messages, catches unknown errors returning 500
  - Add error handler as last middleware in index.ts
  - Ensure all route controllers call next(error) instead of inline error responses
  - Requirements: 1, 2, 3, 4, 5, 6, 8, 9, 12

- [x] 33. Frontend: index.html and global CSS
  - Write `frontend/index.html` with correct title "OpenCode LMS", meta charset/viewport, root div
  - Write global CSS (imported in main.tsx) with CSS variables for Tailwind design tokens (--background, --foreground, --primary, --border, --radius etc.) in both light and dark modes
  - Requirements: 1

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2, 31, 33] },
    { "wave": 2, "tasks": [3, 4, 32] },
    { "wave": 3, "tasks": [5, 6, 7, 8, 9, 10] },
    { "wave": 4, "tasks": [11, 12, 13, 14] },
    { "wave": 5, "tasks": [15, 16] },
    { "wave": 6, "tasks": [17, 18, 22, 23, 26, 27] },
    { "wave": 7, "tasks": [19, 20, 24, 25, 28] },
    { "wave": 8, "tasks": [21, 29] },
    { "wave": 9, "tasks": [30] }
  ]
}
```

Tasks 1, 2, 31, and 33 are foundational — they must be completed first. Tasks within each wave can be worked on concurrently.

## Notes

- **Environment variables**: Backend requires `GOOGLE_APPLICATION_CREDENTIALS` (path to Firebase service account JSON) and `GEMINI_API_KEY`. Create `backend/.env` before running dev.
- **Firebase Admin**: The `config/firebase.ts` module must be imported before any Firestore/Auth usage in backend services.
- **AI Pipeline**: The Gemini prompt must request structured JSON output. Use `response_mime_type: "application/json"` in the Gemini API request to enforce structured output.
- **pdf-parse**: Must be added to `backend/package.json` before task 14. Version pin: `"pdf-parse": "^1.1.1"`.
- **Firestore uniqueness for junctions**: Use `db.doc('teacher-class-subject/classId_subjectId').create(data)` which throws if document already exists — do NOT use `set()` for this operation.
- **Password security**: Generated passwords must never be logged. The one-time modal in the frontend is the sole delivery mechanism.
- **Exam console routing**: The student clicks "Start" → frontend fetches GET /student/tests/:testId → checks `isRepublished` → navigates to `/exam/:testId` or `/interactive/:testId`.
- **Atomic submission**: `profilingEngine.persistSubmissionWithLevel` uses a Firestore transaction. If all 3 retries fail, the submission record is NOT discarded — the error is surfaced to the client and the student is asked to retry.
- **Concept Health trigger**: Called asynchronously (non-blocking) after `submitTest` returns — do not await it in the HTTP response path.
- **Notification real-time**: Frontend uses Firestore `onSnapshot` directly (not the backend API) for live notification updates. The backend API (`GET /notifications`) is used only for initial server-side SSR or non-realtime contexts.
- **Task 31 (UI components)**: Can be started immediately and developed incrementally alongside sprint tasks — each page task assumes these components exist.
