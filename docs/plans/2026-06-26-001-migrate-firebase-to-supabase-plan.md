---
title: "Firebase (Firestore/Auth) + Cloudinary → Supabase (PostgreSQL/Auth/pgvector) + Cloudflare R2"
status: active
created: 2026-06-26
type: refactor
depth: deep
---

# Firebase to Supabase + R2 Migration — Phase 1 (Core AI Pipeline)

## Problem Frame

The Genesis LMS backend (201 TypeScript files, 57 Firestore collections, 154+ Firestore access points) is tied to Firebase Firestore for data, Firebase Auth for authentication, and Cloudinary for file storage. This creates vendor lock-in, limits relational query capability, and prevents using PostgreSQL features like `pgvector` for native embedding similarity search.

## Scope Boundaries

### In Scope (This Plan)
- Phase 1: Install deps, define PostgreSQL schema, add `.env` vars
- Phase 2: Migrate Frontend + Backend authentication from Firebase Auth → Supabase Auth
- Phase 3: Migrate Core AI Pipeline (textbook.service.ts, video-ranker.service.ts, worker.ts) from Firestore → Supabase PostgreSQL + pgvector, and Cloudinary → Cloudflare R2 (S3-compatible)
- Phase 4: TypeScript compilation check with dummy credentials

### Deferred for Later
- All other backend services (50+ remaining) — gamification, analytics, exams, assignments, attendance, fees, messaging, etc.
- Firebase Storage → R2 migration for non-PDF assets
- Firestore security rules → Supabase Row Level Security (RLS) conversion
- Data migration scripts for production data
- Testing with real Supabase/R2 credentials

### Outside Scope (Per Phase 1 boundary)
- Full migration of all 50+ backend services
- Performance optimization of pgvector queries
- CI/CD changes
- Documentation updates (will be covered in a later phase)

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Supabase as PostgreSQL provider | Provides managed Postgres + Auth + auto-generated REST API |
| Cloudflare R2 for file storage | S3-compatible, no egress fees, replaces Cloudinary |
| pgvector for embeddings | Native PostgreSQL vector similarity search replaces local Transformers.js in-memory search |
| Phased migration (not big bang) | 50+ services cannot be rewritten atomically without breaking the app |
| Dummy credentials during build | Allow `npm run build` to pass before requiring real secrets |
| Keep BullMQ/Redis + Vercel | These are already working and don't need replacement |

## Phase 1: Setup & Schema

### U1. Install Dependencies

**Goal:** Add Supabase and S3 SDK packages to both backend and frontend.

**Files:**
- `lms/backend/package.json`
- `lms/frontend/package.json`

**Approach:**
- Backend: `npm install @supabase/supabase-js @aws-sdk/client-s3`
- Frontend: `npm install @supabase/supabase-js`

**Test expectation:** none — dependency installation only.

### U2. Create PostgreSQL Schema

**Goal:** Define Supabase tables for core LMS modules being migrated (Users, Textbooks, Chapters, Concepts) with pgvector extension.

**Files:**
- `lms/backend/supabase/schema.sql` (create)

**Approach:**
Create SQL file defining:
- `pgvector` extension enable
- `users` table matching current Firestore user schema
- `textbooks` table (id, title, subject_id, class_id, teacher_id, status, etc.)
- `chapters` table with FK to textbooks
- `concepts` table with FK to chapters
- `vector` column on concepts for embeddings (384d matching all-MiniLM-L6-v2)

**Test expectation:** none — schema definition only.

### U3. Add Environment Variables

**Goal:** Add dummy Supabase and R2 keys to both environments for compilation.

**Files:**
- `lms/backend/.env`
- `lms/frontend/.env`

**Approach:**
- Add `SUPABASE_URL=dummy_url`, `SUPABASE_ANON_KEY=dummy_key`, `SUPABASE_SERVICE_ROLE_KEY=dummy_key`
- Add `R2_ACCOUNT_ID=dummy`, `R2_ACCESS_KEY_ID=dummy`, `R2_SECRET_ACCESS_KEY=dummy`, `R2_BUCKET_NAME=dummy`
- Update `lms/backend/src/config/env.ts` (Zod validation) to include new optional env vars so compilation succeeds

**Test expectation:** none — config only.

## Phase 2: Auth Migration

### U4. Frontend Auth Context — Firebase → Supabase

**Goal:** Replace Firebase Auth in the frontend with Supabase Auth session management.

**Files:**
- `lms/frontend/src/lib/firebase/config.ts` (rewrite)
- `lms/frontend/src/lib/firebase/auth.ts` (rewrite)
- `lms/frontend/src/features/auth/hooks/useLogin.ts` (update)
- `lms/frontend/src/features/auth/components/LoginForm.tsx` (update)
- `lms/frontend/src/store/authStore.ts` (update)

**Approach:**
- Replace `initializeApp` from firebase with `createClient` from `@supabase/supabase-js`
- Replace `signInWithEmailAndPassword` / `signOut` with `supabase.auth.signInWithPassword` / `supabase.auth.signOut`
- Supabase client uses `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- Keep the same authStore interface so consuming components don't need changes

**Test scenarios:**
- Happy path: login with email/password returns session with access_token
- Error path: invalid credentials return error
- Session persistence: page reload restores session from Supabase session cookie

### U5. Backend Auth Middleware — Firebase → Supabase

**Goal:** Replace Firebase Admin SDK token verification with Supabase JWT verification.

**Files:**
- `lms/backend/src/middlewares/auth.middleware.ts` (rewrite)

**Approach:**
- Replace `admin.auth().verifyIdToken(token)` with Supabase JWT verification using `supabaseAdmin.auth.getUser(token)` or JWT verification with Supabase JWKS
- Map `req.user` shape to match existing interface so downstream middleware/controllers don't break
- Keep `requireRole()`, `optionalAuth`, `requireOwnershipOrRole` signatures unchanged

**Test scenarios:**
- Happy path: valid Supabase JWT → `req.user` populated with correct fields
- Error path: expired/malformed token → 401
- Role check: user without required role → 403

## Phase 3: Core AI Pipeline Migration

### U6. Textbook Service — Firestore → Supabase + Cloudinary → R2

**Goal:** Rewrite `textbook.service.ts` to use Supabase for data operations and R2 for PDF storage.

**Files:**
- `lms/backend/src/services/textbook.service.ts` (rewrite)

**Approach:**
- Replace `db.collection('textbooks').doc(id).set/get/update` with `supabase.from('textbooks').insert/select/update`
- Replace `cloudinary.v2.uploader.upload_stream` with `S3Client.putObject` to Cloudflare R2
- Store R2 object URLs as `pdfUrl` instead of Cloudinary URLs
- Keep the same exported function signatures so callers don't break
- Create `src/services/supabase.ts` for shared Supabase client initialization
- Create `src/services/r2.ts` for shared S3 client initialization

**Patterns to follow:**
- Existing `src/services/cloudinary.service.ts` patterns (just swap implementation)

**Test scenarios:**
- Happy path: textbook creation inserts into Supabase table and uploads PDF to R2
- Error path: R2 upload failure → error propagated to caller
- Edge case: textbook with no PDF (only cloudinaryUrl) — handled gracefully

### U7. Video Ranker — pgvector Integration

**Goal:** Migrate `video-ranker.service.ts` to use pgvector for embedding similarity queries instead of in-memory scoring.

**Files:**
- `lms/backend/src/services/video-ranker.service.ts` (rewrite)

**Approach:**
- Replace `getEmbedding()` + local cosine similarity loop with `supabase.rpc('pgvector_search', { query_embedding, match_threshold })` or direct `ORDER BY embedding <=> query_embedding LIMIT N`
- Store video embeddings in `video_embeddings` table or as a vector column on a videos table
- Keep the same `searchAndRankVideos()` signature

**Patterns to follow:**
- Existing embedding generation still uses Transformers.js; only the storage/query layer changes

**Test scenarios:**
- Happy path: concept title → ranked videos returned via pgvector similarity
- Edge case: zero videos in database → empty result
- Error path: pgvector extension not enabled → fallback to sequential scan (graceful degradation)

### U8. Worker — Firestore → Supabase

**Goal:** Rewrite `worker.ts` (BullMQ worker) to use Supabase instead of Firestore for progress tracking and data reads.

**Files:**
- `lms/backend/src/jobs/worker.ts` (rewrite)

**Approach:**
- Replace `getAdminFirestore()` calls with `supabase.from(...)` calls
- Replace `db.collection('textbooks').doc(id).update()` with `supabase.from('textbooks').update(...).eq('id', id)`
- Replace `db.collection('processingJobs').doc(id).set()` with `supabase.from('processing_jobs').upsert(...)`
- Keep all logging, progress tracking, and job orchestration logic the same

**Patterns to follow:**
- The BullMQ worker pattern stays; only the data backend changes

**Test scenarios:**
- Happy path: worker processes textbook, updates progress in Supabase
- Error path: Supabase write failure → worker error handled gracefully
- Edge case: textbook not found in Supabase → clear error

## Phase 4: Compilation

### U9. Build Verification

**Goal:** Verify frontend and backend compile without TypeScript errors.

**Approach:**
- Run `npm run build` on both frontend and backend
- Fix any TypeScript errors (import paths, type mismatches, missing exports)
- Do NOT ask for real credentials at this stage

**Files:**
- Any files needing type fixes discovered during compilation

**Test expectation:** `npm run build` exits 0 on both frontend and backend.

## Dependencies

```
U1 (install deps) → U2 (schema) → U3 (env vars)
                                        ↓
                              U4 (frontend auth) → U5 (backend auth)
                                              ↘
                                        U6 (textbook) → U8 (worker)
                                              ↓
                                        U7 (video ranker)
                                              ↓
                                        U9 (build check)
```

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| TypeScript compilation errors from large renames | High | Medium | Fix per-file in build verification step |
| Breaking auth flow for existing users | Medium | High | Keep same interface shapes; test after update |
| Supabase dummy credentials cause build failures | Low | Low | Use optional env vars with defaults |
| R2 SDK incompatibility with library version | Low | Medium | Pin `@aws-sdk/client-s3` to latest stable |
| pgvector queries perform differently than in-memory | Medium | Low | Defer optimization to later phase |
