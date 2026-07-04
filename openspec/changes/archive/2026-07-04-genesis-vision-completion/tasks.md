## 1. Shared Mobile Foundation

- [x] 1.1 Create `lms/mobile/shared/` package with shared types, API client, and auth utilities extracted from existing `lms/mobile/`
- [x] 1.2 Remove old skeleton `lms/mobile/` directory
- [x] 1.3 Set up EAS Build config and credentials for three Expo projects

## 2. ERP Backend — Transport Module

- [x] 2.1 Create SQL migration `007_erp_transport.sql` with tables: `transport_routes`, `transport_stops`, `transport_assignments`, `transport_attendance`
- [x] 2.2 Create `transport.service.ts` with CRUD for routes, stops, assignments, attendance
- [x] 2.3 Create `transport.routes.ts` with Zod-validated endpoints mounted at `/transport`
- [x] 2.4 Create `AdminTransportPage.tsx` and `AdminTransportDashboard.tsx` frontend pages

## 3. ERP Backend — Inventory Module

- [x] 3.1 Create SQL migration `008_erp_inventory.sql` with tables: `inventory_items`, `inventory_categories`, `inventory_usage_log`, `suppliers`
- [x] 3.2 Create `inventory.service.ts` with CRUD for items, categories, usage, suppliers
- [x] 3.3 Create `inventory.routes.ts` with Zod-validated endpoints mounted at `/inventory`
- [x] 3.4 Create `AdminInventoryPage.tsx` frontend page

## 4. ERP Backend — HR Module

- [x] 4.1 Create SQL migration `009_erp_hr.sql` with tables: `staff_records`, `staff_attendance`, `leave_requests`, `salary_config`, `payroll_runs`
- [x] 4.2 Create `staff.service.ts`, `leave.service.ts`, `payroll.service.ts`
- [x] 4.3 Create `staff.routes.ts`, `leave.routes.ts`, `payroll.routes.ts` with Zod validation
- [x] 4.4 Create `AdminStaffPage.tsx`, `AdminLeavePage.tsx`, `AdminPayrollPage.tsx` frontend pages

## 5. i18n Infrastructure and Multilingual Support

- [x] 5.1 Create `lms/frontend/src/i18n/` directory with `en.ts`, `te.ts`, `hi.ts`, `ta.ts`, `kn.ts` translation files
- [x] 5.2 Create `useTranslation` hook that reads `user.language_preference` from auth store
- [x] 5.3 Wrap all UI labels in `<T>` component or `t()` function across existing pages
- [x] 5.4 Extend AI Tutor `language` column support to hi/ta/kn in `ai-tutor.service.ts`

## 6. Search Engine

- [x] 6.1 Create `lms/search/` service with `package.json` and Elasticsearch client
- [x] 6.2 Add Elasticsearch container to `lms/docker-compose.yml`
- [x] 6.3 Implement indexing logic for curriculum, textbooks, and concepts via Supabase webhook or polling
- [x] 6.4 Create `GET /search?q=:query` endpoint that returns grouped results
- [x] 6.5 Add search bar component to frontend header and wire to search API

## 7. LMS Integration — Google Classroom

- [x] 7.1 Create `lms/integrations/google-classroom/` module with Google API client setup
- [x] 7.2 Implement roster sync (fetch courses, enrollments, create/map users)
- [x] 7.3 Implement grade push from assignment/quiz grading to Google Classroom
- [x] 7.4 Add admin settings UI for Google Classroom connection

## 8. LMS Integration — Moodle LTI 1.3

- [x] 8.1 Create `lms/integrations/moodle/` module with LTI 1.3 library
- [x] 8.2 Implement LTI launch endpoint (`POST /lti/launch`) with key validation and auth
- [x] 8.3 Implement grade passback endpoint (`POST /lti/grade`) for Assignment and Grade Service
- [x] 8.4 Add admin settings UI for LTI registration details

## 9. Mobile App — Student

- [x] 9.1 Initialize `lms/mobile-student/` Expo project with navigation (bottom tabs: Dashboard, Subjects, AI Tutor, Gamification, Profile)
- [x] 9.2 Port StudentDashboardPage (mastery, tasks, upcoming exams, recent activity)
- [x] 9.3 Port SubjectsPage → SubjectDetailPage → ChapterPage → LessonViewPage
- [x] 9.4 Port AdaptiveQuizPage and QuizAttemptPage
- [x] 9.5 Port StudentAITutorPage with voice I/O
- [x] 9.6 Port StudentGamificationPage and StudentLeaderboardPage
- [x] 9.7 Port StudentVirtualLabsPage and virtual lab detail pages
- [x] 9.8 Port StudentCodingPage and StudentCodingEditorPage
- [x] 9.9 Port K2 pre-primary pages (dashboard, tracing, phonics, stories, flashcards)
- [x] 9.10 Port StudentProfilePage and StudentOCRPage
- [x] 9.11 Add offline caching with AsyncStorage for downloaded content

## 10. Mobile App — Teacher

- [x] 10.1 Initialize `lms/mobile-teacher/` Expo project (bottom tabs: Dashboard, Classes, Content, Profile)
- [x] 10.2 Port TeacherDashboardPage (class performance, pending grading)
- [x] 10.3 Port TeacherAttendancePage with roster checkboxes
- [x] 10.4 Port TeacherAssessmentCreatePage
- [x] 10.5 Port TeacherExamCorrectionPage with AI grading review
- [x] 10.6 Port TeacherOCRPage with camera capture
- [x] 10.7 Port TeacherAnalyticsPage
- [x] 10.8 Port TeacherProfilePage and TeacherTextbooksPage

## 11. Mobile App — Parent

- [x] 11.1 Initialize `lms/mobile-parent/` Expo project (bottom tabs: Dashboard, Children, Reports, Profile)
- [x] 11.2 Port ParentDashboardPage and ParentChildrenPage
- [x] 11.3 Port ParentChildDetailPage (mastery, attendance, grades)
- [x] 11.4 Port ParentReportsPage with PDF report download

## 12. Performance CI

- [x] 12.1 Add Lighthouse CI GitHub Action workflow
- [x] 12.2 Set performance budgets (LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms)
- [x] 12.3 Add Core Web Vitals monitoring with Lighthouse report artifacts
