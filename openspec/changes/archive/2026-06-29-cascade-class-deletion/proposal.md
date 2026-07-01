## Why

Currently, when a class is deleted, only the class document and the students enrolled in it are deleted. This leaves behind orphaned data in multiple other collections (such as teacher assignments, timetable entries, quizzes, attendance, and grades) that reference the deleted class. We need a clean, comprehensive cascade delete mechanism to remove all data associated with a class except for teacher user accounts.

## What Changes

- Update class deletion service (`deleteClass` in `class.service.ts`) to perform cascading deletes for:
  - Teacher assignments (in `teacherClassSubject` collection).
  - Timetable entries (in `timetable` collection).
  - Quizzes and quiz attempts (in `quizzes`, `quizV2`, `quizAttempts`, and `quizAttemptV2` collections) associated with the class.
  - Attendance records (in `attendance` collection) associated with the class.
  - Subjects (in `subjects` collection) associated with the class.
  - Grades and submissions associated with the class.
  - Concept releases associated with the class.
- Ensure that teachers assigned to the class (with `role === 'teacher'`) are NOT deleted or affected, only their class/subject assignments are removed.
- Update `deleteClass` controller to handle and respond to the deletion flow.

## Capabilities

### New Capabilities
- `cascade-class-deletion`: Clean, comprehensive cascade deletion of all class-related records (timetable, teacher-class assignments, quizzes, attendance, etc.) upon class deletion, while safely preserving teacher profiles.

### Modified Capabilities
<!-- None -->

## Impact

- **Backend**:
  - `class.service.ts` (`deleteClass` function)
  - `class.controller.ts` (`deleteClass` function)
  - Database adapter collections accessed during deletion.
