## 1. Sprint 1: Database Schema Fixes

- [x] 1.1 Create meta-migration that creates tables referenced by existing migrations (lessons, assignments, quizzes, exams as physical tables)
- [x] 1.2 Fix migration 011: remove indexes on non-existent `nosql_docs` table, target correct tables
- [x] 1.3 Fix migration 001: remove `ALTER TABLE` on view-backed tables (or create physical tables first)
- [x] 1.4 Add FK constraints on `concept_releases` (class_id, textbook_id, chapter_id, concept_id, teacher_id)
- [x] 1.5 Add FK constraints on all junction tables (student_class_enrollments, class_teachers, class_subjects, teacher_class_subject_assignments, timetable)
- [x] 1.6 Add FK constraints on typed tables (textbooks.subject_id, textbooks.class_id, notifications.userId, subjects.classId, subjects.teacherId)
- [x] 1.7 Add `UNIQUE(email)` constraint on users table
- [x] 1.8 Add `UNIQUE(studentId)` constraint on users table (if students.studentId is used as identifier)
- [x] 1.9 Add RLS policies to all concept tables (replace `FOR SELECT USING (true)` with school-scoped policies)
- [x] 1.10 Add RLS policies to all 20+ tables missing them (fee_structures, fee_payments, notice_board, transport_*, inventory_*, staff_*, curriculum_*, etc.)
- [x] 1.11 Add RLS to junction tables (student_class_enrollments, class_teachers, class_subjects, teacher_class_subject_assignments)
- [x] 1.12 Revoke `EXECUTE ON FUNCTION set_tutorial_seen() FROM anon`, grant to authenticated only
- [x] 1.13 Add indexes on all FKs, school_id, status, created_at, updated_at across all tables
- [x] 1.14 Add CHECK constraints on TEXT status/type/difficulty fields (concept_questions.type, concept_questions.difficulty)
- [x] 1.15 Remove redundant `class_ids TEXT[]` and `class_id TEXT` from users (mark deprecated, zero out)
- [x] 1.16 Add unique partial indexes for business rules (one active primary teacher per class, one enrollment per student per year)

## 2. Sprint 2: Backend Business Logic & Firestore Removal

- [x] 2.1 Fix attendance service: add duplicate-entry guard in `markAttendance`
- [x] 2.2 Fix attendance routes: add school-isolation and class-access middleware
- [x] 2.3 Fix timetable service: add teacher double-booking check in `createTimetableEntry`
- [x] 2.4 Fix timetable service: wrap `saveTimetableDay` delete+insert in atomic transaction
- [x] 2.5 Fix timetable service: fix `period: 0` falsy guard (use `!== undefined`)
- [x] 2.6 Fix fee service: add overpayment prevention in `recordPayment`
- [x] 2.7 Fix fee service: include `classId` in `createFeeSchedule` insert
- [x] 2.8 Fix fee service: add transaction isolation for `getOutstandingReport`
- [x] 2.9 Fix exam service: change `gradedAnswers.questionId` from question text to question ID
- [x] 2.10 Fix exam service: add zero-division guard for percentage calculation
- [x] 2.11 Fix exam-v2 service: align `totalPoints` recalculation with original bank points
- [x] 2.12 Fix payroll service: add duplicate-month check in `runPayroll`
- [x] 2.13 Fix inventory service: prevent negative quantity in `logUsage`
- [x] 2.14 Fix notice service: add expired filter in `getNotices` query
- [x] 2.15 Fix leave service: add leave balance check in `requestLeave`
- [x] 2.16 Fix transport service: notify old route on reassignment
- [x] 2.17 Fix notification service: check `inApp` preference before creating in-app notification
- [x] 2.18 Fix pipeline worker: make `completed_concepts` increment atomic (`SELECT FOR UPDATE`)
- [x] 2.19 Fix pipeline worker: trim `logs` array to last 50 entries
- [x] 2.20 Fix pipeline service: replace dynamic `require` with static import
- [x] 2.21 Replace all Firestore `batch.write()`, `batch.create()`, `batch.set()` with Supabase adapter
- [x] 2.22 Replace all Firestore `where('field', '==', value)` with Supabase `.eq('field', value)`
- [x] 2.23 Replace all `.firestore.batch()` references with adapter-based transactions
- [x] 2.24 Remove `firebase/firestore.ts`, `firebase/auth.ts`, `firebase/admin.ts` and related imports
- [x] 2.25 Remove `firebase-admin.d.ts` type declarations
- [x] 2.26 Remove `firestore.rules` and `storage.rules` files
- [x] 2.27 Fix user service: add `.limit()` to `listUsers` search queries
- [x] 2.28 Fix user service: add conflict-handling for generated email addresses

## 3. Sprint 3: Frontend UI & Analytics Fixes

- [x] 3.1 Fix analytics-v2 service: replace avg-of-averages with weighted average in `overallAvg`
- [x] 3.2 Fix school-analytics service: fix teacher comparison double-counting
- [x] 3.3 Fix school-analytics service: use `examDate` not `createdAt` for trends bucketing
- [x] 3.4 Fix analytics service: add NaN/Infinity guards in all percentage calculations
- [x] 3.5 Move inline `supabase.from(...).select()` in App.tsx to React Query `useQuery`
- [x] 3.6 Move inline supabase call in AdminLayout.tsx to React Query `useQuery`
- [x] 3.7 Fix NotificationDropdown: replace N+1 loop with single `in()` query
- [x] 3.8 Fix index.tsx: handle bulk user fetch query with batched `in()` operator
- [x] 3.9 Fix AdminBulkUploadPage: add TypeScript types for CSV column mapping and payloads (remove `any`)
- [x] 3.10 Fix thick placeholder text font weight across all input fields (consistent tailwind class)
- [x] 3.11 Update class dropdowns across attendance, fee, timetable pages to show "Class X-Y" format
- [x] 3.12 Update academic year input to be a dropdown (not text input)
- [x] 3.13 Fix EPR dashboard quick links layout (organized grid)
- [x] 3.14 Fix student rewards page badge display (neat grid, icon+name+date)
- [x] 3.15 Add back navigation button to stream projects in coding page
- [x] 3.16 Auto-load student's class timetable on timetable page
- [x] 3.17 Fix analytics page template expressions to guard against null/undefined/NaN
- [x] 3.18 Add `dark:` variants to input placeholders and text colors missing them
- [x] 3.19 Reduce `any` types across ~30 frontend locations

## 4. Sprint 4: Mobile App Rebuild

- [x] 4.1 Fix all 46 `onClick` → `onPress` across 3 apps
- [x] 4.2 Fix all 9 `borderBorderWidth` → `borderWidth`
- [x] 4.3 Fix all 4 `alert()` → `Alert.alert()`
- [x] 4.4 Fix `maxWwidth` → `maxWidth` in AITutorScreen
- [x] 4.5 Fix HTML `<label>` → `<Text>` in AssessmentCreateScreen
- [x] 4.6 Fix `&rsaquo;` literal → actual `›` character in SubjectsScreen/QuizScreen
- [x] 4.7 Fix `trackingWith` → `letterSpacing` and `uppercase: true` → `textTransform: 'uppercase'`
- [x] 4.8 Add auth store gating at navigator level (create login screen if missing)
- [x] 4.9 Integrate student app screens with real API via `@genesis-lms/shared` api client
- [x] 4.10 Integrate teacher app screens with real API
- [x] 4.11 Integrate parent app screens with real API
- [x] 4.12 Add loading state (spinner/skeleton) to every screen
- [x] 4.13 Add error state (retry button) to every screen
- [x] 4.14 Add empty state (helpful message) to every screen
- [x] 4.15 Add pull-to-refresh (`refreshControl`) to all ScrollViews
- [x] 4.16 Add `KeyboardAvoidingView` to screens with TextInput
- [x] 4.17 Replace offline cache stub with AsyncStorage-backed persistence
- [x] 4.18 Replace inline emoji icons with `react-native-vector-icons`
- [x] 4.19 Add camera/audio permission handling for OCR and voice features

## 5. Verification

- [x] 5.1 Run all backend unit tests and fix failures
- [x] 5.2 Run all frontend tests and fix failures
- [x] 5.3 Run TypeScript type checking on backend (`npx tsc --noEmit`)
- [x] 5.4 Run TypeScript type checking on frontend (`npx tsc --noEmit`)
- [x] 5.5 Run TypeScript type checking on mobile apps
- [x] 5.6 Verify attendance duplicate guard works (mark same student twice same day = update, not insert)
- [x] 5.7 Verify teacher double-book prevention (assign same teacher same period = rejection)
- [x] 5.8 Verify fee overpayment prevention (pay more than balance = rejection)
- [x] 5.9 Verify analytics shows correct weighted averages (no NaN, no double-count)
- [x] 5.10 Verify class dropdowns all show "Class X-Y" format
- [x] 5.11 Verify mobile apps launch and display real API data
