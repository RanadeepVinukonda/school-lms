# Genesis School LMS — System Architecture

A production-oriented overview of the Genesis School LMS monorepo: how the pieces
fit together, how a request flows through the stack, and the key engineering
decisions behind it.

Audience: engineers joining the project, reviewers, and anyone operating or
extending the system. Deployment and operational runbooks live in `GUIDE.md`;
this document explains *why the system is shaped the way it is*.

---

## 1. Overview

Genesis is an end-to-end school management and learning platform:

- **Web app** — Next.js App Router for students, teachers, parents, and admins.
- **API** — Express (TypeScript) REST backend with auth, fees/ERP, academic
  workflows, AI textbook processing, OCR, and notifications.
- **Mobile** — the web app wrapped in a Capacitor Android shell.
- **Managed services** — Supabase (Postgres + auth), Cloudinary (files),
  Gemini/OpenRouter (AI), YouTube (video search).

### Design principles

- **Offload the hard parts.** Auth, database, files, and AI all live on managed
  services. The server only runs the API — that's what keeps hosting cheap and
  simple to operate.
- **Failures are the default.** Every external dependency (AI, Supabase,
  Cloudinary) is wrapped in circuit breakers with safe fallbacks so one outage
  doesn't take the school down.
- **Idempotent, transactional writes.** Postgres advisory locks and idempotency
  keys prevent double-processing of jobs and double-charging of fees.
- **Stateless API.** The backend holds no per-user session state; auth is JWT
  (Supabase-verified) in an httpOnly cookie. Scaling = adding replicas.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS, Zustand, TanStack Query, React Router (compatibility shim) |
| Backend | Node 20 + Express 4 + TypeScript, Drizzle ORM, Zod validation |
| Database | PostgreSQL via Supabase (+ `pgvector` embeddings) |
| Auth | Supabase Auth (JWT) + MFA (TOTP), httpOnly cookies + CSRF double-submit |
| Jobs | Inngest (`textbook-pipeline`) with an in-process inline fallback |
| AI | Gemini + OpenRouter; `@xenova/transformers` for local embeddings |
| OCR | tesseract.js with local `eng`/`hin` traineddata |
| Files | Cloudinary + Supabase Storage |
| Search (optional) | Elasticsearch microservice (`lms/search/`, not wired by default) |
| Mobile | Capacitor shell (`lms/frontend/android`, app id `com.school.lms`) |
| Observability | Sentry (errors), `prom-client` `/metrics`, `/health` probes |
| CI/CD | GitHub Actions; Vercel (frontend); Docker (backend) |

---

## 3. Repo layout

```
.
├── .github/workflows/    # CI + (optional) Play Store AAB pipeline
├── deploy/               # Cloud-server templates: env, compose, nginx
├── lms/
│   ├── backend/          # Express REST API (Docker port 4000, dev 3001)
│   ├── frontend/         # Next.js App Router + Capacitor Android project
│   ├── pgbouncer/        # Optional connection pooler
│   └── search/           # Optional Elasticsearch microservice
├── vercel.json           # Vercel deploy: root dir + /api rewrite
├── README.md             # Quick start + docs index
├── ARCHITECTURE.md       # This document
└── GUIDE.md              # Server handoff + Play Store release guide
```

---

## 4. Runtime topology

```
Browser / Phone (Capacitor)
        │  https://<frontend>.vercel.app
        ▼
Vercel (Next.js standalone, CDN)
        │  vercel.json rewrite:  /api/(.*)  →  https://api.<domain>/api/$1
        ▼
Cloud server
   └─ Nginx (:443, TLS)  ──►  backend container (:4000)
        │
        ├── Supabase  ── Postgres (+ pgvector) + Auth + Storage
        ├── Cloudinary ── image/file uploads
        ├── Gemini / OpenRouter ── AI
        └── Redis (optional) ── shared cache/limits when scaling to replicas
```

The Next.js app calls the **relative** `/api` path. Vercel rewrites it to the
server, so the browser and cookies stay same-origin — session cookies, CSRF,
and rate limits behave exactly as in development. This is a deliberate choice
over cross-origin API calls (which would force `SameSite=None` cookie gymnastics).

---

## 5. Backend architecture

### 5.1 Entry point & middleware chain

`src/index.ts` → `src/app.ts` builds the Express app. Middleware runs in order:

```
Sentry → gzip → requestId → nonce → security headers → CORS → Inngest /api/inngest
→ JSON body parser → metrics → timeout (30s) → /api prefix-strip → health probes
→ rate limiting → sanitize → CSRF → routes
```

Notable choices:

- **`/api` prefix-strip** — the app mounts under `/api` but route files declare
  clean paths (`/health`, `/auth/login`), so `vercel.json`, nginx, and direct
  calls all work.
- **Timeout (30s)** — long AI/OCR routes are individually extended; the global
  cap prevents one slow dependency from pinning a worker.
- **Rate limiting** — per-IP express-rate-limit (in-memory per process; a shared
  Redis store is the documented upgrade path when running replicas).
- **`trust proxy: 1`** — exactly one proxy hop (the host Nginx). Adding another
  public proxy breaks client-IP rate limiting.

### 5.2 Data access

Two access paths, deliberately separated:

| Path | Used for | Mechanism |
|---|---|---|
| Supabase client (`getSupabaseAdmin()`) | Most CRUD reads/writes | Supabase REST + row-level security |
| Direct `pg` pool (`DATABASE_URL`) | Raw-SQL transactions | Fees, inventory, timetable, advisory locks |

- **Drizzle ORM** manages the schema (29 explicit tables) — migrations via
  `drizzle-kit` (`db:generate`, `db:push`), not runtime sync.
- Tables not in the Drizzle schema (auth-adjacent, some Supabase-managed tables)
  are read through the Supabase client.
- **Advisory locks** (`pg_advisory_lock`) guard multi-step jobs (payroll,
  fee runs) so duplicate scheduling can't double-process.

### 5.3 Route modules

Route groups under `src/routes/`:

- **auth** — login, register, session, refresh, logout, password reset/change,
  profile, MFA/TOTP
- **school** — classes, subjects, academic years
- **finance** — fees, payroll, invoices
- **academics** — courses, assignments, quizzes, exams, textbooks, attendance,
  timetable, coding workspace
- **HR** — staff, leave, transport, inventory
- **content** — uploads, AI processing, OCR, YouTube/videos
- **infrastructure** — health, metrics, settings, audit logs, jobs

Controllers are thin (validation → service call → envelope response); business
logic lives in ~80 services under `src/services/`. Input validation is centralized
in Zod validators (`src/validators/`). Errors flow through a typed hierarchy in
`src/utils/errors.ts` and a uniform response envelope (below).

### 5.4 AI textbook pipeline

Upload → `pdf-parse` → Gemini table-of-contents + summaries → per-concept
embeddings (`@xenova/transformers`) → questions (Gemini) → videos (YouTube API)
→ resources → ranked. Runs inside the Inngest `textbook-pipeline` function, or
inline in the same process when Inngest keys aren't configured (dev mode).
This is the heaviest workload on the box — it is why the backend container gets
a 2 GB memory cap and long nginx timeouts (`proxy_read_timeout 600s`).

### 5.5 Resilience & caching

- **Circuit breakers** around AI, Supabase, and Cloudinary calls.
- **TTL + LRU in-memory caches** (`src/utils/cache.ts`) for hot reads (users,
  classes, fees, quizzes, settings). Redis is the documented shared-cache upgrade
  when running multiple replicas — not needed on a single instance.
- **Idempotency keys** on mutating external calls (payments, notifications).
- **Safe-compare helpers** for secrets.

---

## 6. Authentication & security

### 6.1 Auth flow

1. Supabase Auth issues a JWT (email/password, Google, etc.).
2. The API verifies it via `supabase.auth.getUser`.
3. A session is also reflected in an **httpOnly cookie**; a **CSRF token** is set
   as a second cookie. Mutating requests (`POST/PUT/PATCH/DELETE`) must send
   `x-csrf-token` matching the cookie (double-submit pattern).
4. Exempt from CSRF: login, register, refresh, forgot/reset password.
5. MFA via TOTP is available for high-privilege accounts.

### 6.2 Roles

Student, Teacher, Admin, Parent — enforced server-side by middleware, with
role-scoped route guards. The frontend hides controls by role but the API is the
authority.

### 6.3 Production hardening (checklist)

- `COOKIE_SECURE=true` — httpOnly cookies only over HTTPS.
- Security headers (CSP, HSTS, frame-denial, nosniff) set globally and mirrored
  in `vercel.json`.
- Secrets server-side only: `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`,
  `GEMINI_API_KEY`, `CRON_SECRET`, keystore — never in the frontend bundle.
- Containers run read-only with `no-new-privileges`; UFW allows only 22/80/443.
- Input validation at every trust boundary (Zod), rate limits on auth endpoints.

---

## 7. Frontend architecture

- **Framework** — Next.js 16 App Router (`src/app/`). Root layout wraps all pages
  with `ClientProviders` (TanStack Query, Zustand, theme, i18n). `force-dynamic`
  disables static rendering (SPA behavior preserved).
- **Routing** — File-based under `src/app/`. 111 route pages. Legacy routes use a
  **React Router compatibility shim** (`src/compat/react-router-dom.tsx`) that
  maps `Link`, `NavLink`, `useNavigate`, `Outlet` to Next.js equivalents. 71+ files
  import from the shim unchanged from the Vite era.
- **Page wrapping** — Each `src/app/**/page.tsx` wraps a legacy page component
  in the correct layout (StudentLayout, TeacherLayout, etc.) via `PageContentProvider`.
  Layouts render nav + `<Outlet />` which reads content from context.
- **Data fetching** — TanStack Query everywhere; mutation invalidates query keys.
- **State** — Zustand for client state (auth session, active school year,
  selected class). Server state stays in Query cache.
- **Components** — `src/legacy/components/ui/` (24 primitives), `src/legacy/components/common/`
  (DataFetchWrapper, SEOHead, upload, notifications), feature components under
  `src/legacy/components/<feature>/`.
- **Services** — `src/services/` are thin API clients (typed, one per domain).
  `import.meta.env` replaced with `process.env.NEXT_PUBLIC_*`.
- **i18n** — 5 languages via a translation hook (`useTranslation`).
- **Mobile** — The same app runs inside Capacitor (`server.url` → hosted Vercel
  URL). `capacitor.config.ts` pins `allowNavigation` to the API/Supabase/Cloudinary
  domains so native WebView navigation stays on trusted origins.
- **Splash screen** — CSS keyframe animation (bounce dots), white background,
  dark text. Runs during initial load.

Every page component renders loading / empty / error / populated states via
`DataFetchWrapper`; accessibility (keyboard nav, focus management, aria labels)
is applied throughout.

---

## 8. API conventions

### Response envelope

```json
{ "success": true, "data": { ... } }
```

Errors use the same envelope with a `success: false` shape and a typed error
code. The authoritative endpoint reference is the live **Swagger UI** at
`GET /api-docs` (`API_DOCS_ENABLED=true`; Basic-auth protected in production).
OpenAPI spec: `GET /api-docs.json`.

### Envelope rules

- Lists are `{ success, data: { items: [...], total, page } }` where paginated.
- Mutations return the created/updated resource or a minimal ack.
- Dates are ISO-8601 strings; money is integer minor units where precision matters.

---

## 9. Testing & CI

- **Backend** — Jest (unit + integration, `lms/backend/__tests__/`). Mocked
  external services; a real Postgres fixture for DB-backed integration tests.
- **Frontend** — Vitest (`lms/frontend/src/__tests__/`) for components/hooks.
- **CI** (`.github/workflows/ci.yml`) — on push/PR to `main`:
  1. Backend: `npm ci` → lint → `tsc --noEmit` → jest (with a Postgres service).
  2. Frontend: `npm ci` → lint → `tsc --noEmit` → vitest → `npx next build --webpack`.
  3. Docker Build: `docker build` backend + frontend images (standalone output).
- **Play Store** — optional `playstore.yml` workflow (build AAB on `v*.*.*` tag,
  upload to Internal testing). See `GUIDE.md` §5.

---

## 10. Configuration & deployment

### Backend env vars (required)

`NODE_ENV`, `PORT` (4000), `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pooler URI), `GEMINI_API_KEY`,
`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`. Operational: `CRON_SECRET`,
`INNGEST_SIGNING_KEY/EVENT_KEY`, `YOUTUBE_API_KEY`, `SENTRY_DSN`, rate-limit
tuning (`*_RATE_LIMIT_*`). Template: `lms/backend/.env.production.template`.

### Frontend env vars (baked at build time)

`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_CLOUDINARY_*`.

### Deployment surfaces

| Surface | How | Docs |
|---|---|---|
| Web frontend | Vercel (auto-deploy on push, Next.js standalone) | `deploy/SERVER_DEPLOYMENT.md` |
| Backend | Cloud server, Docker compose + nginx + certbot | `deploy/SERVER_DEPLOYMENT.md` |
| Android | Capacitor build → AAB → Play Console | `GUIDE.md` §5 |

---

## 11. Key decisions (and why)

| Decision | Why |
|---|---|
| Next.js App Router over Vite SPA | SEO-ready, standalone Docker output, file-based routing, SSR capability |
| React Router compatibility shim | 71+ files import from react-router-dom unchanged — zero migration cost |
| Managed Postgres + Supabase auth | Offloads the two hardest ops problems (DB + auth security) |
| Relative `/api` base URL | Same-origin cookies; CSRF and sessions work without SameSite hacks |
| Drizzle migrations over runtime sync | Explicit, reviewable schema changes |
| Advisory locks + idempotency keys | Financial and job-critical writes must be exactly-once |
| In-memory LRU cache by default | Adequate for one instance; Redis only when replicas arrive |
| Inngest with inline fallback | Textbook pipeline works even without job infra configured |
| Capacitor hosted webview | Web changes ship instantly; bundling is the Play-review upgrade path |
| Read-only containers, minimal ports | Small blast radius on a single school server |
| Versioned Docker images + replicas | Zero-downtime deploys, load balancing across Nginx |

---

## 12. Current limitations & roadmap

- **In-memory rate limits** multiply per replica — add Redis before scaling out.
- **Tesseract OCR + embeddings** are CPU/RAM heavy in the API process; a dedicated
  worker container is the split when OCR usage grows.
- **`lms/search`** (Elasticsearch) remains an optional, unwired microservice —
  not needed until full-text search requirements appear.
- **Single-tenant** Postgres today; multi-tenant isolation is a product-level
  decision for a hosted offering.
