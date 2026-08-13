# Comprehensive Test List — School LMS

## Authentication (`/auth/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 1 | Register new user with valid email/password/name/role | API | HIGH |
| 2 | Register with duplicate email → 409 | API | HIGH |
| 3 | Register with missing fields → 400 | API | MEDIUM |
| 4 | Login with valid credentials → JWT tokens | API | HIGH |
| 5 | Login with wrong password → 401 | API | HIGH |
| 6 | Login with inactive account → 403 | API | MEDIUM |
| 7 | Forgot-password sends reset email (rate-limited) | API | HIGH |
| 8 | Admin reset-password for any user (scoped to school) | API | CRITICAL |
| 9 | Admin reset-password for cross-school user → 403 | API | HIGH |
| 10 | Change own password with correct current password | API | HIGH |
| 11 | Change own password with wrong current → 401 | API | HIGH |
| 12 | Get own profile | API | MEDIUM |
| 13 | Verify token (valid, expired, malformed) | API | HIGH |
| 14 | Refresh token rotation (old refresh fails after use) | API | HIGH |
| 15 | MFA setup then verify with valid TOTP | API | HIGH |
| 16 | MFA verify with invalid TOTP → 401 | API | HIGH |

## User Management (`/auth/users/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 17 | Admin lists users with pagination/filter/role | API | HIGH |
| 18 | Admin creates user with role/class/school | API | HIGH |
| 19 | Teacher gets user by ID (school-scoped) | API | HIGH |
| 20 | Teacher gets user from different school → 403 | API | HIGH |
| 21 | Admin updates user role | API | HIGH |
| 22 | Admin toggles active/inactive | API | MEDIUM |
| 23 | User pings active → last_active updated | API | LOW |
| 24 | Delete user cascades properly | API | MEDIUM |

## Fee Management (`/fee/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 25 | Admin creates fee schedule with amounts/dates | API | HIGH |
| 26 | Admin lists schedules filtered by academic year | API | MEDIUM |
| 27 | Admin records payment (idempotency key prevents double-charge) | API | CRITICAL |
| 28 | Student payment history (scoped, not another student's) | API | HIGH |
| 29 | Outstanding report aggregates correctly | API | HIGH |
| 30 | Receipt PDF download returns 200 | API | MEDIUM |
| 31 | Receipt PDF download with invalid ID → 404 | API | MEDIUM |

## Grade Management (`/grades/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 32 | Teacher gets gradebook for own class | API | HIGH |
| 33 | Student/parent gets own grades | API | HIGH |
| 34 | Student gets another student's grades → 403 | API | CRITICAL |
| 35 | Update single grade with valid totalPoints | API | HIGH |
| 36 | Update single grade with extra fields → 400 | API | HIGH |
| 37 | Bulk update grades for course | API | HIGH |
| 38 | Generate report card PDF | API | MEDIUM |

## Attendance (`/attendance/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 39 | Teacher marks attendance for own class | API | HIGH |
| 40 | Teacher marks attendance for other class → 403 | API | HIGH |
| 41 | Get class attendance with dates | API | MEDIUM |
| 42 | Parent gets own child's attendance | API | HIGH |
| 43 | Parent gets other student's attendance → 403 | API | CRITICAL |
| 44 | Export CSV (no formula injection) | API | HIGH |
| 45 | Attendance report with stats | API | MEDIUM |

## Course Management (`/courses/*`, `/lessons/*`, `/assignments/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 46 | Teacher creates course for own class | API | HIGH |
| 47 | List courses with filters | API | MEDIUM |
| 48 | Student enrolls in course | API | HIGH |
| 49 | Student unenrolls | API | MEDIUM |
| 50 | Create lesson, reorder, mark complete | API | HIGH |
| 51 | Create assignment, submit, grade | API | HIGH |
| 52 | AI-grade single submission | API | LOW |
| 53 | AI-grade bulk (max concurrent) | API | LOW |

## Exams (`/exams/*`, `/exams-v2/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 54 | Teacher creates exam with questions | API | HIGH |
| 55 | Student starts attempt (attempt_count increments) | API | HIGH |
| 56 | Student exceeds max attempts → 400 | API | HIGH |
| 57 | Submit exam with all answers | API | HIGH |
| 58 | Submit exam with missing required answers → 400 | API | MEDIUM |
| 59 | Teacher grades attempt (validated fields only) | API | HIGH |
| 60 | Teacher grades attempt with extra fields → 400 | API | HIGH |
| 61 | Release grades (gradesReleased: true required) | API | HIGH |
| 62 | Release grades without boolean → 400 | API | MEDIUM |
| 63 | Student sees own results (only if released) | API | HIGH |
| 64 | Attempt auto-grade calculates correct score | API | HIGH |
| 65 | Proctoring event logging | API | LOW |

## Quizzes (`/quizzes/*`, `/quizzes-v2/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 66 | Teacher creates quiz | API | HIGH |
| 67 | Student starts attempt | API | HIGH |
| 68 | Submit auto-graded quiz | API | HIGH |
| 69 | Release grades | API | HIGH |
| 70 | Get results (before release → masked) | API | MEDIUM |

## Gamification (`/gamification/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 71 | Get own XP/coins/badges | API | LOW |
| 72 | Award XP to student (teacher only) | API | MEDIUM |
| 73 | Leaderboard per class | API | LOW |
| 74 | Daily/weekly/monthly challenge lifecycle | API | LOW |
| 75 | Streak tracking | API | LOW |

## Question Bank & Papers (`/question-bank/*`, `/question-papers/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 76 | Teacher creates question (MCQ, short, long, coding) | API | HIGH |
| 77 | Bulk import questions | API | MEDIUM |
| 78 | List with difficulty/subject/tag filter | API | MEDIUM |
| 79 | Create question paper from bank | API | HIGH |
| 80 | Compile paper from template | API | MEDIUM |

## Textbooks (`/textbooks/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 81 | Upload textbook PDF (idempotent) | API | HIGH |
| 82 | Upload invalid file type → 400 | API | MEDIUM |
| 83 | Get chapters and concepts | API | MEDIUM |
| 84 | Reprocess textbook | API | LOW |

## Messaging (`/messages/*`, `/notifications/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 85 | Send message between users (same school) | API | HIGH |
| 86 | Send message across schools → 403 | API | MEDIUM |
| 87 | Mark message read | API | LOW |
| 88 | List notifications (paginated, read/unread filter) | API | MEDIUM |
| 89 | Mark notification read | API | LOW |

## Parent Features (`/parent/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 90 | Parent gets linked children | API | HIGH |
| 91 | Parent gets dashboard for child | API | HIGH |
| 92 | Parent access to unrelated child → 403 | API | CRITICAL |

## HR & Transport (`/staff/*`, `/leaves/*`, `/transport/*`, `/inventory/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 93 | Admin creates staff record | API | MEDIUM |
| 94 | Staff requests leave (auto workflow) | API | MEDIUM |
| 95 | Admin updates leave status | API | MEDIUM |
| 96 | Transport route CRUD | API | MEDIUM |
| 97 | Assign student to transport route | API | MEDIUM |
| 98 | Mark transport attendance | API | LOW |
| 99 | Inventory item CRUD with categories/suppliers | API | MEDIUM |
| 100 | Log inventory usage | API | LOW |

## Reports & Analytics (`/analytics/*`, `/school-analytics/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 101 | Student dashboard (own data only) | API | MEDIUM |
| 102 | Teacher dashboard (own class only) | API | MEDIUM |
| 103 | Admin dashboard (school-wide) | API | MEDIUM |
| 104 | Grade comparison between classes | API | LOW |
| 105 | Performance trends over time | API | LOW |

## Concept Progress & Whiteboard (`/concept-progress/*`, `/whiteboard/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 106 | Teacher toggles concept completion for student | API | MEDIUM |
| 107 | Save whiteboard data | API | LOW |
| 108 | Retrieve whiteboard (scoped) | API | LOW |

## Coding (`/coding/*`, `/coding-challenges/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 109 | Create coding project | API | MEDIUM |
| 110 | Execute code in sandbox (no shell injection) | API | HIGH |
| 111 | Stream project collaboration | API | LOW |
| 112 | Get coding challenges (public) | API | LOW |

## Unified Test Engine (`/unified-test-engine/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 113 | Create test with mixed question types | API | HIGH |
| 114 | Preview test | API | MEDIUM |
| 115 | Student attempt lifecycle | API | HIGH |
| 116 | Release results | API | HIGH |

## GDPR (`/gdpr/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 117 | Export own data | API | HIGH |
| 118 | Request account deletion | API | HIGH |
| 119 | Admin exports another user's data (school-scoped) | API | MEDIUM |

## LTI (`/lti/*`)

| # | Test | Type | Priority |
|---|------|------|----------|
| 120 | LTI launch with valid params | API | MEDIUM |
| 121 | LTI launch with invalid signature → 401 | API | MEDIUM |

---

## Frontend E2E Tests

| # | Test | Page | Priority |
|---|------|------|----------|
| FE-1 | Login page renders with email/password fields + CTA | /login | HIGH |
| FE-2 | Login with valid creds → redirect to dashboard | /login | HIGH |
| FE-3 | Login with invalid creds → error toast | /login | HIGH |
| FE-4 | Register page renders with all fields | /register | HIGH |
| FE-5 | Forgot-password page submits email | /forgot-password | HIGH |
| FE-6 | Landing page `/` redirects to `/login` | / | HIGH |
| FE-7 | Notifications page renders with notification list (public) | /notifications | MEDIUM |
| FE-8 | Student dashboard shows courses, grades, attendance | /student/dashboard | HIGH |
| FE-9 | Teacher dashboard shows class list | /teacher/dashboard | HIGH |
| FE-10 | Admin dashboard shows school stats | /admin | HIGH |
| FE-11 | Gradebook page shows data for teacher | /grades | HIGH |
| FE-12 | Course detail page shows lessons + assignments | /courses/:id | HIGH |
| FE-13 | Exam attempt page shows questions + timer | /exams/:id/attempt | HIGH |
| FE-14 | Profile page shows user info, allows edit | /profile | MEDIUM |
| FE-15 | Dark mode toggle persists | any page | LOW |
| FE-16 | Responsive layout at mobile breakpoint (375px) | all | MEDIUM |
| FE-17 | 404 page for unknown route | /nonexistent | MEDIUM |

## DB Integrity Tests

| # | Test | Priority |
|---|------|----------|
| DB-1 | All foreign keys reference valid rows (no orphans) | HIGH |
| DB-2 | RLS policies block cross-school access on every table | CRITICAL |
| DB-3 | `users.class_ids` stays in sync when enrollment changes | HIGH |
| DB-4 | `exam_attempts.attempt_count` matches actual row count | MEDIUM |
| DB-5 | Attendance dates are valid DATE type (no TEXT) | MEDIUM |
| DB-6 | No duplicate email in users table | HIGH |
| DB-7 | All triggers fire correctly (test with INSERT/UPDATE/DELETE) | HIGH |
| DB-8 | Processing_jobs and raw_pages have school_id populated | HIGH |

## Mobile E2E Tests

| # | Test | App | Priority |
|---|------|-----|----------|
| M-1 | Teacher login → dashboard → class list | teacher | HIGH |
| M-2 | Teacher grades exam attempt (validated score input) | teacher | HIGH |
| M-3 | Teacher grades with invalid score → error | teacher | HIGH |
| M-4 | Teacher creates assessment (real API call) | teacher | HIGH |
| M-5 | Student login → view courses → start exam | student | HIGH |
| M-6 | Student submits exam → see waiting screen | student | HIGH |
| M-7 | Parent login → view child dashboard | parent | HIGH |
| M-8 | Offline queue: submit while offline → replays on reconnect | all | MEDIUM |
| M-9 | Device token registered on login | all | MEDIUM |
| M-10 | Push notification received for grade release | all | LOW |

## Performance Tests

| # | Test | Priority |
|---|------|----------|
| P-1 | Login API responds <2s at 100 req/s | MEDIUM |
| P-2 | Gradebook loads <3s for 500-student class | MEDIUM |
| P-3 | Report generation completes <5s | LOW |
| P-4 | Frontend page loads <3s on 3G | LOW |

## Security Tests

| # | Test | Priority |
|---|------|----------|
| S-1 | JWT token missing → 401 on all authenticated endpoints | CRITICAL |
| S-2 | Expired JWT → 401 | CRITICAL |
| S-3 | Cross-school user cannot access another school's data | CRITICAL |
| S-4 | Student cannot access teacher endpoints (role check) | CRITICAL |
| S-5 | No SQL injection in any route with string params | HIGH |
| S-6 | No mass assignment via Zod passthrough (92+ schemas) | HIGH |
| S-7 | CSV export has no formula injection | HIGH |
| S-8 | Code execution sandbox blocks unsafe operations | HIGH |
| S-9 | Password reset token is single-use + time-limited | HIGH |
| S-10 | Receipt IDs are not sequential/enumerable | MEDIUM |
