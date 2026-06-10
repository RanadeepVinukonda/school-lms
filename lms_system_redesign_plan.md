# LMS System Redesign Plan

## 1. User Roles & Permissions

### 1.1 Admin
- **Scope:** Full system oversight.
- **Can:**
  - Create/Edit/Delete **classes** (grade, section, academic year).
  - Within a class, create **subjects** (name, code, optional description).
  - View all classes, all teachers, all students.
  - Access audit logs.
- **Cannot teach, upload textbooks, or create assignments/exams.**

### 1.2 Teacher
- **Scope:** Classroom teaching for assigned subjects.
- **Can be assigned to:** multiple classes.
- **Must have exactly one subject per class** (a teacher-class pair maps to a single subject).
- **Global constraint:** A subject within a class can have **at most one teacher**. If a subject already has a teacher, it is locked for other teachers.
- **Can:**
  - See all students enrolled in their assigned class(es).
  - View analytics (performance, submissions, scores, concept mastery) for those students.
  - Upload **exactly one textbook** for their (class × subject) pair — one textbook per class per subject.
  - Access a **Teaching Space**:
    - View the textbook chapter-by-chapter.
    - Add videos (from a personal library or YouTube link) per concept/chapter.
    - Push **quizzes** and **assignments** to the class after teaching a concept.
    - Push **exam** at the end of each chapter.
    - Set time limits on every quiz, assignment, and exam.
    - Push results (grades, correct answers) to students when ready.
  - Maintain a **personal video library** — upload/link videos that appear in a private folder.
  - **Registration flow:**
    1. Select which class(es) they teach.
    2. For each selected class, see available subjects.
    3. If a subject already has a teacher assigned, it is **not selectable**.
    4. Once a subject is chosen, the teacher **can only upload textbooks** for that (class × subject).
    5. The teacher's primary subject selection governs all content creation.

### 1.3 Student
- **Scope:** Learning within their assigned class.
- **Belongs to exactly one class.**
- **Can:**
  - View assigned textbooks (based on their class → subject → teacher → textbook chain).
  - Take quizzes, assignments, and exams that the teacher has pushed.
  - **Question modularity toggle:** Before starting a quiz/assignment/exam, the student can tick which question models they want (e.g., MCQs, Blanks, Match the Following). Only the selected models appear.
  - Submit answers — all submissions are time-bound by the teacher's timer.
  - View results **only after the teacher pushes them**.
  - Experience **AI-adaptive difficulty**:
    - The system tracks speed, accuracy, and complexity handled per concept.
    - Students are classified into levels (Beginner, Intermediate, Advanced) per concept.
    - AI dynamically adjusts question difficulty within the selected models based on the student's level.
- **Can NOT** upload textbooks, create content, or view other classes' content.

---

## 2. Data Model & Integrity Rules

### 2.1 Core Collections

```
classes/
  {classId}/
    name: string
    grade: string
    section: string
    academicYear: string
    isActive: boolean
    createdAt: timestamp
    updatedAt: timestamp

subjects/
  {subjectId}/
    name: string
    code: string
    classId: string          ← FK to classes
    description: string?
    icon: string?
    color: string?
    createdAt: timestamp
    updatedAt: timestamp

users/
  {uid}/
    email: string
    displayName: string
    role: "admin" | "teacher" | "student"
    isActive: boolean
    classIds: string[]       ← classes the user belongs to
    subjectId: string?       ← teacher's assigned subject (null for admin/student)
    classId: string?         ← student's single class
    studentId: string?       ← roll number / student ID
    videoLibrary: VideoRef[] ← teacher's saved video links
    createdAt: timestamp
    updatedAt: timestamp

teacher-class-subject/
  {autoId}/
    teacherId: string        ← FK to users
    classId: string          ← FK to classes
    subjectId: string        ← FK to subjects
    textbookId: string?      ← FK to textbooks (one per teacher+class+subject)
    createdAt: timestamp
```

**Uniqueness constraint on `teacherId + classId + subjectId`:**
- No two documents can have the same `classId + subjectId` unless `teacherId` is different.
- Actually: **`classId + subjectId` must be globally unique** — this enforces "one teacher per subject per class."
- The lookup is: given a `classId` and `subjectId`, find the single `teacher-class-subject` doc → get `teacherId`.

### 2.2 Textbook & Content Collections

```
textbooks/
  {textbookId}/
    title: string
    subjectId: string        ← FK to subjects
    classId: string          ← FK to classes (one textbook per class)
    teacherId: string        ← FK to users (the uploading teacher)
    description: string?
    coverImage: string?
    status: "processing" | "ready"
    chapterCount: number
    createdAt: timestamp
    updatedAt: timestamp

textbooks/{textbookId}/chapters/
  {chapterId}/
    title: string
    order: number
    description: string?
    createdAt: timestamp

textbooks/{textbookId}/chapters/{chapterId}/concepts/
  {conceptId}/
    title: string
    order: number
    summary: string?
    estimatedMinutes: number
    difficulty: "easy" | "medium" | "hard"
    content: string?          ← AI-generated or teacher-written
    videoLinks: string[]      ← YouTube or uploaded video URLs for this concept
    questionBank: Question[]  ← embedded array of questions with answers
    createdAt: timestamp
    updatedAt: timestamp
```

### 2.3 Question Model (embedded in concept)

```typescript
interface Question {
  id: string;
  type: "mcq" | "blanks" | "match" | "true-false" | "short-answer";
  questionText: string;
  options?: string[];            // for MCQ / match
  correctAnswer: string | string[];
  blanks?: { position: number; answer: string }[];
  matchPairs?: { left: string; right: string }[];
  points: number;
  difficulty: "easy" | "medium" | "hard";
}
```

### 2.4 Teacher-Pushed Content

```
quizzes/
  {quizId}/
    title: string
    conceptId: string        ← FK to concepts
    textbookId: string       ← FK to textbooks
    classId: string          ← FK to classes
    teacherId: string        ← FK to users
    timeLimitMinutes: number  ← teacher-set timer
    availableModels: ("mcq"|"blanks"|"match"|"true-false"|"short-answer")[]
    questionCount: number
    totalPoints: number
    showResults: boolean      ← teacher pushes results when true
    releasedAt: timestamp?
    createdAt: timestamp
    updatedAt: timestamp

assignments/
  {assignmentId}/
    title: string
    conceptId: string
    textbookId: string
    classId: string
    teacherId: string
    description: string?
    timeLimitMinutes: number
    availableModels: ("mcq"|"blanks"|"match"|"true-false"|"short-answer")[]
    questionCount: number
    totalPoints: number
    dueDate: timestamp?
    showResults: boolean
    releasedAt: timestamp?
    createdAt: timestamp
    updatedAt: timestamp

exams/
  {examId}/
    title: string
    chapterId: string        ← end-of-chapter exam
    textbookId: string
    classId: string
    teacherId: string
    timeLimitMinutes: number
    availableModels: ("mcq"|"blanks"|"match"|"true-false"|"short-answer")[]
    questionCount: number
    totalPoints: number
    startDate: timestamp?
    endDate: timestamp?
    gradesReleased: boolean
    createdAt: timestamp
    updatedAt: timestamp
```

### 2.5 Submissions & Results

```
quizAttempts/
  {attemptId}/
    quizId: string
    studentId: string
    classId: string
    answers: { questionId: string; answer: string; timeSpentSec: number }[]
    score: number
    maxScore: number
    percentage: number
    timeTakenSec: number
    submittedAt: timestamp
    gradedAt: timestamp?
    conceptId: string
    // AI tracking:
    level: "beginner" | "intermediate" | "advanced"
    avgReactionTimeSec: number
    accuracy: number          // 0-1
    complexityHandled: number // highest difficulty level answered correctly

assignmentSubmissions/
  {submissionId}/
    assignmentId: string
    studentId: string
    classId: string
    answers: { questionId: string; answer: string; timeSpentSec: number }[]
    score: number
    maxScore: number
    percentage: number
    timeTakenSec: number
    status: "submitted" | "graded"
    submittedAt: timestamp
    gradedAt: timestamp?
    conceptId: string
    level: "beginner" | "intermediate" | "advanced"
    avgReactionTimeSec: number
    accuracy: number
    complexityHandled: number

examAttempts/
  {attemptId}/
    examId: string
    studentId: string
    classId: string
    answers: { questionId: string; answer: string; timeSpentSec: number }[]
    score: number
    maxScore: number
    percentage: number
    timeTakenSec: number
    submittedAt: timestamp
    gradedAt: timestamp?
    chapterId: string
    level: "beginner" | "intermediate" | "advanced"
    avgReactionTimeSec: number
    accuracy: number
    complexityHandled: number
```

### 2.6 Teacher Video Library

```
teacherVideos/
  {videoId}/
    teacherId: string
    title: string
    url: string               ← YouTube link or uploaded file URL
    thumbnail: string?
    folder: string?           ← teacher-defined folder name for organization
    tags: string[]
    duration: number?         ← seconds
    createdAt: timestamp
```

The teacher's `user.videoLibrary` is a lightweight array of `{videoId, title, url}` for quick access. The full metadata lives in the `teacherVideos` collection.

---

## 3. Integrity Rules (Enforced at Backend)

### Rule 1: One Teacher Per Subject Per Class
- Before assigning a teacher to a subject in a class, check `teacher-class-subject` for an existing doc with matching `classId + subjectId`.
- If found and the `teacherId` differs, **reject** with `SUBJECT_ALREADY_ASSIGNED`.
- A teacher can be assigned to the same subject across **different classes**.

### Rule 2: One Textbook Per (Class × Subject)
- Before creating a textbook, check `textbooks` for existing doc with same `classId` and `subjectId`.
- If one exists, **reject** with `TEXTBOOK_ALREADY_EXISTS`.
- A new textbook replaces the old one only if explicitly confirmed (soft-delete old + create new).
- The `textbookId` in `teacher-class-subject` points to the active textbook.

### Rule 3: Teacher Can Only Upload Textbook for Their Subject
- At creation time, verify that the uploading teacher has a `teacher-class-subject` record with matching `classId` and `subjectId`.
- The subject on the textbook must match the teacher's assigned subject for that class.

### Rule 4: Student Views Only Their Class Content
- Every quiz, assignment, and exam has a `classId`.
- Students can only see content where `classId === user.classId`.

### Rule 5: Time Limits Are Enforced Server-Side
- When a student starts a quiz/assignment/exam, the server records `startedAt`.
- On submission, the server checks `(submittedAt - startedAt) <= timeLimitMinutes * 60000`.
- If exceeded, the submission is **auto-submitted with whatever answers exist** and marked as `late`.

### Rule 6: Results Visibility Is Teacher-Controlled
- `showResults` (quiz/assignment) and `gradesReleased` (exam) default to `false`.
- The `/results` endpoint returns **no correct answers or scores** when these flags are `false`.
- Only the total possible points and submission status are visible.

### Rule 7: Question Modularity — Student Chooses Models
- When a teacher creates a quiz/assignment/exam, they set `availableModels` — the superset of question types available.
- When a student starts, they see checkboxes for each model in `availableModels`.
- The student ticks which models they want. The system then selects questions **only from those models**.
- The final question set is generated at fetch-time, filtered by the student's chosen models AND their AI level.

### Rule 8: AI Difficulty Scaling
- After each submission, the system updates the student's `level` for that concept:
  - **accuracy >= 0.85 AND complexityHandled >= 2** → `advanced`
  - **accuracy >= 0.70 AND complexityHandled >= 1** → `intermediate`
  - **else** → `beginner`
- On the next attempt, the system selects questions where `difficulty` matches the student's level.
- If the student is `advanced` and answers correctly within 50% of the time limit, the system may inject one `hard` question from the next level up (probabilistic, 30% chance).
- If the student is `beginner` and answers incorrectly, the next question is `easy`.

### Rule 9: Teacher Registration — Subject Selection
1. Teacher creates an account via the teacher registration form.
2. After login (or during registration), the teacher is prompted to **select class(es)**.
3. For each selected class, the system shows **all subjects** in that class.
4. For each subject, the UI indicates whether a teacher is already assigned (`Already assigned to {teacherName}`).
5. The teacher selects **one unassigned subject** per class.
6. Once confirmed, a `teacher-class-subject` document is created, locking that subject to the teacher.
7. After this setup, the teacher **can only upload textbooks** whose `subjectId` matches their assigned subject and whose `classId` matches their class.

---

## 4. Route Design

### 4.1 Backend API Routes

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| `GET` | `/api/classes` | admin | List all classes |
| `POST` | `/api/classes` | admin | Create class |
| `PUT` | `/api/classes/:id` | admin | Update class |
| `DELETE` | `/api/classes/:id` | admin | Soft-delete class |
| `GET` | `/api/classes/:id/subjects` | admin, teacher | List subjects in class |
| `POST` | `/api/subjects` | admin | Create subject under a class |
| `PUT` | `/api/subjects/:id` | admin | Update subject |
| `DELETE` | `/api/subjects/:id` | admin | Delete subject |
| | | | |
| `POST` | `/api/teacher-class-subject` | admin | Assign teacher to class+subject (enforces Rule 1) |
| `GET` | `/api/teacher-class-subject/available/:classId` | teacher | Get unassigned subjects for a class |
| `GET` | `/api/teacher-class-subject/mine` | teacher | Get the teacher's own assignments |
| | | | |
| `POST` | `/api/textbooks` | teacher | Upload textbook (enforces Rules 2 & 3) |
| `GET` | `/api/textbooks?classId=X&subjectId=Y` | teacher, student | Get textbooks for a class+subject |
| `GET` | `/api/textbooks/:id` | teacher, student | Get textbook detail |
| `GET` | `/api/textbooks/:id/chapters` | teacher, student | Get chapters (subcollection) |
| `GET` | `/api/textbooks/:tid/chapters/:cid/concepts` | teacher, student | Get concepts (subcollection) |
| | | | |
| `POST` | `/api/quizzes` | teacher | Create quiz (concept-level) |
| `PATCH` | `/api/quizzes/:id/release` | teacher | Push quiz to students (set `releasedAt`) |
| `PATCH` | `/api/quizzes/:id/release-grades` | teacher | Push results to students |
| `GET` | `/api/quizzes/available?classId=X` | student | Get released quizzes for student's class |
| `POST` | `/api/quizzes/:id/start` | student | Start quiz, record `startedAt`, generate filtered question set |
| `POST` | `/api/quizzes/:id/submit` | student | Submit answers (enforces Rule 5), compute score + AI level |
| `GET` | `/api/quizzes/:id/results` | student | View results (enforces Rule 6) |
| | | | |
| `POST` | `/api/assignments` | teacher | Create assignment |
| `PATCH` | `/api/assignments/:id/release` | teacher | Push assignment |
| `PATCH` | `/api/assignments/:id/release-grades` | teacher | Push results |
| `GET` | `/api/assignments/available?classId=X` | student | Get released assignments |
| `POST` | `/api/assignments/:id/start` | student | Start assignment |
| `POST` | `/api/assignments/:id/submit` | student | Submit (auto-submit on timeout) |
| `GET` | `/api/assignments/:id/results` | student | View results |
| | | | |
| `POST` | `/api/exams` | teacher | Create exam (chapter-level) |
| `PATCH` | `/api/exams/:id/release` | teacher | Push exam |
| `PATCH` | `/api/exams/:id/release-grades` | teacher | Push results |
| `GET` | `/api/exams/available?classId=X` | student | Get released exams |
| `POST` | `/api/exams/:id/start` | student | Start exam |
| `POST` | `/api/exams/:id/submit` | student | Submit |
| `GET` | `/api/exams/:id/results` | student | View results |
| | | | |
| `GET` | `/api/analytics/student/:studentId` | teacher | Student analytics (scores, levels, concept mastery) |
| `GET` | `/api/analytics/class/:classId` | teacher | Class-wide analytics |
| `POST` | `/api/users/ping-active` | all | Streak tracking |
| | | | |
| `GET` | `/api/teacher-videos` | teacher | List own video library |
| `POST` | `/api/teacher-videos` | teacher | Add video to library |
| `DELETE` | `/api/teacher-videos/:id` | teacher | Remove video |
| `PUT` | `/api/teacher-videos/:id/folder` | teacher | Organize into folder |
| | | | |
| `GET` | `/api/admin/classes` | admin | Admin class management |
| `GET` | `/api/admin/teachers` | admin | List teachers with their assignments |
| `GET` | `/api/admin/stats` | admin | Dashboard stats |

### 4.2 Frontend Routes

| Path | Role | Page |
|------|------|------|
| `/admin/dashboard` | admin | Dashboard with class/subject/teacher stats |
| `/admin/classes` | admin | Create/manage classes |
| `/admin/classes/:id/subjects` | admin | Create/manage subjects in a class |
| `/admin/teachers` | admin | View all teachers and their assignments |
| `/admin/assign-teacher` | admin | Assign teacher to class+subject |
| `/admin/audit-logs` | admin | Audit log viewer |
| | | |
| `/teacher/dashboard` | teacher | Teaching space overview (classes, subjects, textbook, quick actions) |
| `/teacher/select-class` | teacher | First-time class/subject selection |
| `/teacher/students` | teacher | View students in assigned classes |
| `/teacher/students/:id` | teacher | Student detail + analytics |
| `/teacher/textbooks` | teacher | My textbooks list |
| `/teacher/textbooks/upload` | teacher | Upload textbook (only for assigned subject) |
| `/teacher/textbooks/:id` | teacher | Textbook detail + teach |
| `/teacher/textbooks/:id/chapters/:chId/concepts/:cId` | teacher | Concept teaching page + push quiz/assignment |
| `/teacher/quizzes` | teacher | Manage quizzes |
| `/teacher/assignments` | teacher | Manage assignments |
| `/teacher/exams` | teacher | Manage exams |
| `/teacher/exams/:id/correct` | teacher | Grade exam submissions |
| `/teacher/videos` | teacher | Video library |
| `/teacher/profile` | teacher | Profile |
| | | |
| `/student/dashboard` | student | Dashboard with upcoming quizzes/assignments/exams |
| `/student/subjects` | student | View subjects/classes |
| `/student/textbooks/:id` | student | View textbook |
| `/student/textbooks/:id/chapters/:chId/concepts/:cId` | student | Learn concept |
| `/student/quizzes` | student | Available quizzes |
| `/student/quizzes/:id/take` | student | Take quiz (model selection → timer → submit) |
| `/student/quizzes/:id/results` | student | View results (if pushed) |
| `/student/assignments` | student | Available assignments |
| `/student/assignments/:id/take` | student | Take assignment |
| `/student/assignments/:id/results` | student | View results |
| `/student/exams` | student | Upcoming exams |
| `/student/exams/:id/take` | student | Take exam |
| `/student/exams/:id/results` | student | View results |
| `/student/profile` | student | Profile |

---

## 5. Key Implementation Details

### 5.1 Quiz/Assignment/Exam Generation with Question Modularity

```
Student clicks "Take Quiz"

1. GET /api/quizzes/:id/start
2. Backend: verifies quiz is released, belongs to student's class
3. Backend: returns { availableModels: ["mcq","blanks","match"], 
     timeLimitMinutes: 30, questionCount: 20 }
4. Student sees checkboxes: ☐ MCQs  ☐ Blanks  ☐ Match the Following
5. Student ticks desired models, clicks "Begin"
6. POST /api/quizzes/:id/begin  body: { selectedModels: ["mcq","blanks"] }
7. Backend:
   a. Loads the concept's questionBank
   b. Filters questions by selectedModels AND student's level
   c. Selects `questionCount` questions, distributed evenly across selected models
   d. Records startedAt for the attempt
   e. Returns the filtered question set (without answers)
8. Timer starts on frontend (synced with server startedAt)
9. On submit or timeout → POST /api/quizzes/:id/submit
10. Backend grades immediately (answers are in the questionBank),
    computes AI level, stores attempt, returns score (if showResults is true)
```

### 5.2 AI Level Computation

```
function computeLevel(accuracy: number, avgReactionTimeSec: number, complexityHandled: number):
  if accuracy >= 0.85 AND complexityHandled >= 2 → "advanced"
  if accuracy >= 0.70 AND complexityHandled >= 1 → "intermediate"
  else → "beginner"

// complexityHandled = highest difficulty level (0=easy,1=medium,2=hard)
//   among questions the student answered correctly.

// Accuracy = correctAnswers / totalAnswered

// avgReactionTimeSec is used for tiebreaking within a level
//   and displayed to teacher as "avg response time"
```

### 5.3 Teacher Video Library

- Teachers can **add** videos via URL (YouTube) or file upload.
- Videos appear in a grid layout, filterable by folder/tag.
- When teaching a concept, the teacher can **link** videos from their library to the concept.
- Linked videos appear in the student's concept view.
- The teacher can create custom folders (e.g., "Calculus I — Limits", "Class 5 — Geometry") to organize.

### 5.4 Teaching Space

The Teaching Space is the teacher's view of a textbook concept. It includes:

1. **Concept content** — AI-generated or teacher-written explanation.
2. **Video player** — linked videos from the teacher's library + YouTube embeds.
3. **Question bank preview** — see all questions, filter by type/difficulty.
4. **Push Quiz** — create + push a quiz to the class (sets `releasedAt`, students immediately see it).
5. **Push Assignment** — create + push an assignment (with optional due date).
6. **Student progress** — see which students have completed, their scores, and AI levels.
7. **After teaching**, teacher clicks "Push Quiz" → modal: set title, time limit, select models, question count → students get notified.

### 5.5 Admin Class & Subject Creation

1. Admin goes to `/admin/classes` → creates a class (e.g., "Grade 5 - Section A").
2. Within that class, admin goes to `/admin/classes/:id/subjects` → creates subjects (e.g., "Mathematics", "Science").
3. Admin goes to `/admin/assign-teacher` → selects class → selects subject → selects teacher.
4. System checks Rule 1 — if subject already has a teacher, the assign action fails.
5. Teacher now has access to that class+subject.

---

## 6. Implementation Order (Sprints)

### Sprint 1: Data Model & Auth Setup
- Backend: collections, indexes, Firebase rules
- Backend: Admin class/subject CRUD endpoints
- Backend: Teacher registration flow (class selection → subject assignment)
- Frontend: Admin class/subject management pages

### Sprint 2: Textbook System
- Backend: Textbook upload endpoint (enforces one-per-class-subject)
- Backend: Subcollection chapter/concept endpoints
- Frontend: Teacher textbook upload + detail pages
- Frontend: Student textbook view

### Sprint 3: Quiz & Assignment Engine
- Backend: Quiz/assignment creation, release, start, submit, grade
- Backend: Time limit enforcement, auto-submit
- Backend: Question modularity (filter by selected models)
- Frontend: Teacher quiz creation + push flow
- Frontend: Student quiz taking with model selection + timer

### Sprint 4: Exam System
- Backend: Exam creation, release, start, submit, grade
- Frontend: Teacher exam creation
- Frontend: Student exam taking

### Sprint 5: AI Adaptive Difficulty
- Backend: AI level computation on submission
- Backend: Level-based question filtering
- Backend: Adaptive difficulty injection (harder/easier questions)
- Frontend: Display AI level to teacher + student

### Sprint 6: Teacher Video Library
- Backend: Video CRUD endpoints
- Frontend: Teacher video library page
- Frontend: Video linking to concepts

### Sprint 7: Analytics & Results
- Backend: Student analytics endpoint (scores, levels, concept mastery)
- Backend: Class analytics endpoint
- Frontend: Teacher student detail analytics page
- Frontend: Result push + student result views

### Sprint 8: Polish & Edge Cases
- Notifications for pushed content
- Error states, loading states, empty states
- E2E testing for all flows
- Audit logging for all teacher actions
