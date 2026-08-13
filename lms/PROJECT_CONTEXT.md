# Genesis LMS — Full Project Context

> Use this file to write highly specific, efficient prompts for Buffy (the AI coding assistant).  
> Every detail here helps Buffy understand the full scope without having to rediscover the codebase.

---

## 1. High-Level Architecture

```
school-lms/
├── lms/
│   ├── backend/          # Express.js REST API (TypeScript)
│   ├── frontend/         # React SPA (Vite + Tailwind CSS)
│   ├── mobile/           # React Native (Expo) app
│   │   └── app/          # Main Expo project
│   ├── api/              # Vercel serverless functions
│   ├── search/           # Search service
│   └── pgbouncer/        # Connection pooler for Postgres
├── deploy/               # Deployment configs
├── docker-compose.yml    # postgres + pgbouncer + backend + frontend
├── docker-compose.prod.yml
├── docker-compose.test.yml
└── vercel.json           # Frontend/API deployment
```

**Tech stack:**  
- **Backend:** Express.js, Supabase (auth+DB), Drizzle ORM, PostgreSQL, Inngest (jobs), Cloudinary, Sentry  
- **Frontend (Web):** React 18, Vite, Tailwind CSS, React Router, TanStack Query, Zustand, Framer Motion, Radix UI  
- **Mobile:** React Native (Expo SDK 54), React Navigation, Zustand (persisted), Supabase JS  
- **Shared:** Supabase for Auth + Database, Zod for validation, Axios for HTTP

---

## 2. Backend (`lms/backend/`)

### 2.1 Entry Point & Middleware Stack

**File:** `src/app.ts`

Middleware order:
1. `requestId` → assigns UUID to each request
2. `nonce` → CSP nonce generation
3. `securityHeaders` → Helmet-based security headers
4. `cors` → CORS with configured options
5. Inngest webhook handler at `/api/inngest`
6. JSON body parser (1mb limit)
7. `metricsMiddleware` → Prometheus metrics
8. `timeoutMiddleware` → Request timeout
9. `/api` prefix stripping (Vercel compatibility)
10. `requestLogger` (not in test mode)
11. `sanitizeInput` → XSS sanitization
12. `csrfProtection` + `/csrf-token` endpoint (not in test mode)
13. `authRateLimit` on `/auth` routes
14. `apiRateLimit` + `academicYearMiddleware` + `auditMiddleware` on all other routes
15. 404 catch-all → `{ success: false, error: { message: 'Route not found' } }`
16. `errorHandler` → Global error handler
17. Swagger docs at `/api-docs` (basic auth in production)

### 2.2 Route Modules

Routes are organized into domain sub-routers in `src/routes/`:

```
src/routes/
├── auth/              # Auth routes (login, register, etc.)
├── school/            # Schools, subscriptions, settings, etc.
├── finance/           # Fee structures, payments
├── academics/         # Exams, assignments, grades, attendance, timetable, etc.
├── content/           # Textbooks, chapters, concepts, lessons, mindmaps, etc.
├── hr/                # Staff, leave, payroll
├── infrastructure/    # Transport, inventory, classrooms
├── index.ts           # Combines all sub-routers
├── health.ts          # Health check endpoint
├── gdpr.ts            # GDPR data export/deletion
└── (45+ individual route files)
```

**Individual route files** (flat list, 63 files):  
`academic-year`, `adaptive`, `ai-question-generator`, `ai-tutor`, `ai`, `analytics`, `assignment-v2`, `assignment`, `attendance`, `audit`, `auth`, `class`, `classroom`, `cloudinary`, `coding-challenge`, `coding`, `concept-progress`, `concept`, `content-publishing`, `course`, `curriculum-plan`, `curriculum`, `device-token`, `enrollment`, `exam-v2`, `exam`, `fee`, `gamification`, `gdpr`, `grade`, `health`, `index`, `inventory`, `jobs`, `leave`, `lesson`, `lti`, `message`, `mfa`, `mindmap`, `nep-questions`, `notice`, `notification-prefs`, `notification`, `ocr`, `parent`, `payroll`, `pre-primary`, `question-bank`, `question-paper`, `quiz-v2`, `quiz`, `reports`, `results-push`, `school-analytics`, `schools`, `search`, `settings`, `staff`, `subject`, `teacher-class-subject`, `teacher-video`, `test-schedule`, `test-template`, `textbook`, `timetable`, `transport`, `unified-test-engine`, `upload`, `user`, `virtual-labs`, `youtube`

### 2.3 Controllers

Located in `src/controllers/` — 48 controller files mirroring the route structure.  
Each controller exports handler functions (e.g., `list`, `get`, `create`, `update`, `delete`).

### 2.4 Services

Located in `src/services/` — 83 service files. The core business logic layer.  
Notable services:
- `auth.service.ts` — Supabase auth operations, MFA
- `supabase.ts` — Supabase client config with multi-tenant RLS
- `ai.service.ts`, `ai-tutor.service.ts`, `ai-grading.service.ts`, `ai-question-generator.service.ts` — AI features
- `textbook.service.ts` — Textbook processing pipeline
- `pipeline.service.ts` — PDF processing pipeline
- `unified-test-engine.service.ts` — Test engine
- `push.service.ts` — Push notifications
- `adaptive/` subdirectory — Adaptive learning algorithms

### 2.5 Database

**ORM:** Drizzle ORM with PostgreSQL  
**Schema file:** `src/database/schema/index.ts` (Drizzle schema definitions)  
**Runtime schema:** `src/database/schema.ts` (typed table definitions with camelCase/snake_case helpers)

**Key tables (from Drizzle schema):**
- `users` — User profiles with role, class assignments, streak tracking
- `schools` — Multi-tenant school records
- `subscriptions` — Plan-based school subscriptions
- `textbooks`, `chapters`, `concepts` — Content hierarchy
- `concept_notes`, `concept_videos`, `concept_questions`, `concept_resources` — Concept-level enrichment (with pgvector embeddings)
- `classes`, `attendance`, `fee_structures`, `fee_payments` — School operations
- `firestore_docs` — Generic JSON document store for collections
- `processing_jobs`, `raw_pages` — Textbook PDF pipeline

**Migrations:** `migrations/` folder — 44 SQL migration files (`.sql`)

### 2.6 Middleware (`src/middlewares/` — 24 files)

Key middlewares: `auth`, `role`, `rateLimit` (3 tiers: auth, api, ai), `sanitize`, `csrf`, `securityHeaders`, `audit`, `academicYear`, `circuitBreaker`, `idempotency`, `metrics`, `mfa`, `nonce`, `sessionRevocation`, `subscription`, `timeout`, `validate`, `error`, `asyncHandler`, `pagination`, `requestId`, `requestLogger`, `class-access`

### 2.7 Jobs (`src/jobs/`)

- `inngest/` — Inngest job queue with textbook pipeline function
- `cleanupExpired.job.ts`, `generateReports.job.ts`, `sendReminders.job.ts`, `scheduler.ts`, `queue.ts`, `worker.ts`

### 2.8 Config (`src/config/`)

- `env.ts` — Zod-validated environment variables (all required vars documented)
- `cors.ts` — CORS configuration
- `swagger.ts` — Swagger/OpenAPI setup
- `logger.ts` — Winston logger

### 2.9 Required Environment Variables

```
PORT=3001                    # Backend port
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=              # Google Gemini AI key
CLOUDINARY_CLOUD_NAME=       # Image/CDN hosting
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SUPABASE_URL=                # Supabase project URL
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                # Postgres connection string
AI_API_KEY=                  # OpenRouter / custom AI endpoint
SUPABASE_JWT_SECRET=         # JWT secret for token verification
SMTP_HOST=smtp.gmail.com     # Email
SMTP_PORT=587
SMTP_USER=                   # Optional
SMTP_PASS=                   # Optional
```

### 2.10 Scripts

```
npm run dev          # tsx watch src/index.ts
npm run build        # tsc
npm run start        # node dist/index.js
npm run seed         # Create test users
npm run seed:full    # Full seed with sample data
npm run seed:reset   # Clean + full seed
npm test             # Jest
npm run db:generate  # Drizzle kit generate
npm run db:push      # Push Drizzle schema
```

---

## 3. Frontend (`lms/frontend/`)

### 3.1 Entry Point

**File:** `src/main.tsx` → mounts `src/app/App.tsx`

**App.tsx structure:**
1. `AuthGate` — Initializes auth store, shows splash while loading
2. `SplashScreen` — Animated loading screen
3. `OfflineStatusBar` — Red banner when offline (calls `useNetworkStore`)
4. `UploadProgressBanner` — Textbook upload progress
5. `PWAInstallPrompt` — PWA install prompt
6. `PushNotificationManager` — FCM push notifications
7. `MotionConfig` (reduced motion) → `ClassScopeProvider` → `RouterProvider`

**File:** `vite.config.ts` — Vite config with React plugin, path alias (`@/`), proxy `/api` → `localhost:3001`, manual chunk splitting

### 3.2 Routing (`src/app/router/index.tsx`)

React Router v6 with lazy-loaded pages. Role-based layouts:

| Route Group | Layout | Protection |
|---|---|---|
| `/welcome`, `/login`, `/forgot-password`, `/reset-password` | `AuthLayout` | None |
| `/student/*` (30+ routes) | `StudentLayout` | `ProtectedRoute roles=['student']` + checkSetup |
| `/teacher/*` (30+ routes) | `TeacherLayout` | `ProtectedRoute roles=['teacher']` + checkSetup |
| `/admin/*` (20+ routes) | `AdminLayout` | `ProtectedRoute roles=['super_admin','admin']` |
| `/parent/*` (6 routes) | `ParentLayout` | `ProtectedRoute roles=['parent']` |
| `/k2/*` (pre-primary) | `K2Layout` | `ProtectedRoute roles=['student']` |
| `/notifications`, `/about` | None | None |
| `*` | None | 404 page |

### 3.3 Page Count by Role

- **Student:** ~35 pages (dashboard, subjects, exams, AI tutor, coding, labs, mindmaps, OCR, pre-primary K2, etc.)
- **Teacher:** ~30 pages (dashboard, classes, exams, textbooks, video library, analytics, mindmaps, NEP questions, etc.)
- **Admin:** ~20 pages (dashboard, classes, fees, transport, inventory, HR/payroll, settings, etc.)
- **Parent:** ~6 pages (dashboard, children, reports, notices)
- **Shared:** Welcome, Login, Forgot/Reset Password, Notifications, About, Profile

### 3.4 State Management (Zustand)

| Store | File | Purpose |
|---|---|---|
| `authStore` | `src/store/authStore.ts` | Auth state (user, token, isLoading, initialize, login, logout) |
| `chatStore` | `src/store/chatStore.ts` | AI tutor chat messages |
| `languageStore` | `src/store/languageStore.ts` | Locale/language preference |
| `notificationStore` | `src/store/notificationStore.ts` | Push notification state |
| `uiStore` | `src/store/uiStore.ts` | UI state (sidebar, theme, modals) |
| `uploadStore` | `src/store/uploadStore.ts` | File upload progress |

### 3.5 Services (`src/services/` — 47+ files)

All API calls go through Axios instance (`api.ts`) with interceptors for:
- Auth token injection
- 401/403 auto-refresh → session refresh → retry
- Offline detection + queue mutations + serve cached GET responses
- Exponential backoff retry (3x)

Service files mirror backend routes (e.g., `examService.ts`, `assignmentService.ts`, `textbookService.ts`).

### 3.6 UI Components (`src/components/`)

```
components/
├── ui/          # Radix-based design system (Button, Card, Dialog, Select, Tabs, etc.)
├── common/      # Shared: LoadingSkeleton, EmptyState, OfflineStatusBar, SplashScreen, etc.
├── layout/      # Header, Sidebar, Footer, MobileNav
├── student/     # Student-specific components
├── teacher/     # Teacher-specific components
├── coding/      # Code editor components
├── gamification/# Badges, leaderboard components
├── mindmap/     # Mind map canvas components
├── textbook/    # PDF viewer, chapter navigation
├── ocr/         # OCR scanning UI
├── virtual-labs/# Lab simulation components
└── nep-questions/# NEP question generation
```

### 3.7 Design System

- **Framework:** Tailwind CSS v3 with custom design tokens via CSS custom properties
- **Tokens file:** `src/index.css` — Full Material 3-inspired design system with:
  - Light + dark mode with HSL color tokens
  - Surface tint/elevation system (5 levels)
  - Type scale (display/headline/title/body/label x sm/md/lg)
  - Shape/border-radius tokens
  - Shimmer, ripple, container enter/exit animations
- **Fonts:** SF Pro Display / Geist Sans (sans), Lyon Text / Newsreader (serif), Geist Mono / JetBrains Mono (mono)
- **Radix UI primitives** with `class-variance-authority` and `tailwind-merge`

---

## 4. Mobile App (`lms/mobile/app/`)

### 4.1 Entry Point

**File:** `App.tsx` → Expo managed workflow

**App.tsx structure:**
1. Splash screen (5s timeout or session restore completes)
2. Session restore via `authService.getCurrentUser()` on mount
3. `getActiveAcademicYear()` on mount (silent, with `_suppressOffline` flag)
4. Push notification registration after auth
5. `OfflineIndicator` banner (red bar at top)
6. `NavigationContainer` → conditionally renders `AuthNavigator` or `RootNavigator`

### 4.2 Navigation (`src/navigation/`)

**Auth flow:** `NavigationContainer` swaps between:
- `AuthNavigator` (when NOT authenticated) — Login, ForgotPassword, ResetPassword, Welcome, NotFound
- `RootNavigator` (when authenticated) — Role-based tab navigators

**Role-based tab navigators:**
| Navigator | Screens |
|---|---|
| `StudentNavigator` | Dashboard, Learning (subjects), Exams, Tasks, AI Tutor, Timetable, Notices, Leaderboard, Mind Maps, Milestones, OCR, Profile (11 tabs) |
| `TeacherNavigator` | Dashboard, My Classes, Exams, Questions, Assessment, Timetable, Notices, Mind Maps, Videos, Profile (10 tabs) |
| `ParentNavigator` | Dashboard, Children, Notices, Reports, Profile (5 tabs) |
| `AdminNavigator` | Admin tab navigator + 20+ stack screens |

**Screen type:** Bottom tab navigator for each role, with stack navigators within tabs for sub-screens.

### 4.3 Screen Count by Role

- **Student:** 29 screens (dashboard, subjects, chapters, concepts, quizzes, exams, AI tutor, coding, labs, mindmaps, OCR, pre-primary/K2, etc.)
- **Teacher:** 28 screens (dashboard, classes, attendance, exams, textbooks, videos, analytics, mindmaps, NEP questions, unified tests, etc.)
- **Admin:** 25 screens (dashboard, classes, subjects, fees, transport, inventory, staff, leave, payroll, classrooms, settings, analytics, etc.)
- **Parent:** 5 screens (dashboard, children, child detail, reports, notices)
- **Shared:** Login, Welcome, NotFound, Profile, ProfileEdit

### 4.4 State Management (Zustand with Persist)

| Store | Key | Persisted |
|---|---|---|
| `authStore` | `user`, `token`, `isAuthenticated`, `isLoading` | Yes (AsyncStorage, `lms-mobile-auth`) |
| `networkStore` | `isOffline` | No |

### 4.5 Shared Module (`src/shared/`)

Barrel export from `src/shared/index.ts`:
- **Types** — `UserProfile`, `UserRole`, `AuthState`, `LoginInput`, `ApiResponse`, etc.
- **Services** — `authService`, `api` (Axios with offline cache + retry), `academicYearService`
- **Store** — `useAuthStore`, `useNetworkStore`
- **Utils** — `offlineCache` (AsyncStorage wrapper), `notifications` (expo-notifications with Expo Go graceful fallback), `constants` (API_BASE_URL), `permissions`
- **Supabase** — `config.ts` (Supabase client from env vars)

### 4.6 Key Mobile Dependencies

```
expo ~54.0.0, react-native 0.79.2, react 19.0.0
@react-navigation/native + bottom-tabs + native-stack ^7.x
@supabase/supabase-js ^2.110.2
axios ^1.18.1
zustand ^5.0.0 (persisted with AsyncStorage)
expo-linear-gradient, expo-image-picker, expo-notifications
react-native-vector-icons (MaterialCommunityIcons)
```

### 4.7 Required Environment Variables (Mobile)

```
EXPO_PUBLIC_SUPABASE_URL=    # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=         # Backend URL (use LAN IP for device testing, e.g., http://192.168.1.X:4000)
```

### 4.8 Mobile Design Theme (`src/theme.ts`)

Material 3-inspired tokens:

```ts
colors: {
  primary: '#2B3D5E',      // Navy
  secondary: '#4D5A70',    // Slate
  tertiary: '#D4A843',     // Gold
  error: '#C73232',        // Red
  success: '#1A8F47',      // Green
  warning: '#E6A212',      // Amber
  surface: '#FAFAF5',      // Warm white
  // ... plus container/on- variants
}
radius: { xs:4, sm:8, md:12, lg:16, xl:24, full:9999 }
shadow: { sm, md, lg }     // React Native shadow style objects
spacing: { xs:4, sm:8, md:16, lg:24, xl:32 }
```

---

## 5. Infrastructure & Deployment

### 5.1 Docker Stack

```yaml
services:
  pgbouncer:     # Connection pooler (port 6432)
  postgres:      # PostgreSQL 16 (port 5432)
  backend:       # Express API (port 4000, production mode)
  frontend:      # Nginx-served React SPA (port 80)
```

### 5.2 CI/CD (`.github/workflows/`)

- `test.yml` — Run tests
- `cd.yml` — Continuous deployment
- `e2e.yml` — Playwright E2E tests
- `load-test.yml` — K6 load tests
- `mobile-build.yml` — Expo build
- `security.yml` — Security scanning

### 5.3 Deployment

- **Frontend:** Vercel (`vercel.json` at root + `lms/frontend/vercel.json`)
- **Backend:** Docker container (port 4000)
- **API:** Vercel serverless functions (`lms/api/`)

---

## 6. Key Features & Domain Areas

| Domain | Backend Routes | Frontend Pages | Mobile Screens |
|---|---|---|---|
| **Auth** | auth, mfa | Login, Forgot/Reset Password, MFA | Login, Forgot/Reset |
| **Textbooks** | textbook, chapter, concept | Textbook detail, chapter, concept view | Textbook, chapter, concept |
| **Exams** | exam, exam-v2 | Student/Teacher exam pages | Exam screens (student + teacher) |
| **Assignments** | assignment, assignment-v2 | Assignment detail, submissions | Assignment screens |
| **Quizzes** | quiz, quiz-v2 | Quiz attempt, adaptive quiz | Quiz screens |
| **Unified Test Engine** | unified-test-engine | Teacher test builder | UnifiedTest screen |
| **Attendance** | attendance | Teacher/Admin attendance | Mark attendance |
| **Timetable** | timetable | Student/Teacher/Admin timetable | Timetable screens |
| **Fee Management** | fee | Admin fee dashboard | Fee screens |
| **Transport** | transport | Admin transport routes | Transport screens |
| **Inventory** | inventory | Admin inventory | Inventory screens |
| **HR/Payroll** | staff, leave, payroll | Admin HR dashboard | Staff, Leave, Payroll screens |
| **Mind Maps** | mindmap | Student/Teacher mind maps | Mind map screens |
| **AI Tutor** | ai-tutor | Student AI chat | AITutor screen |
| **OCR** | ocr | Student/Teacher OCR | OCR screens |
| **Coding** | coding, coding-challenge | Student coding editor | Coding playground |
| **Virtual Labs** | virtual-labs | Student lab simulations | Labs screen |
| **Gamification** | gamification | Leaderboard, badges, milestones | Gamification, Leaderboard |
| **Pre-Primary (K2)** | pre-primary | K2 dashboard, tracing, phonics, stories, flashcards | PrePrimary, Phonics, Tracing, Stories, Flashcards |
| **NEP Questions** | nep-questions | Question bank, rubrics | NEP questions |
| **Notifications** | notification, notification-prefs, device-token | Notification page, FCM | Push notifications |
| **School Analytics** | school-analytics | Admin analytics dashboard | Analytics screens |
| **ERP** | — | ERP dashboard | ERP screens |
| **Settings** | settings | School settings, system config | Settings screens |
| **Reports** | reports | Parent/Admin reports | Reports screens |
| **Search** | search | — | — |
| **LTI** | lti | Admin LTI integration | — |
| **Curriculum** | curriculum, curriculum-plan | — | — |

---

## 7. Recent Fixes Applied

| Issue | Files Changed | Description |
|---|---|---|
| **Login navigation** | `App.tsx`, `AuthNavigator.tsx` (new), `RootNavigator.tsx` | Conditional navigator swap instead of stale `initialRouteName` |
| **Offline banner on startup** | `api.ts`, `academicYearService.ts` | `_suppressOffline` flag prevents startup warmup calls from showing offline banner |
| **expo-notifications in Expo Go** | `notifications.ts` | Dynamic `require()` with try-catch; graceful no-op when native module missing |

---

## 8. Prompt Engineering Tips

### For best results when asking Buffy to do something:

1. **Be specific about which layer:** Say "in the mobile app" or "in the frontend web app" or "in the backend"
2. **Reference file paths** from this document when relevant
3. **Mention the role context** — student, teacher, admin, or parent
4. **Include error messages** you see, especially stack traces
5. **For UI changes:** mention if it's web (Tailwind/Radix) or mobile (React Native/Expo)
6. **For backend:** mention the route, controller, or service by name

### Example good prompts:

```
"In the mobile app's LoginScreen.tsx, show a network timeout error message instead of just 'Login failed'"
```

```
"Add a new API route in the backend at /exams/:id/analytics that returns pass rate and average score, 
then add a frontend teacher page to display it"
```

```
"Fix the attendance marking flow in the mobile teacher app — after marking, it should refresh the class list"
```

```
"Add loading skeletons to the student's SubjectsScreen in the mobile app"
```

```
"Create a new settings page in the admin panel for configuring academic year start/end dates"
```
