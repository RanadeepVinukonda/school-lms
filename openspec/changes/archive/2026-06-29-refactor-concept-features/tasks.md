## 1. Backend Updates

- [x] 1.1 Restrict question generation types in backend worker (`lms/backend/src/jobs/worker.ts`) to mcq, true_false, fill_blank, matching, numerical, descriptive.

## 2. Frontend Service Updates

- [x] 2.1 Fetch key_points, formulas, examples, and learning_objectives from concept_notes in `lms/frontend/src/services/textbookService.ts`.
- [x] 2.2 Restrict question generation types in frontend client-side AI service (`lms/frontend/src/services/aiService.ts`) to mcq, true_false, fill_blank, matching, numerical, descriptive.

## 3. Teacher UI Updates

- [x] 3.1 Replace the "Student Release & Push Settings" card with a single "Push Concept to Students" toggle button in `lms/frontend/src/app/pages/teacher/TeacherConceptViewPage.tsx` that updates mindMapReleased, questionBankReleased, and assignmentsReleased simultaneously.
- [x] 3.2 Rename "Notes" tab to "Study Material" on `lms/frontend/src/app/pages/teacher/TeacherConceptViewPage.tsx`.
- [x] 3.3 Display objectives, summary, notes, key points, formulas, and examples in order under "Study Material" tab on `lms/frontend/src/app/pages/teacher/TeacherConceptViewPage.tsx`.
- [x] 3.4 Remove the "Questions" tab and link live preview directly to the "Publish Test" modal on `lms/frontend/src/app/pages/teacher/TeacherConceptViewPage.tsx`.
- [x] 3.5 Fix the difficulty badge to only render when `concept.difficulty` has a value on `lms/frontend/src/app/pages/teacher/TeacherConceptViewPage.tsx`.
- [x] 3.6 Update type mapping in jumble/filter logic to correctly map `mcq` and `descriptive` questions on `lms/frontend/src/app/pages/teacher/TeacherConceptViewPage.tsx`.

## 4. Student UI Updates

- [x] 4.1 Wrap the main content of `lms/frontend/src/app/pages/student/StudentConceptPage.tsx` with a check for `release?.mindMapReleased`, displaying a lock overlay if not released yet.
- [x] 4.2 Rename "Learn" tab to "Study Material" on `lms/frontend/src/app/pages/student/StudentConceptPage.tsx`.
- [x] 4.3 Display objectives, summary, notes, key points, formulas, and examples in order under "Study Material" tab on `lms/frontend/src/app/pages/student/StudentConceptPage.tsx`.
- [x] 4.4 Remove the "Practice" tab entirely from `lms/frontend/src/app/pages/student/StudentConceptPage.tsx`.
- [x] 4.5 Update the `getReleaseBadge` function in `lms/frontend/src/app/pages/student/StudentChapterPage.tsx` to display 'Locked' or 'Released' based on the concept release status (`release?.mindMapReleased`).
