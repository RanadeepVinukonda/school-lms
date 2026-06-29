## Context

Currently, the `deleteClass` service function in `class.service.ts` only deletes the class document and the students enrolled in it. It does not clean up associated data, leaving behind orphaned records in other tables such as `teacherClassSubject` assignments, `timetable` entries, `quizzes` and `quizV2` (along with their attempts), `attendance` records, `subjects` associated with the class, `grades`, `courses` (and their enrollments/lessons), and `concept_releases`.

## Goals / Non-Goals

**Goals:**
- Implement a complete cascade delete in `deleteClass` that cleans up all class-related tables and documents.
- Ensure teacher profiles are not deleted or affected.
- Register `concept_releases` as a typed table in `adapter.ts` so the backend can delete records from it.

**Non-Goals:**
- Modify other cascade flows (like deleting a textbook or a subject directly) outside class deletion context.

## Decisions

### 1. Cascade Deletion Logic in `deleteClass`
We will implement the cascading delete directly in the `deleteClass` service function using sequential deletion queries:
- Query and delete student users (same as existing logic).
- Query and delete assignments in `teacherClassSubject` where `classId == classId`.
- Query and delete timetable entries in `timetable` where `classId == classId`.
- Query and delete attendance records in `attendance` where `classId == classId`.
- Query and delete subjects in `subjects` where `classId == classId`.
- Query and delete quizzes in `quizzes` and `quizV2` where `classId == classId` (and for `quizV2`, delete all related `quizAttemptV2` attempts first).
- Query and delete grades in `grades` where `classId == classId`.
- Query and delete courses in `courses` where `classId == classId` (and delete their lessons in `lessons` and enrollments in `enrollment`).
- Query and delete concept releases in `concept_releases` where `classId == classId`.
- Delete the class document in `classes`.

### 2. Add `concept_releases` to `TYPED_TABLES` in `adapter.ts`
We will add `concept_releases` to `TYPED_TABLES` in `lms/backend/src/database/adapter.ts`:
```typescript
concept_releases: new Set(['id','class_id','textbook_id','chapter_id','concept_id','teacher_id','question_bank_released','assignments_released','mind_map_released','updated_at']),
```
And add a helper shortcut to `collections` in `adapter.ts`:
```typescript
conceptReleases: () => getCollection('concept_releases'),
```

## Risks / Trade-offs

- **Risk**: Deletion fails mid-way (e.g. Firebase Auth deletion fails).
  - *Mitigation*: Run operations sequentially. In the event of minor errors (like Auth deletion of a student), log a warning but continue the deletion of other records so the class is not left in a half-deleted state.
