# Technical Design Document — OpenCode LMS

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React/Vite)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Admin Portal │  │Teacher Portal│  │   Student Portal     │  │
│  │  /admin/*    │  │ /teacher/*   │  │ /student/*           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │            React Router v6 + Role Guards                    │ │
│  │  Zustand (auth, exam session)  │  TanStack React Query     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTP /api/* (Vite proxy)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Express Backend (port 3001)                      │
│  verifyToken middleware → requireRole middleware                  │
│  ┌───────────┐ ┌─────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Admin    │ │   Teacher   │ │ Student  │ │  Analytics    │  │
│  │  Routes   │ │   Routes    │ │  Routes  │ │  Routes       │  │
│  └───────────┘ └─────────────┘ └──────────┘ └───────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Services: UserService, ClassService, TextbookService,      │ │
│  │  TemplateService, TestService, ProfilingEngine,             │ │
│  │  QuestionReformatter, NotificationService                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────── ┐ │
│  │  jobs/aiPipeline.ts (async worker)                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ firebase-admin SDK
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Firebase (school-ca94b)                   │
│   ┌────────────┐   ┌──────────────────┐   ┌──────────────────┐ │
│   │  Firebase  │   │    Firestore     │   │ Firebase Storage │ │
│   │    Auth    │   │  (data store)    │   │  (PDF uploads)   │ │
│   └────────────┘   └──────────────────┘   └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Firestore Data Model

### `classes/{classId}`
```typescript
{
  name: string;           // e.g. "Grade 10 - Section A"
  grade: string;          // 1–20 chars
  section: string;        // 1–10 chars
  academicYear: string;   // "YYYY-YYYY"
  isActive: boolean;
  createdAt: Timestamp;
}
```

### `subjects/{subjectId}`
```typescript
{
  name: string;           // 1–100 chars
  code: string;           // alphanumeric, 1–20 chars (stored uppercase for case-insensitive dedup)
  classId: string;        // FK → classes
  createdAt: Timestamp;
}
```

### `users/{uid}`
```typescript
{
  email: string;
  displayName: string;
  role: "admin" | "teacher" | "student";
  isActive: boolean;
  // teacher-only
  classIds?: string[];
  // student-only
  classId?: string;
  studentId?: string;     // "[AcademicYear]_[ClassCode]_[RollNo]"
  rollNo?: number;
  academicYear?: string;
  level?: "beginner" | "intermediate" | "advanced";
  createdAt: Timestamp;
}
```

### `teacher-class-subject/{classId_subjectId}`
```typescript
{
  teacherId: string;      // FK → users
  classId: string;        // FK → classes
  subjectId: string;      // FK → subjects
  assignedAt: Timestamp;
}
// Document ID = `${classId}_${subjectId}` — uniqueness enforced at ID level
```

### `textbooks/{textbookId}`
```typescript
{
  title: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  storagePath: string;    // Firebase Storage path
  status: "processing" | "ready" | "failed";
  failureReason?: string;
  createdAt: Timestamp;
}
```

### `textbooks/{textbookId}/chapters/{chapterId}`
```typescript
{
  title: string;
  order: number;
  summary: string;
}
```

### `textbooks/{textbookId}/chapters/{chapterId}/concepts/{conceptId}`
```typescript
{
  title: string;
  order: number;
  notes: string;
  videoLinks: string[];
  questionBank: Question[];   // min 50 items, at least 1 of each type
}
```

### `test_templates/{templateId}`
```typescript
{
  title: string;              // 1–200 chars
  teacherId: string;
  timeLimitMinutes: number;   // 1–300
  questionCount: number;      // 1–200
  jumbleQuestions: boolean;
  difficultyDistribution: {
    easy: number;             // 0–100 integers, must sum to 100
    medium: number;
    hard: number;
    hots: number;
  };
  allowedFormats: QuestionType[];
  createdAt: Timestamp;
}
```

### `question_papers/{paperId}`
```typescript
{
  templateId: string;
  conceptId?: string;
  chapterId?: string;
  textbookId: string;
  questions: Question[];      // immutable snapshot
  totalPoints: number;        // sum of all question.points
  createdAt: Timestamp;
}
```

### `tests/{testId}`
```typescript
{
  title: string;
  paperId: string;            // FK → question_papers
  classId: string;
  subjectId: string;
  teacherId: string;
  type: "quiz" | "assignment" | "exam";
  isRepublished: boolean;
  showResults: boolean;
  attemptCount: number;
  releasedAt: Timestamp;
  dueDate?: Timestamp;
  isClosed: boolean;          // teacher manual close
  createdAt: Timestamp;
}
```

### `submissions/{submissionId}`
```typescript
{
  testId: string;
  studentId: string;          // uid
  answers: AnswerRecord[];
  earnedPoints: number;
  totalPoints: number;
  accuracy: number;           // 0–100
  complexity: number;         // 0–2
  level: "beginner" | "intermediate" | "advanced";
  submittedAt: Timestamp;     // server-generated
}

interface AnswerRecord {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  difficulty: "easy" | "medium" | "hard" | "hots";
  timeSpentMs: number;
}
```

### `notifications/{notificationId}`
```typescript
{
  recipientId: string;        // uid
  type: "test_published" | "reteach" | "test_overdue";
  title: string;
  body: string;
  metadata: {
    testId?: string;
    testTitle?: string;
    testType?: string;
    releasedAt?: Timestamp;
    dueDate?: Timestamp;
    className?: string;
    subjectName?: string;
    conceptTitle?: string;
  };
  isRead: boolean;
  createdAt: Timestamp;
}
```

---

## 3. TypeScript Interface Definitions

All shared types live in `frontend/src/types/index.ts` and `backend/src/types/index.ts` (mirrored).

```typescript
export type Role = "admin" | "teacher" | "student";
export type QuestionType = "mcq" | "true_false" | "fill_blank" | "matching" | "descriptive" | "numerical" | "passage";
export type Difficulty = "easy" | "medium" | "hard" | "hots";
export type AdaptiveLevel = "beginner" | "intermediate" | "advanced";
export type TestType = "quiz" | "assignment" | "exam";
export type TextbookStatus = "processing" | "ready" | "failed";

export interface Question {
  id: string;
  conceptId: string;
  type: QuestionType;
  difficulty: Difficulty;
  text: string;
  options?: string[];
  correctAnswer: string;
  passageText?: string;
  explanation?: string;
  points: number;
  // fill_blank only — not persisted, derived at compile time
  validator?: (answer: string) => boolean;
}

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
  hots: number;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  classIds?: string[];        // teacher
  classId?: string;           // student
  studentId?: string;
  rollNo?: number;
  academicYear?: string;
  level?: AdaptiveLevel;
  createdAt: Date;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  section: string;
  academicYear: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  classId: string;
  createdAt: Date;
}

export interface Junction {
  id: string;   // classId_subjectId
  teacherId: string;
  classId: string;
  subjectId: string;
  assignedAt: Date;
}

export interface Concept {
  id: string;
  title: string;
  order: number;
  notes: string;
  videoLinks: string[];
  questionBank: Question[];
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  summary: string;
  concepts?: Concept[];
}

export interface Textbook {
  id: string;
  title: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  storagePath: string;
  status: TextbookStatus;
  failureReason?: string;
  createdAt: Date;
}

export interface Template {
  id: string;
  title: string;
  teacherId: string;
  timeLimitMinutes: number;
  questionCount: number;
  jumbleQuestions: boolean;
  difficultyDistribution: DifficultyDistribution;
  allowedFormats: QuestionType[];
  createdAt: Date;
}

export interface QuestionPaper {
  id: string;
  templateId: string;
  textbookId: string;
  conceptId?: string;
  chapterId?: string;
  questions: Question[];
  totalPoints: number;
  createdAt: Date;
}

export interface Test {
  id: string;
  title: string;
  paperId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  type: TestType;
  isRepublished: boolean;
  showResults: boolean;
  attemptCount: number;
  releasedAt: Date;
  dueDate?: Date;
  isClosed: boolean;
  createdAt: Date;
}

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  difficulty: Difficulty;
  timeSpentMs: number;
}

export interface Submission {
  id: string;
  testId: string;
  studentId: string;
  answers: AnswerRecord[];
  earnedPoints: number;
  totalPoints: number;
  accuracy: number;
  complexity: number;
  level: AdaptiveLevel;
  submittedAt: Date;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: "test_published" | "reteach" | "test_overdue";
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}
```

---

## 4. Backend API Routes

All routes are prefixed with `/api` and protected by `verifyToken` middleware unless noted.

### Auth
```
POST   /api/auth/verify-token     — validates Firebase ID token, returns user profile
```

### Admin Routes (require role: admin)
```
POST   /api/admin/classes                         — create class
GET    /api/admin/classes                         — list all classes
POST   /api/admin/classes/:classId/subjects       — create subject
GET    /api/admin/classes/:classId/subjects       — list subjects for class
POST   /api/admin/teachers                        — create teacher + Firebase Auth account
POST   /api/admin/allocate                        — assign teacher to subject/class (junction)
DELETE /api/admin/allocate/:junctionId            — remove teacher allocation
POST   /api/admin/students                        — create student + Firebase Auth account
GET    /api/admin/students                        — list all students (optionally filtered by classId)
GET    /api/admin/analytics/classes               — class-wide and subject-wide averages
GET    /api/admin/analytics/concepts/:conceptId/health — concept health metric
POST   /api/admin/analytics/concepts/:conceptId/reteach — send reteach notification
```

### Teacher Routes (require role: teacher)
```
GET    /api/teacher/classes                       — classes assigned to authenticated teacher (via junctions)
GET    /api/teacher/classes/:classId/subjects     — subjects in teacher's junction for this class
POST   /api/teacher/textbooks                     — initiate textbook upload (returns signed upload URL + creates doc)
GET    /api/teacher/textbooks                     — list teacher's textbooks
GET    /api/teacher/textbooks/:textbookId/chapters — chapters + concepts tree
POST   /api/teacher/textbooks/:textbookId/reprocess — re-enqueue AI pipeline for failed textbook
POST   /api/teacher/templates                     — create test template
GET    /api/teacher/templates                     — list teacher's templates
POST   /api/teacher/question-papers              — compile question paper from template + concept/chapter
GET    /api/teacher/question-papers              — list question papers
POST   /api/teacher/tests                        — publish test
GET    /api/teacher/tests                        — list tests
POST   /api/teacher/tests/:testId/close          — manually close a test
POST   /api/teacher/tests/:testId/republish      — republish as interactive mode
```

### Student Routes (require role: student)
```
GET    /api/student/tests                        — tests released for student's class
GET    /api/student/tests/:testId                — test details + question paper (for active session)
POST   /api/student/tests/:testId/submit         — submit test answers
GET    /api/student/submissions                  — student's submission history
```

### Notifications
```
GET    /api/notifications                        — list notifications for authenticated user
PATCH  /api/notifications/:id/read              — mark notification as read
```

---

## 5. Frontend Route Structure

```typescript
// src/app/router.tsx

<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />

  {/* Admin Portal */}
  <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="classes" element={<ClassesPage />} />
      <Route path="classes/:classId/subjects" element={<SubjectsPage />} />
      <Route path="teachers" element={<TeachersPage />} />
      <Route path="students" element={<StudentsPage />} />
      <Route path="allocate" element={<AllocatePage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
    </Route>
  </Route>

  {/* Teacher Portal */}
  <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
    <Route path="/teacher" element={<TeacherLayout />}>
      <Route index element={<TeacherDashboard />} />
      <Route path="classes" element={<TeacherClassesPage />} />
      <Route path="classes/:classId/subjects/:subjectId" element={<SubjectPage />} />
      <Route path="textbooks" element={<TextbooksPage />} />
      <Route path="textbooks/:textbookId" element={<TextbookDetailPage />} />
      <Route path="templates" element={<TemplatesPage />} />
      <Route path="tests" element={<TeacherTestsPage />} />
    </Route>
  </Route>

  {/* Student Portal */}
  <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
    <Route path="/student" element={<StudentLayout />}>
      <Route index element={<StudentDashboard />} />
      <Route path="tests" element={<StudentTestsPage />} />
    </Route>
  </Route>

  {/* Exam Consoles — fullscreen, no layout shell */}
  <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
    <Route path="/exam/:testId" element={<NormalConsole />} />
    <Route path="/interactive/:testId" element={<InteractiveConsole />} />
  </Route>

  {/* Fallback */}
  <Route path="*" element={<Navigate to="/login" replace />} />
</Routes>
```

### ProtectedRoute Component
```typescript
// src/components/ProtectedRoute.tsx
// Reads role from authStore, redirects to /login if unauthenticated,
// redirects to role-appropriate dashboard if role mismatch.
```

---

## 6. State Management

### Zustand Stores

**`src/store/authStore.ts`**
```typescript
interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User, firebaseUser: FirebaseUser) => void;
  clearUser: () => void;
}
```

**`src/store/examStore.ts`** (Normal Console session)
```typescript
interface ExamState {
  testId: string | null;
  questions: Question[];
  answers: Record<string, string>;          // questionId → selectedAnswer
  questionStatus: Record<string, QuestionStatus>; // Unvisited | Visited | Attempted | MarkedForReview
  currentIndex: number;
  timeRemainingMs: number;
  isSubmitted: boolean;
  startSession: (test: Test, paper: QuestionPaper) => void;
  navigateTo: (index: number) => void;
  setAnswer: (questionId: string, answer: string) => void;
  clearAnswer: (questionId: string) => void;
  markForReview: (questionId: string) => void;
  tick: () => void;
  submit: () => void;
}
type QuestionStatus = "unvisited" | "visited" | "attempted" | "marked";
```

**`src/store/notificationStore.ts`**
```typescript
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[]) => void;
  markRead: (id: string) => void;
}
```

### React Query Key Factory
```typescript
// src/lib/queryKeys.ts
export const keys = {
  classes: () => ["classes"] as const,
  class: (id: string) => ["classes", id] as const,
  subjects: (classId: string) => ["subjects", classId] as const,
  teachers: () => ["teachers"] as const,
  students: (classId?: string) => ["students", classId] as const,
  junctions: () => ["junctions"] as const,
  textbooks: () => ["textbooks"] as const,
  textbook: (id: string) => ["textbooks", id] as const,
  templates: () => ["templates"] as const,
  papers: () => ["papers"] as const,
  tests: (role: string) => ["tests", role] as const,
  test: (id: string) => ["tests", id] as const,
  submissions: () => ["submissions"] as const,
  analytics: (classId: string) => ["analytics", classId] as const,
  conceptHealth: (conceptId: string) => ["conceptHealth", conceptId] as const,
};
```

---

## 7. RBAC Middleware Design

### Backend Middleware

**`backend/src/middlewares/verifyToken.ts`**
```typescript
// Uses firebase-admin to decode the Firebase ID token from Authorization: Bearer <token>
// Attaches decoded token to req.user
// Returns 401 if token missing or invalid
```

**`backend/src/middlewares/requireRole.ts`**
```typescript
export const requireRole = (...roles: Role[]) => 
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
```

### Frontend Auth Hook

**`src/hooks/useAuth.ts`**
```typescript
// Wraps Firebase onAuthStateChanged
// On auth state change: fetches user doc from Firestore, sets authStore
// Exposes: { user, isLoading, isAuthenticated, signIn, signOut }
```

---

## 8. AI Pipeline Design

**`backend/src/jobs/aiPipeline.ts`**

The pipeline is an async function called immediately after the Textbook document is created. For production scale, this would be wrapped in a job queue (e.g., Bull/BullMQ with Redis); for the initial implementation it runs as a detached async process triggered from the POST /api/teacher/textbooks endpoint via `process.nextTick`.

```typescript
export async function runAIPipeline(textbookId: string): Promise<void>

// Steps:
// 1. Fetch textbook doc from Firestore (get storagePath)
// 2. Download PDF buffer from Firebase Storage via admin SDK
// 3. Extract text using a PDF-to-text utility (pdf-parse npm package)
// 4. Build LLM prompt: "Given this textbook content, extract chapters and for each chapter extract concepts with notes, video link suggestions, and generate 50+ questions per concept covering all 7 question types (mcq, true_false, fill_blank, matching, descriptive, numerical, passage) at easy/medium/hard/hots difficulties. Return structured JSON."
// 5. Call Gemini API (REST: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent)
// 6. Parse JSON response → validate structure
// 7. Write chapters subcollection, then for each chapter write concepts subcollection
// 8. Update textbook status to "ready"
// On any error: update status to "failed" + write failureReason + send notification
```

**LLM Response Schema (expected from Gemini):**
```typescript
interface LLMResponse {
  chapters: Array<{
    title: string;
    order: number;
    summary: string;
    concepts: Array<{
      title: string;
      order: number;
      notes: string;
      videoLinks: string[];
      questions: Array<Omit<Question, "id" | "conceptId">>;
    }>;
  }>;
}
```

---

## 9. Question Reformatting Service

**`backend/src/services/questionReformatter.ts`**

```typescript
// Supported reformatting matrix:
// mcq → true_false  ✓
// mcq → fill_blank  ✓
// all others        ✗ (returns error)

export function reformatToTrueFalse(q: Question): Question {
  // Constructs: text = `${q.text} ${q.correctAnswer}`
  // type = "true_false"
  // options = ["True", "False"]
  // correctAnswer = "true"  (preserved as "true" string)
  // points = q.points (unchanged)
}

export function reformatToFillBlank(q: Question): Question & { validator: (ans: string) => boolean } {
  // Replaces correctAnswer text in q.text with "___"
  // type = "fill_blank"
  // options = undefined (removed)
  // correctAnswer = q.correctAnswer (preserved)
  // validator = (ans) => ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
}

export function reformat(q: Question, targetType: QuestionType): Question {
  if (q.type === "mcq" && targetType === "true_false") return reformatToTrueFalse(q);
  if (q.type === "mcq" && targetType === "fill_blank") return reformatToFillBlank(q);
  throw new ReformatError(`Unsupported reformat: ${q.type} → ${targetType}`);
}
```

### Question Paper Compilation

**`backend/src/services/questionPaperCompiler.ts`**

```typescript
export async function compileQuestionPaper(
  template: Template,
  conceptId: string,     // or chapterId
  scope: "concept" | "chapter"
): Promise<QuestionPaper>

// Steps:
// 1. Fetch all questions from the concept(s) in scope
// 2. For each difficulty tier (easy/medium/hard/hots):
//    a. Calculate count = Math.round(template.questionCount * (distribution[tier] / 100))
//    b. Filter questions by difficulty AND by allowedFormats
//    c. If count > available: throw InsufficientQuestionsError with tier + shortfall
//    d. Randomly sample `count` questions from the filtered pool
// 3. Merge all selected questions
// 4. If jumbleQuestions: shuffle the merged array (Fisher-Yates)
// 5. Apply reformatting: for each question, if its type is not in allowedFormats,
//    find first allowed format that can be derived from it via reformat()
// 6. Calculate totalPoints = sum of all question.points
// 7. Persist to question_papers collection
// 8. Return QuestionPaper
```

---

## 10. Profiling Engine Design

**`backend/src/services/profilingEngine.ts`**

```typescript
const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 0, medium: 1, hard: 2, hots: 2,
};

export function calculateAccuracy(earnedPoints: number, totalPoints: number): number {
  if (totalPoints === 0) return 0;
  return (earnedPoints / totalPoints) * 100;
}

export function calculateComplexity(answers: AnswerRecord[]): number {
  const correctAnswers = answers.filter(a => a.isCorrect);
  if (correctAnswers.length === 0) return 0;
  return Math.max(...correctAnswers.map(a => DIFFICULTY_RANK[a.difficulty]));
}

export function determineLevel(accuracy: number, complexity: number): AdaptiveLevel {
  if (accuracy >= 85 && complexity >= 2) return "advanced";
  if (accuracy >= 70 && complexity >= 1) return "intermediate";
  return "beginner";
}

// Atomic write with retry (up to 3 attempts)
export async function persistSubmissionWithLevel(
  db: Firestore,
  submission: Omit<Submission, "id">,
  studentUid: string,
  newLevel: AdaptiveLevel,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await db.runTransaction(async (tx) => {
        const subRef = db.collection("submissions").doc();
        const userRef = db.doc(`users/${studentUid}`);
        tx.set(subRef, submission);
        tx.update(userRef, { level: newLevel });
      });
      return;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
    }
  }
}
```

---

## 11. Exam Console Architecture

### Normal Console (`/exam/:testId`)

**`src/hooks/useExamSession.ts`**
```typescript
// - Loads test + paper via React Query on mount
// - Initializes examStore with questions (all status = "unvisited")
// - Runs setInterval every 1s to tick() the store
// - On timeRemainingMs === 0: calls submitAnswers mutation, navigates to /student
// - Handles beforeunload to warn about leaving
```

**`src/hooks/useFullscreen.ts`**
```typescript
// - Calls document.documentElement.requestFullscreen() on mount
// - Listens for fullscreenchange event
// - If fullscreen exits: shows warning dialog, does NOT end session
// - Exposes: { isFullscreen, requestFullscreen, exitFullscreen }
```

**`src/components/exam/QuestionPalette.tsx`**
```typescript
// Props: questions: Question[], statuses: Record<string, QuestionStatus>, currentIndex: number,
//        onNavigate: (index: number) => void
// Renders grid of colored boxes:
//   unvisited  → gray circle
//   visited    → yellow circle
//   attempted  → green circle
//   marked     → blue circle
// Floating panel, always visible
```

**`src/pages/NormalConsole.tsx`**
```typescript
// Layout: fullscreen div with:
//   - Top bar: test title, MM:SS timer (red when < 60s), submit button
//   - Main: current question renderer (by type)
//   - Right sidebar: QuestionPalette
//   - Bottom: prev/next navigation, "Mark for Review" button
```

### Interactive Console (`/interactive/:testId`)

**Per-question state machine:**
```
UNANSWERED → (select wrong) → INCORRECT → (retry) → INCORRECT | CORRECT
           → (select correct) → CORRECT → (auto-advance after 1000–2000ms)
INCORRECT (all options exhausted) → REVEAL_CORRECT → (auto-advance)
```

**`src/hooks/useInteractiveSession.ts`**
```typescript
// Manages: currentIndex, perQuestionState, firstAttemptCorrect counts
// Provides: selectAnswer(questionId, answer) — drives state machine
// On correct: schedules auto-advance via setTimeout(1000–1500)
// On exhausted: reveals correct, schedules auto-advance
// On last question: calls submit mutation
```

**`src/hooks/useAudioCues.ts`**
```typescript
// Uses Web Audio API (AudioContext) to synthesize:
//   playSuccess(): short ascending tone (440Hz → 880Hz, 0.3s)
//   playError(): short descending buzz (300Hz → 150Hz, 0.2s)
// Falls back silently if AudioContext is unavailable (try/catch)
```

**`src/pages/InteractiveConsole.tsx`**
```typescript
// Single question view with Framer Motion variants:
//   errorVariant: red border + shake animation
//   successVariant: green border + scale-up animation
// Results summary on completion: total questions, correct-first-attempt count, score %
```

---

## 12. Notification System Design

### Firestore Real-time Listener

**`src/hooks/useNotifications.ts`**
```typescript
// On mount: sets up onSnapshot listener on notifications collection
//   where recipientId == currentUser.uid, orderBy createdAt desc, limit 50
// Updates notificationStore on each snapshot
// Cleans up listener on unmount
```

### Notification Creation (Backend)

**`backend/src/services/notificationService.ts`**
```typescript
export async function notifyStudentsOfTest(testId: string, classId: string): Promise<void>
// Queries all students where classId == classId
// Batch-writes notification docs for each student

export async function notifyTeacherReteach(
  teacherId: string, className: string, subjectName: string, conceptTitle: string
): Promise<void>

export async function notifyStudentOverdue(studentId: string, testId: string): Promise<void>
// Called by a scheduled check (cron-style setTimeout loop in backend startup,
// runs every 5 minutes, queries tests where dueDate < now, submits < count)
```

---

## 13. Concept Health Calculation

**`backend/src/services/analyticsService.ts`**

```typescript
export async function calculateConceptHealth(
  conceptId: string, classId: string
): Promise<number> {
  // 1. Count enrolled students in classId
  // 2. Find all submissions for tests that include questions from conceptId
  // 3. For each student, check if they scored ≥60% on questions from this concept
  // 4. conceptHealth = (students who passed / total enrolled students) * 100
  // 5. If < 50%: flag concept
  return healthPercentage;
}
```

Triggered after every submission persistence in `TestService.submitTest()`.

---

## 14. Security Design

### Backend
- `helmet()` — sets secure HTTP headers
- `cors({ origin: "http://localhost:5173", credentials: true })`
- All routes except `/api/auth/verify-token` require `verifyToken` middleware
- Role-scoped routes additionally use `requireRole()` middleware
- Password generation: `crypto.randomBytes(16).toString("base64")` then filtered to include at least one of each required character class; minimum 12 chars

### Firestore Security Rules (outline)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // Users can only read their own doc; admin can read all
    match /users/{uid} {
      allow read: if request.auth.uid == uid || isAdmin();
      allow write: if isAdmin();
    }
    // Classes readable by all authenticated; writable by admin only
    match /classes/{classId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    // Notifications: only recipient can read/update
    match /notifications/{nid} {
      allow read, update: if request.auth.uid == resource.data.recipientId;
    }
    // All other writes go through backend (firebase-admin bypasses rules)
    function isAdmin() {
      return get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
  }
}
```

### Firebase Storage Rules (outline)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /textbooks/{textbookId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // further scoped to teacher role in backend
    }
  }
}
```

---

## 15. Backend File Structure

```
backend/src/
  index.ts                          # Express app setup, middleware, route mounting
  config/
    firebase.ts                     # firebase-admin initialization
    env.ts                          # env variable validation with zod
  middlewares/
    verifyToken.ts
    requireRole.ts
  validators/
    class.validator.ts
    subject.validator.ts
    teacher.validator.ts
    student.validator.ts
    template.validator.ts
    test.validator.ts
    submission.validator.ts
  controllers/
    admin.controller.ts
    teacher.controller.ts
    student.controller.ts
    notification.controller.ts
    analytics.controller.ts
  services/
    classService.ts
    subjectService.ts
    userService.ts                  # teacher + student creation
    junctionService.ts
    textbookService.ts
    templateService.ts
    questionPaperCompiler.ts
    questionReformatter.ts
    testService.ts
    submissionService.ts
    profilingEngine.ts
    notificationService.ts
    analyticsService.ts
  jobs/
    aiPipeline.ts
  routes/
    admin.routes.ts
    teacher.routes.ts
    student.routes.ts
    notification.routes.ts
    analytics.routes.ts
  utils/
    passwordGenerator.ts
    studentIdGenerator.ts
    shuffle.ts
    errors.ts                       # AppError class with status codes
  types/
    index.ts
```

## 16. Frontend File Structure

```
frontend/src/
  main.tsx                          # React root, QueryClientProvider, RouterProvider
  app/
    router.tsx                      # All routes with ProtectedRoute wrappers
    providers.tsx                   # Zustand + React Query + Toast providers
  components/
    ProtectedRoute.tsx
    RoleRedirect.tsx
    ui/                             # shadcn-style: Button, Input, Select, Dialog, Badge, etc.
    exam/
      QuestionPalette.tsx
      QuestionRenderer.tsx          # Renders question by type (MCQ, TrueFalse, FillBlank, etc.)
      TimerDisplay.tsx
  layouts/
    AdminLayout.tsx
    TeacherLayout.tsx
    StudentLayout.tsx
  hooks/
    useAuth.ts
    useFullscreen.ts
    useExamSession.ts
    useInteractiveSession.ts
    useAudioCues.ts
    useNotifications.ts
  pages/
    LoginPage.tsx
    admin/
      AdminDashboard.tsx
      ClassesPage.tsx
      SubjectsPage.tsx
      TeachersPage.tsx
      StudentsPage.tsx
      AllocatePage.tsx
      AnalyticsPage.tsx
    teacher/
      TeacherDashboard.tsx
      TeacherClassesPage.tsx
      SubjectPage.tsx
      TextbooksPage.tsx
      TextbookDetailPage.tsx
      TemplatesPage.tsx
      TeacherTestsPage.tsx
    student/
      StudentDashboard.tsx
      StudentTestsPage.tsx
    NormalConsole.tsx
    InteractiveConsole.tsx
  services/
    api.ts                          # axios/fetch base instance with token injection
    adminApi.ts
    teacherApi.ts
    studentApi.ts
    notificationApi.ts
    analyticsApi.ts
  store/
    authStore.ts
    examStore.ts
    notificationStore.ts
  types/
    index.ts
  utils/
    cn.ts                           # clsx + tailwind-merge
    formatDate.ts
    formatTimer.ts                  # ms → MM:SS
  lib/
    queryKeys.ts
    queryClient.ts
```
