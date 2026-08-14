# Genesis School LMS — Developer Documentation

Developer-facing reference for working on the Genesis School LMS monorepo:
setting up, testing, contributing, and the API contract. For system design see
[`ARCHITECTURE.md`](ARCHITECTURE.md); for operations and releases see
[`GUIDE.md`](GUIDE.md).

---

## 1. Environment setup

Prerequisites: Node 20+, a Supabase project, a Cloudinary account, and a Gemini
API key.

```bash
# Backend
cd lms/backend
cp .env.example .env        # fill values (see GUIDE.md §4)
npm install
npm run dev                 # http://localhost:3001, Swagger at /api-docs

# Frontend (second terminal)
cd lms/frontend
npm install
npm run dev                 # http://localhost:5173, proxies /api → :3001
```

Full local stack in Docker: `cd lms && docker-compose up --build`.

---

## 2. API reference

The authoritative, always-current reference is the **Swagger UI** at
`GET /api-docs` (OpenAPI spec: `GET /api-docs.json`), enabled by
`API_DOCS_ENABLED=true` (default on outside production; Basic-auth protected in
production via `API_DOCS_USERNAME` / `API_DOCS_PASSWORD`).

### Base URLs

| Environment | Base |
|---|---|
| Local dev | `http://localhost:3001/api` |
| Local Docker | `http://localhost:4000/api` |
| Vercel frontend + backend | same-origin `/api` (rewritten by `vercel.json`) |
| Cloud server | `https://api.<domain>/api` (Nginx-proxied) |

The backend strips the leading `/api` internally (`src/app.ts`), so
`/api/health` and `/health` both resolve.

### Authentication

1. **Bearer token** — `Authorization: Bearer <jwt>` (Supabase-issued JWT,
   verified via `supabase.auth.getUser`).
2. **httpOnly session cookie** — set on `/auth/refresh` and OTP login. Requires
   `COOKIE_SECURE=true` in production.

Mutating requests (`POST/PUT/PATCH/DELETE`) also require the CSRF double-submit:
an `x-csrf-token` header matching the `csrf-token` cookie. Exempt endpoints:
login, register, refresh, forgot/reset password.

### Response envelope

```json
{ "success": true, "data": { ... } }
```

Errors return `{ "success": false, "error": { "message": "...", "code": "..." } }`
with a typed error code (see `src/utils/errors.ts`).

### Route groups

- `auth` — login, register, session, refresh, logout, password reset/change,
  profile, MFA/TOTP
- `school` — classes, subjects, academic years
- `finance` — fees, payroll, invoices
- `academics` — courses, assignments, quizzes, exams, textbooks, attendance,
  timetable, coding workspace
- `hr` — staff, leave, transport, inventory
- `content` — uploads, AI processing, OCR, YouTube/videos
- `infrastructure` — health, metrics, settings, audit logs, jobs

---

## 3. Testing

### Backend (Jest)

```bash
cd lms/backend
npm test                  # unit + integration suites
npm run test:coverage     # coverage report
npm run test:watch
```

Integration tests use a real Postgres fixture and mock external services
(Supabase, Cloudinary, Gemini). DB-backed suites live in `lms/backend/__tests__/`.

### Frontend (Vitest)

```bash
cd lms/frontend
npm test                  # component/hook tests (src/__tests__/)
npm run typecheck
npm run lint
```

### CI

`.github/workflows/ci.yml` runs on push/PR to `main`: backend lint + typecheck +
jest (with Postgres service), frontend lint + typecheck + vitest + build, and a
Docker image build. A failing CI blocks merge.

---

## 4. Database migrations

Schema is managed with Drizzle (`lms/backend/src/db/schema/`).

```bash
cd lms/backend
npm run db:generate       # create migration from schema changes
npm run db:push           # apply migrations to the database
npm run db:studio         # Drizzle Studio UI
npm run db:pull           # introspect DB → schema
```

Rules:

- Never hand-edit the Postgres schema behind Drizzle's back.
- For data backfills/one-offs, use `npm run db:cleanup`-style scripts under
  `src/scripts/` rather than ad-hoc SQL in production.
- Non-schema tables (Supabase-managed) are accessed via the Supabase client,
  not Drizzle.

---

## 5. Adding a feature (workflow)

1. **Backend first.** Add the Zod validator (`src/validators/`), a service
   (`src/services/`), and a route under the right group in `src/routes/`.
   Follow the response envelope; the controller stays thin.
2. **Add an integration test** in `lms/backend/__tests__/` covering happy +
   error paths.
3. **Frontend.** Add a typed API client in `src/services/`, a page/component in
   `src/app/` or `src/components/`, and a Vitest test for non-trivial logic.
   Use `DataFetchWrapper` so loading/empty/error/populated states are covered.
4. **Verify:** `npm test`, `npm run typecheck`, `npm run lint` in both apps.
5. **PR** → CI must go green → merge to `main` (frontend auto-deploys to Vercel;
   backend deploys from the cloud-server checkout).

Conventions: no comments unless the surrounding code uses them; one component
per file; keep files under ~300 lines; security-sensitive values only in env
vars, never in frontend bundles.

---

## 6. Operations essentials

| Task | Command / Doc |
|---|---|
| Backend health | `GET /api/health` |
| Metrics | `GET /api/metrics` (Prometheus format) |
| Logs | `docker compose -f deploy/docker-compose.cloud.yml logs -f backend` |
| Restart backend | `docker compose -f deploy/docker-compose.cloud.yml restart backend` |
| DB backup | `npm run backup` (backend) — test restores regularly |
| Full ops guide | `GUIDE.md` |
| Architecture | `ARCHITECTURE.md` |

---

## 7. Contribution & code of conduct

- All changes ship as a PR; CI must pass; never push directly to `main`
  (the deploy loop assumes it).
- Keep changes focused and small; prefer deletions over additions.
- External service keys and credentials never appear in code, commits, or logs.
- Questions about scope or behavior → open an issue before building.
