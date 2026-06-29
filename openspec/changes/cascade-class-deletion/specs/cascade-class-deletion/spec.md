## ADDED Requirements

### Requirement: Cascade Class Deletion
The system SHALL support cascading deletion of a class, which deletes all class-specific records, configurations, and students, while explicitly preserving teacher user accounts.

#### Scenario: Deleting a class with teachers and students
- **WHEN** an admin deletes a class by ID `class-123`
- **THEN** the class document for `class-123` in the `classes` collection is deleted
- **THEN** all students enrolled in `class-123` are deleted from Firestore `users` and Firebase Auth
- **THEN** all teachers associated with `class-123` are NOT deleted from Firestore or Firebase Auth
- **THEN** all teacher-class-subject assignments in `teacherClassSubject` with `classId` equal to `class-123` are deleted
- **THEN** all timetable entries in `timetable` with `classId` equal to `class-123` are deleted
- **THEN** all subjects in `subjects` with `classId` equal to `class-123` are deleted
- **THEN** all quizzes in `quizzes` and `quizV2` with `classId` equal to `class-123` (or `class_id` equal to `class-123`) are deleted
- **THEN** all quiz attempts in `quizAttempts` and `quizAttemptV2` for the deleted quizzes are deleted
- **THEN** all attendance records in `attendance` with `classId` equal to `class-123` are deleted
- **THEN** all grade records in `grades` with `classId` equal to `class-123` are deleted
