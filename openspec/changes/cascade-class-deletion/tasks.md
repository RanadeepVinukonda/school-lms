## 1. Database Adapter Configuration

- [x] 1.1 Register `concept_releases` in `TYPED_TABLES` in `lms/backend/src/database/adapter.ts`
- [x] 1.2 Add `conceptReleases` collection shortcut to `collections` in `lms/backend/src/database/adapter.ts`

## 2. Deletion Service Implementation

- [x] 2.1 Update `deleteClass` in `lms/backend/src/services/class.service.ts` to cascade delete teacher assignments (`teacherClassSubject`)
- [x] 2.2 Update `deleteClass` in `lms/backend/src/services/class.service.ts` to cascade delete timetable entries, attendance records, and subjects
- [x] 2.3 Update `deleteClass` in `lms/backend/src/services/class.service.ts` to cascade delete quizzes, quizV2, and quiz attempts
- [x] 2.4 Update `deleteClass` in `lms/backend/src/services/class.service.ts` to cascade delete courses, course enrollments, lessons, and grades
- [x] 2.5 Update `deleteClass` in `lms/backend/src/services/class.service.ts` to cascade delete concept releases
