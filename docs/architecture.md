# Genesis LMS — Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20, TypeScript 5.5, Express.js 4.21 |
| **Database** | Supabase (PostgreSQL 15) + pgvector |
| **Web Frontend** | React 18, TypeScript 5.6, Vite 6 |
| **Mobile** | Expo SDK 51/52, React Native 0.74 (3 apps: student, teacher, parent + shared) |
| **Auth** | Supabase Auth (JWT) + Firebase Admin (FCM only) |
| **DB Adapter** | Custom Firestore-compatible adapter over `@supabase/supabase-js` + raw `pg` driver |
| **Job Queue** | pg-boss (PostgreSQL-based) |
| **AI** | Gemini API (primary) / OpenRouter (fallback), embeddings via `@xenova/transformers` |
| **State (Web)** | Zustand 5 + TanStack React Query 5 |
| **Styling (Web)** | Tailwind CSS 3 + Radix UI + shadcn/ui + Framer Motion 11 |
| **Validation** | Zod 3 (backend + frontend) |
| **Deployment** | Vercel (serverless + static SPA) |

## High-Level Architecture

```
┌─────────────────────────┐     ┌─────────────────────────┐
│     WEB FRONTEND        │     │       MOBILE APP        │
│  React 18 + Vite 6     │     │  Expo 52 + RN 0.76      │
│  ┌───────────────────┐  │     │  ┌──────────────────┐   │
│  │ supabase-js       │  │     │  │ supabase-js     │   │
│  │ (Auth + direct DB)│  │     │  │ (Auth + direct  │   │
│  │ Axios → Bearer JWT│  │     │  │  DB reads)      │   │
│  └───────────────────┘  │     │  │ Axios → Bearer  │   │
└──────┬──────────────────┘     │  │ JWT             │   │
       │                        │  └──────────────────┘   │
       │ Axios + Bearer JWT     └──────────┬──────────────┘
       ▼                                   ▼
┌──────────────────────────────────────────────────────────┐
│                 BACKEND (Express.js)                      │
│                                                          │
│  Middleware Pipeline:                                     │
│  Helmet → CORS → express.json → Morgan → /api prefix     │
│  → Rate Limiting (4 tiers) → 45 Route Groups             │
│  → Error Handler                                          │
│                                                          │
│  ┌─────────┬─────────┬────────┬────────┬────────┐       │
│  │ Routes  │Services │ Jobs   │Validat.│ Utils  │       │
│  │71 imp   │77 files │6 files │16 files│ 4 files│       │
│  │→45 grps │~8K LOC  │pg-boss │ Zod    │helpers │       │
│  └─────────┴─────────┴────────┴────────┴────────┘       │
└──────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL 15)                     │
│  ┌──────────┬──────────────────┬────────────────────┐     │
│  │ Auth JWT │  11 Typed Tables │ nosql_docs (JSONB) │     │
│  │ Sessions │  + pgvector      │ 40+ collections   │     │
│  │ Passwords│  (384-dim)       │                    │     │
│  └──────────┴──────────────────┴────────────────────┘     │
│  + Storage (textbooks, avatars buckets)                   │
└──────────────────────────────────────────────────────────┘
```

**Data Flow:**
- **Direct DB reads** (supabase-js SDK): auth ops, user profiles, textbook content
- **Backend via Axios**: all CRUD on classes, subjects, exams, assignments, quizzes, grades, attendance, coding, mindmaps, gamification, OCR, AI tutor, etc.

## Routing (65+ pages, role-based)

```
/student/*  (28 routes) — dashboard, subjects, exams, textbooks, ai-tutor,
                          gamification, labs, mindmaps, coding, OCR, etc.
/k2/*       (6 routes)  — pre-primary: tracing, phonics, stories, flashcards
/teacher/*  (28 routes) — dashboard, classes, subjects, exams, attendance,
                          mindmaps, NEP, OCR, analytics, etc.
/admin/*    (18 routes) — dashboard, classes, users, school-analytics, fee,
                          transport, inventory, HR, LTI, etc.
/parent/*   (5 routes)  — dashboard, children, reports, profile
```

Each wrapped in `ProtectedRoute` (loading → spinner | !auth → /login | wrong role → role dashboard | setup needed → setup page).

## API — 45 Route Groups (~180+ endpoints)

| Area | Key Routes |
|------|-----------|
| **Auth** | register, login, logout, forgot/reset password, profile |
| **Users** | CRUD, roles, toggleActive |
| **Classes** | CRUD, roster, add/remove students |
| **Subjects** | CRUD |
| **Textbooks** | CRUD, chapters, concepts, AI pipeline (OCR → LLM → embeddings) |
| **Exams/Quizzes** | CRUD (v1+v2), attempt, release, grade, proctoring |
| **Assignments** | CRUD (v1+v2), submit, grade |
| **AI** | Chat completion, tutor, question generation, rubric |
| **OCR** | Scan, chat, push to quiz/assignment |
| **Gamification** | XP, badges, leaderboard, challenges |
| **Analytics** | Dashboard per role, class performance |
| **Finance** | Fee schedules, payments, reports |
| **ERP** | Transport, inventory, staff, HR, payroll, leaves, classroom |
| **Other** | Attendance, mindmaps, coding, NEP, virtual labs, LTI, curriculum, timetable, search, whiteboard, concept-progress, content-publishing, device-tokens, notification-preferences, coding-challenges, cloudinary |

## Database Model

**11 Typed Tables** (strict schema + `data JSONB` catch-all):

| Table | Purpose |
|-------|---------|
| `users` | Core user — id, email, role, class_ids[], school_id, student_id |
| `textbooks` | PDF textbooks — title, subject_id, class_id, status, storage_path |
| `chapters` | Chapter hierarchy — textbook_id FK, title, order |
| `concepts` | Individual concepts — chapter_id FK, textbook_id FK |
| `concept_notes` | AI-generated content — summary, notes, formulas, **embedding VECTOR(384)** |
| `concept_questions` | AI-generated Q&A — question, type, difficulty, options, answer |
| `concept_videos` | YouTube recommendations — **embedding VECTOR(384)** |
| `concept_resources` | Educational resource links — **embedding VECTOR(384)** |
| `processing_jobs` | Textbook pipeline tracking |
| `raw_pages` | Extracted PDF text per page |
| `nosql_docs` | Generic JSONB store (40+ collections) |

**pgvector**: 384-dim vectors with ivfflat indexes, cosine similarity via `pgvector_search()` RPC.

## Auth

- **Supabase Auth** — JWT-based sessions, password management
- **Flow**: Register via backend → supabase admin API → profile in `users` table. Login → Supabase REST token endpoint → JWT stored in Zustand (localStorage). Axios interceptor attaches `Bearer`; 401 triggers auto-refresh.
- **Middleware**: `authenticate`, `optionalAuth`, `requireRole(...roles)`, `requireOwnershipOrRole`
- **Rate limiting**: Auth (5/15min), Global (100/min), Upload (5/min), Strict (20/15min)
- **MFA**: TOTP via `speakeasy`

## State Management (Web)

| Store | Persisted | Purpose |
|-------|-----------|---------|
| `authStore` | localStorage | User, JWT, selected class |
| `uiStore` | localStorage | Sidebar, theme (light/dark/system) |
| `languageStore` | localStorage | en/hi/te/ta/kn |
| `chatStore` | localStorage | AI tutor + OCR messages |
| `notificationStore` | No | Unread count |
| `uploadStore` | No | Upload tasks |

TanStack React Query defaults: `staleTime: 5min`, `gcTime: 10min`, `retry: 1`.

## Key Stats

| Metric | Value |
|--------|-------|
| **Codebase** | ~22,000 LOC across 3 apps |
| **Backend** | ~18,500 LOC, 199 `.ts` files, 77 services, 12 middleware, 16 validators |
| **Frontend** | ~2,500 LOC (app layer), 65 pages, 30 service modules, 23 UI primitives |
| **Mobile** | ~2,000 LOC, 7 screens per app (student/teacher/parent) |
| **Database** | 11 typed tables + 40+ nosql collections, 3 ivfflat pgvector indexes |
| **Deployment** | Vercel (static SPA + serverless function) |
