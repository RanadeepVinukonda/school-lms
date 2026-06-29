# Full‑Context Overview of the School‑LMS Application

**Designed to help you plug‑in additional AI services or replace existing ones.**

---

## 1️⃣ High‑Level Architecture

```
├─ frontend/            ← Next.js (React) + TypeScript UI
│   ├─ src/app/pages/   ← Teacher & Student pages (routing is file‑based)
│   ├─ src/components/  ← UI widgets (mind‑map editor, quiz builder, etc.)
│   ├─ src/types/       ← Types shared across the app (Quiz, MindMap, Concept …)
│   └─ src/services/    ← Thin API wrappers (axios calls to backend)
│
├─ backend/             ← Express + TypeScript API
│   ├─ src/controllers/ ← One controller per domain (quiz‑v2, mindmap, concept, …)
│   ├─ src/services/    ← Business logic, DB access, AI integration
│   ├─ src/middleware/ ← auth, role‑check, async handler, error handling
│   └─ src/database/    ← Supabase adapter (collections, RPC helpers)
│
├─ mobile/              ← React‑Native (not required for core flow)
│
├─ api/                 ← Vercel serverless functions (alternative entry points)
│
├─ supabase/
│   └─ migrations/      ← PostgreSQL schema (concept_questions, concept_releases,…)
│
└─ firebase/ (implicit)← Firebase Auth is used for identity (via auth middleware)
```

### Key External Services

| Service | Purpose | Entry Point |
|---------|---------|-------------|
| **Supabase (PostgreSQL + JSONB)** | Persistent data: textbooks, chapters, concepts, question bank, quiz/exam records, mind‑maps (stored as JSONB docs). | `backend/src/database/adapter.ts` (collections helpers) |
| **Firebase Auth** | User authentication & role (teacher/student) – token validated by `auth.middleware`. | `frontend` uses Firebase SDK; backend reads `req.user!.uid`. |
| **OpenAI (ChatGPT / GPT‑4)** | AI‑generated questions (`nep‑questions.service`), AI tutor responses (`ai.service`), optional AI‑generated mind‑maps (you can hook here). | Calls made from `services/*.service.ts` via `fetch`/`axios`. |
| **Google Cloud Vision / OCR** | Extract text from scanned textbook pages. | `ocr.service.ts` → `ocr.controller.ts`. |
| **YouTube API** | Pull relevant videos for a concept. | `youtube.service.ts`. |
| **Cloudinary** | Store and serve uploaded assets (e.g., textbook images, student submissions). | `backend/src/services/cloudinary.service.ts`. |

---

## 2️⃣ Data Model (Supabase schema)

| Table / Collection | Main fields | Comments |
|-------------------|------------|----------|
| **concept_questions** | `id`, `text`, `type`, `difficulty`, `points`, `concept_id`, `created_at`, `updated_at`, `author_id` | Question bank for each concept. |
| **concept_releases** | `class_id`, `textbook_id`, `chapter_id`, `concept_id`, `questionBankReleased`, `assignmentsReleased`, `mindMapReleased` | Flags controlling what students can see. |
| **quizzes‑v2** | `id`, `title`, `description`, `class_id`, `subject_id`, `textbook_id`, `chapter_id`, `concept_id`, `questions` (JSON), `releasedAt`, `timeLimitMinutes`, `maxAttempts`, … | Auto‑released when created (`releasedAt = now()`). |
| **assignments‑v2** (deprecated) | Same fields as quizzes, but used for “practice” – now being phased out. |
| **mindmaps** (nosql_docs collection) | `id`, `title`, `description`, `ownerId`, `nodes[]`, `edges[]`, `sharedWith[]`, timestamps | JSONB document, manipulated via `mindmap.service`. |
| **whiteboards** | `teacherId_conceptId` doc with canvas strokes. | Used on the concept view page. |
| **students / teachers / classes / textbooks / chapters / concepts** | Regular reference tables (mostly relational). | Managed by the `textbook.service`, `class.service`, etc. |

*All timestamps are ISO strings; soft‑delete columns (`deletedAt`) added by migration 002.*

---

## 3️⃣ Core Backend Modules

| Module | What it does | Key Functions |
|--------|--------------|---------------|
| **quiz‑v2.service** | Creates a quiz from a concept’s question bank + AI‑generated filler; auto‑releases. | `createQuiz`, `startQuizAttempt`, `submitQuizAttempt`, `getQuizForConcept`. |
| **assignment‑v2.service** *(being deprecated)* | Same as quiz‑v2 but for “practice” assignments. | `createAssignment`, `startAssignmentAttempt`, … |
| **concept‑questions.service** | Fetches and upserts rows in `concept_questions`. | `fetchConceptQuestions`, `upsertConceptQuestions`. |
| **mindmap.service** | CRUD for mind‑maps, sharing, pinning resources. | `createMindMap`, `getMindMapById`, `updateMindMap`, `pinResource`. |
| **nep‑questions.service** | Generates AI‑powered questions for a concept (OpenAI). | `generateQuestions`, `saveQuestions`. |
| **ocr.service** | Maps scanned OCR text to a concept, then can auto‑create assignments/quizzes. | `mapTextToConcept`, `generateAssignmentFromText`, `generateQuestionsFromText`. |
| **youtube.service** | Searches YouTube for videos matching a concept. | `searchVideosForConcept`. |
| **ai.service** | General “tutor” chat endpoint – builds a system prompt from a concept and forwards to OpenAI. | `chatWithTutor`. |
| **mindmap.controller**, **quiz‑v2.controller**, **assignment‑v2.controller**, **concept.controller**, … | Thin wrappers that expose the above services via HTTP endpoints. |
| **middleware/auth** | Verifies Firebase token, attaches `req.user!.uid`. |
| **middleware/role** | Enforces `teacher` / `student` / `admin` roles on routes. |

---

## 4️⃣ Frontend Structure

### 4.1 Layout & Navigation
* **TeacherLayout.tsx** – Desktop/sidebar + mobile bottom nav (Home, Teaching Space, Mind Maps, Tests, OCR). 
* **StudentLayout.tsx** – Sidebar includes: Home, Tasks, Exams, AI Tutor, Profile, Rewards, Leaderboard, Labs, Mind Maps, Coding, Scan Page, etc.

### 4.2 Major Teacher Pages
| Page | URL (via `ROUTES`) | Core UI |
|------|--------------------|--------|
| **TeacherConceptViewPage** (`/teacher/concepts/:id`) | Shows concept details, videos, question bank, notes, key points, release toggles (questionBank, assignments, mindMap). | Includes **“Push Mind Map”** button (new) that calls `POST /mindmaps`. |
| **TeacherMindMapsPage** (`/teacher/mindmaps`) | List of teacher’s mind‑maps, create new, share, delete. |
| **TeacherMindMapEditorPage** (`/teacher/mindmaps/:id/edit`) | Full‑screen mind‑map editor (`MindMapBuilder`), pin resource dialog, sharing UI. |
| **TeacherAssessmentCreatePage** (`/teacher/assessments`) | **Now only “Quiz”** creation (assignment UI stripped out). Handles AI preview, question model selection, quiz settings, auto‑release. |
| **TeacherTestSchedulePage** (`/teacher/test-schedule`) | Calendar view of upcoming quizzes/exams. |
| **TeacherOCRPage** (`/teacher/ocr`) | Upload image → OCR → auto‑generate assignment/quiz. |
| **TeacherNEPQuestionsPage** (`/teacher/nep-questions`) | Generate AI‑driven questions for a concept. |
| **TeacherTextbookDetailPage** (`/teacher/textbooks/:id`) | Tabbed view: Overview, Chapters, Concepts, Mind Map (chapter‑wide graph). |
| **TeacherAnalyticsPage**, **TeacherDashboardPage**, etc. | Summary metrics, quick actions, grading queues. |

### 4.3 Major Student Pages
| Page | URL | Core UI |
|------|-----|--------|
| **StudentTasksPage** (`/student/tasks`) | Pulls assignments, quizzes, exams (via `/assignments-v2`, `/quizzes-v2`, `/exams-v2`). Shows filters, overdue, today, later sections. |
| **StudentMindMapsPage** (`/student/mindmaps`) | List of mind‑maps shared with the student. |
| **StudentConceptPage** (`/student/concepts/:id`) | Shows concept details **only if `mindMapReleased` is true**; otherwise shows “locked” overlay. |
| **StudentQuizTakePageV2** (`/student/quizzes/:id/take`) | Takes a quiz (questions from `quiz.questions` JSON). |
| **StudentExamPage** (`/student/exams/:id`) | Similar to quiz take but for exams. |
| **StudentAI Tutor** (`/student/ai-tutor`) | Chat UI backed by `ai.service`. |
| **StudentOCRPage**, **StudentCodingPage**, **StudentLabPage**, etc. | Various interactive tools. |

### 4.4 API Wrapper (`frontend/src/services/*.ts`)
Each service is a thin wrapper around the backend endpoints:
* `quizService.ts` → `GET /quizzes-v2`, `POST /quizzes-v2`, etc.  
* `mindmapService.ts` → `POST /mindmaps`, `GET /mindmaps/:id`, `PUT /mindmaps/:id`, `POST /mindmaps/:id/pin-resource`, etc.  
* `nepQuestionsService.ts`, `ocrService.ts`, `youtubeService.ts`, `assignmentService.ts` (still present but not used after de‑dup).  
All wrappers expose **React‑Query** hooks (`useMutation`, `useQuery`) in the UI components.

---

## 5️⃣ Data Flow for a Typical Teacher Workflow
1. **Select Concept** → `TeacherConceptViewPage` loads concept data (textbook → chapter → concept).  
2. **Release Settings** → Toggle `questionBankReleased`, `assignmentsReleased`, `mindMapReleased` → `setConceptRelease` updates `concept_releases` row.  
3. **Push Mind Map** → Click “Push Mind Map” → `pushMindMapMutation` posts to `/mindmaps` creating a simple mind‑map document with the concept title; the map appears in the teacher’s mind‑map list and can be shared.  
4. **Generate Quiz** → Click “Generate AI Preview” → `nep‑questions.service` creates AI‑questions → `quiz‑v2.service.createQuiz` merges bank + AI questions → `releasedAt = now()` (auto‑release).  
5. **Student View** → `StudentTasksPage` fetches only auto‑released quizzes (no assignments). Student sees the quiz instantly, takes it, receives instant results (via `showResults:true`).

---

## 6️⃣ Extending with New AI Services
1. **Add a Service** – Create a new file in `backend/src/services/<my‑ai>.service.ts`. Implement the core logic (call external AI APIs, process results) and export functions that accept the authenticated `userId` and any needed payload.
2. **Expose a Controller** – Add a corresponding controller in `backend/src/controllers/<my‑ai>.controller.ts`. Use `asyncHandler` middleware, `sendSuccess`/`sendCreated`.
3. **Register Route** – In `backend/src/routes/<my‑ai>.routes.ts` (or directly in `router/index.ts`) add the endpoint path and attach the controller.
4. **Frontend Wrapper** – Add a thin TypeScript wrapper in `frontend/src/services/<my‑ai>.ts` that calls the new endpoint (axios).
5. **UI Integration** – Import the wrapper where needed (e.g., a new tab in `TeacherConceptViewPage` or a new button on the student side). Use React‑Query hooks (`useMutation`, `useQuery`) to invoke it.
6. **Authorization** – Ensure the route uses `authenticate` + appropriate `requireRole` middleware (teacher vs. student).

*Because the codebase already follows a **service → controller → route → UI** pattern, you can drop in a new AI module with minimal boilerplate.*

---

## 7️⃣ Current “Cleanup” Status (post‑pony‑tail actions)
| Item | State |
|------|-------|
| **Quiz auto‑release** | Implemented – `releasedAt` set on creation; release button removed. |
| **Assignments** | UI removed from teacher assessment page; dashboard dead links now point to `/teacher/assessments`. The backend `assignment‑v2` service is still present but not used. |
| **Mind‑Map push** | New “Push Mind Map” button added to `TeacherConceptViewPage`; creates a simple mind‑map via existing `mindmap` API. |
| **Database** | Migration `010_add_points_to_concept_questions.sql` applied; `concept_releases` table contains `mindMapReleased` flag. No `mindmaps` table – stored as JSONB docs (`nosql_docs`). |
| **AI generation** | `nep‑questions.service` (OpenAI) and `ocr.service` still active; can be swapped out by swapping the underlying calls. |
| **Routing** | All current routes compile; the only “orphan” paths are `/teacher/assignments` (dead link) – safe to delete later. |

---

## 8️⃣ Quick Reference for Adding a New AI Feature
```ts
// backend/src/services/myAi.service.ts
import { collections } from '../database/adapter';
import { sendSuccess } from '../utils/response';

export async function generateMyAiResult(userId: string, payload: any) {
  // Call external AI (e.g., OpenAI, Anthropic)
  const aiResp = await fetch('https://api.openai.com/v1/…', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(r => r.json());

  // Store result if needed
  await collections.my_ai_results().add({
    userId,
    result: aiResp,
    createdAt: new Date().toISOString(),
  });

  return aiResp;
}
```
```ts
// backend/src/controllers/myAi.controller.ts
import { Request, Response } from 'express';
import * as myAiService from '../services/myAi.service';
import { sendSuccess } from '../utils/response';

export async function runMyAi(req: Request, res: Response) {
  const result = await myAiService.generateMyAiResult(req.user!.uid, req.body);
  sendSuccess(res, result, 'AI result generated');
}
```
```ts
// backend/src/routes/myAi.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/myAi.controller';
import { authenticate, requireRole } from '../middlewares';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole('teacher', 'admin'),
  asyncHandler(ctrl.runMyAi)
);

export default router;
```
```ts
// frontend/src/services/myAiService.ts
import api from '@/utils/api';

export const myAiService = {
  run: (payload: any) => api.post('/my-ai', payload).then(r => r.data.data),
};
```
```tsx
// In any teacher page (e.g., TeacherConceptViewPage)
const generateMyAi = useMutation({
  mutationFn: (payload) => myAiService.run(payload),
  onSuccess: (data) => toast.success('AI done!'),
  onError: () => toast.error('AI failed'),
});

<Button onClick={() => generateMyAi.mutate({ conceptId })}>
  Run My AI
</Button>
```

---

### TL;DR
* **Backend**: Express + Supabase, modular services/controllers. 
* **Frontend**: Next.js with TypeScript, React‑Query, component library, separate teacher & student layouts. 
* **AI**: Already wired via `nep‑questions.service`, `ai.service`, `ocr.service`, `youtube.service`. Add new AI by mirroring that pattern. 
* **Data**: Core relational tables + JSONB collections (`mindmaps`). Use Supabase migrations to evolve schema. 
* **Current state**: Assignments deprecated, quizzes auto‑released, mind‑map push button added. 

You can now **hook any external AI** (LLM, image generator, recommendation engine, etc.) by creating a new service + controller, exposing an endpoint, and calling it from the UI where needed. The existing patterns make this straightforward and keep the rest of the system untouched.
