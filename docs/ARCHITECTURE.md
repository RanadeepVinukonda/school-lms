# School LMS — System Architecture

## Overview

School LMS is a multi-tenant learning management platform serving K-12 schools. It provides tools for academic management (classes, subjects, exams), administrative operations (fees, HR, transport, inventory), AI-powered content generation (textbook processing, question generation, adaptive learning), and real-time communication.

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                │
│  Browser (React/Vite)  │  Mobile (Expo/React Native)        │
├─────────────────────────────────────────────────────────────┤
│                    CDN (Cloudflare/Vercel)                   │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway (Express)                     │
├─────────────────────────────────────────────────────────────┤
│  Auth     │  Services  │  Inngest  │  AI Pipeline           │
├─────────────────────────────────────────────────────────────┤
│            PostgreSQL (Supabase) + Drizzle ORM              │
│         Redis (Caching) │ Cloudinary (Media)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + Vite + TypeScript | Fast dev experience, type safety |
| Backend | Express 4 + TypeScript | Mature, well-understood, flexible |
| Mobile | Expo SDK 52 + React Native | Cross-platform, OTA updates |
| Database | PostgreSQL (Supabase) | Scalable, built-in auth, RLS |
| ORM | Drizzle ORM | Type-safe, lightweight, no magic |
| Auth | Supabase Auth + JWT | Built-in, multi-tenant ready |
| Background Jobs | Inngest | Reliable, observable, scalable |
| Object Storage | Cloudinary | Image optimization, PDF processing |
| AI | Google Gemini / OpenRouter | Multi-model support, cost-effective |
| Logging | Winston | Structured JSON, file rotation |
| Monitoring | Prometheus + Grafana (planned) | Open-source, self-hosted |
| Error Tracking | Sentry | Cross-platform error monitoring |
| CI/CD | GitHub Actions | Git-native, matrix builds |
| Containerization | Docker + Docker Compose | Portable, reproducible deploys |
| Hosting | VPS (Docker) / Vercel (frontend) | Cost-effective, full control |

---

## Data Flow: Authentication

```
User → Login Form → POST /auth/login
  → Auth Service → Supabase Auth (signInWithPassword)
  → Session created → JWT cookie + Bearer token
  → Subsequent requests: middleware verifies token
  → Supabase RLS enforces row-level access (school_id, role)
```

## Data Flow: AI Textbook Pipeline

```
Teacher uploads PDF → POST /content/textbook/upload
  → Cloudinary upload → storage path returned
  → Inngest event: textbook/pipeline.start
  → PDF text extraction (pdf-parse)
  → AI chapter/concept extraction (Gemini/OpenRouter)
  → Concept questions generation (AI)
  → YouTube video search & match (yt-search)
  → Vector embedding (Xenova Transformers)
  → Status update: processing → ready/failed
  → Notification sent to teacher
```

## Data Flow: Fee Payment

```
Admin/Parent → POST /finance/fees/pay
  → Fee Service → ACID transaction (pg pool)
  → BEGIN → SELECT amount (fee_structures)
  → SELECT SUM paid (fee_payments) → validate
  → INSERT payment → COMMIT
  → Outstanding report updated
```

## Directory Structure

```
lms/
├── backend/           # Express API server
│   ├── src/
│   │   ├── app.ts               # Express app setup (middleware, routes)
│   │   ├── index.ts             # Entry point (server start, shutdown)
│   │   ├── config/              # Configuration (env, cors, swagger, logger)
│   │   ├── controllers/         # Route handlers
│   │   ├── database/            # Connection management, migrations, schema
│   │   ├── jobs/                # Background jobs (Inngest, scheduler)
│   │   ├── lib/                 # Shared utilities (BaseService)
│   │   ├── middlewares/         # Express middleware (auth, error, rate-limit)
│   │   ├── routes/              # Route definitions
│   │   ├── services/            # Business logic layer
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/               # Helper functions
│   ├── migrations/              # Database migrations
│   ├── supabase/                # Supabase schema & config
│   └── scripts/                 # Maintenance scripts
├── frontend/          # React/Vite SPA
│   ├── src/
│   │   ├── app/                 # Page components
│   │   ├── components/          # Shared UI components
│   │   ├── features/            # Feature modules
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API client services
│   │   ├── store/               # State management (Zustand)
│   │   └── types/               # TypeScript type definitions
│   └── e2e/                     # Playwright E2E tests
├── mobile/            # React Native (Expo) apps
│   ├── student/       # Student app
│   ├── teacher/       # Teacher app
│   ├── parent/        # Parent app
│   └── shared/        # Shared mobile code
├── search/            # Search service (MeiliSearch / pgvector)
├── deploy/            # Deployment scripts & guides
├── tests/             # Load tests
│   └── load/          # k6/Artillery scripts
└── docs/              # Documentation
```

---

## Key Architectural Decisions

### 1. Multi-Tenancy via `school_id`
Every table includes a `school_id` column. All queries filter by `school_id` to enforce data isolation. Supabase RLS policies provide an additional security layer.

### 2. Drizzle ORM + Supabase
Drizzle provides type-safe queries with full TypeScript inference. Supabase handles auth, realtime subscriptions, and managed PostgreSQL. Raw SQL is used only where transactions or complex queries are needed.

### 3. Background Jobs with Inngest
Long-running tasks (textbook processing, report generation) are offloaded to Inngest. This keeps API response times predictable and enables retry logic with exponential backoff.

### 4. AI Pipeline Separation
The AI/OCR pipeline runs asynchronously via Inngest. Each stage (OCR → chapter extraction → question generation → video matching → embedding) is a separate function step, enabling granular error handling and retries.

### 5. Error Handling Standard
All API responses follow `{ success: boolean, data?: T, error?: { code: string, message: string } }`. Custom `AppError` subclasses map to standard HTTP status codes.

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│            VPS (Docker Host)            │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │  Backend  │  │ Frontend │            │
│  │ (Express) │  │  (Nginx) │            │
│  │  :4000    │  │   :80    │            │
│  └────┬─────┘  └──────────┘            │
│       │                                 │
│  ┌────▼─────┐  ┌──────────┐            │
│  │ PgBouncer│  │  Redis   │            │
│  │  :6432   │  │  :6379   │            │
│  └────┬─────┘  └──────────┘            │
│       │                                 │
│  ┌────▼─────┐                           │
│  │PostgreSQL│                           │
│  │  :5432   │                           │
│  └──────────┘                           │
└─────────────────────────────────────────┘
```

### Environments

| Environment | URL | Deploy Trigger | DB |
|------------|-----|---------------|-----|
| Development | localhost:3000 | Manual | Local/remote dev |
| Staging | staging.school-lms.com | Push to `main` | Staging (anonymized) |
| Production | app.school-lms.com | Manual approval | Production (backup daily) |

---

## Security Model

1. **Authentication**: JWT tokens (cookie + Bearer), Supabase Auth
2. **Authorization**: Role-based (admin, teacher, student, parent) + school-scoped queries
3. **Row Level Security**: Supabase RLS policies on all tables
4. **API Security**: Rate limiting (per endpoint category), CORS whitelist, CSRF tokens, security headers (HSTS, CSP, X-Frame-Options)
5. **Input Validation**: Zod schemas on all request bodies, XSS sanitization
6. **Secrets Management**: All secrets via environment variables; GitHub Environments for CI/CD
