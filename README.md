# Genesis School LMS

An end-to-end school management and learning platform: a React SPA, an Express
(TypeScript) REST API, three mobile apps, and an optional search microservice.

| Area | Tech |
|---|---|
| Frontend | React 18 + Vite 6 + Tailwind, Zustand, TanStack Query |
| Backend | Node 20 + Express 4 + TypeScript, Drizzle ORM |
| Database | PostgreSQL via Supabase (+ pgvector embeddings) |
| Auth | Supabase Auth (JWT), MFA (TOTP), httpOnly cookies + CSRF |
| Jobs | Inngest (`textbook-pipeline`) + in-process scheduler timers |
| AI | Gemini + OpenRouter, `@xenova/transformers` embeddings |
| Files | Cloudinary + Supabase Storage |
| Mobile | React Native (Expo) WebView wrappers (`genesis-webview/`) |

---

## Repo layout

```
.
├── .github/workflows/     # CI + Render deploy triggers
├── deploy/                # Cloud-server templates (env, compose, nginx, vercel)
├── docs/                  # Architecture, API codes, runbooks, compliance…
├── genesis-webview/       # Expo WebView wrapper (the shipped Android app)
├── lms/
│   ├── backend/           # Express REST API (port 4000 in Docker / 3001 dev)
│   ├── frontend/          # React SPA (Vite) — deployed on Vercel
│   ├── search/            # Optional Elasticsearch microservice
│   ├── pgbouncer/         # Optional connection pooler
│   └── api/               # Vercel serverless functions
├── public/                # Remaining static assets
├── tests/load/            # Smoke / load scripts
├── vercel.json            # Frontend deploy: rootDirectory + /api rewrite
└── docker-compose.yml     # Local dev: postgres + backend + frontend
```

---

## Quick start

Prerequisites: Node 20+, a Supabase project, Cloudinary account, and a Gemini API
key. Full credential guidance is in [`ENV_MANIFEST.md`](ENV_MANIFEST.md).

### Backend

```bash
cd lms/backend
cp .env.example .env          # fill values (see ENV_MANIFEST.md)
npm install
npm run dev                   # http://localhost:3001  (Swagger at /api-docs)
```

Key scripts (`lms/backend/package.json`):

| Script | Purpose |
|---|---|
| `dev` | `tsx watch` local dev server |
| `build` + `start` | compile to `dist/`, run `node dist/index.js` |
| `lint` | ESLint |
| `test` | Jest (unit + integration) |
| `db:push` / `db:generate` | Drizzle schema migration |
| `db:studio` | Drizzle Studio UI |
| `backup` | Postgres backup script |

### Frontend

```bash
cd lms/frontend
npm install
npm run dev                    # http://localhost:5173 (proxies /api → :3001)
npm run build                   # dist/ for static hosting
```

### Local stack (Docker)

```bash
docker-compose up --build      # postgres:5432, backend:4000, frontend:80
```

---

## Architecture

The authoritative architecture doc is [`ARCHITECTURE.md`](ARCHITECTURE.md) (monorepo
root). Key facts:

- **Middleware chain** (backend): Sentry → gzip → requestId → nonce → security
  headers → CORS → Inngest `/api/inngest` → JSON body → metrics → timeout (30s) →
  `/api` prefix-strip → health → rate limiting → sanitize → CSRF → routes.
- **Auth**: Supabase Auth issues JWTs; the app also sets an httpOnly session cookie.
  CSRF-protected with a double-submit cookie. See `src/middlewares/auth.middleware.ts`
  and `src/middlewares/csrf.middleware.ts`.
- **Data**: most reads/writes go through Supabase REST (`getSupabaseAdmin()`);
  raw-SQL transactions and advisory locks use a direct `pg` pool
  (`DATABASE_URL`). See `src/database/connection-manager.ts`.
- **AI pipeline**: textbook upload → `pdf-parse` → Gemini TOC/summaries → per-concept
  embeddings (transformers), questions (Gemini), videos (YouTube), resources — all
  ranked, run inside the Inngest `textbook-pipeline` function or inline fallback.
- **Caching**: TTL + LRU in-memory caches (`src/utils/cache.ts`); Redis is an
  optional shared-cache enhancement (see `deploy/README.md` §7).
- **Resilience**: circuit breakers (AI, Supabase, Cloudinary), idempotency keys,
  Postgres advisory locks, safe-compare helpers.

---

## API

- Interactive docs (Swagger UI): `GET /api-docs` when
  `API_DOCS_ENABLED=true` (enabled by default outside production; Basic-auth
  protected in production via `API_DOCS_USERNAME`/`API_DOCS_PASSWORD`).
- OpenAPI spec: `GET /api-docs.json`.
- Response/error envelope and codes: [`docs/ERROR_CODES.md`](docs/ERROR_CODES.md).
- Route groups: auth, school (classes/subjects), finance (fees/payroll), academics
  (courses, assignments, quizzes, exams, textbooks, attendance, timetable, coding…),
  HR (staff/leave/transport/inventory), content (upload, AI, OCR, YouTube…),
  infrastructure (health, metrics, settings, audit, jobs).

Run locally and browse `http://localhost:3001/api-docs` for the full, authoritative
endpoint reference.

---

## Deployment

- **Frontend**: Vercel (see `vercel.json` — rewrites `/api/*` to the backend host).
- **Backend**: Render today; the client's cloud server setup (Nginx + Docker +
  optional Redis) is documented with ready-to-fill templates in
  [`deploy/README.md`](deploy/README.md).
- **Mobile APK**: [`BUILD_APK.md`](BUILD_APK.md) and `genesis-webview/`.
- Env + secrets manifest (every variable, how to obtain, security): 
  [`ENV_MANIFEST.md`](ENV_MANIFEST.md).

---

## Documentation index (`docs/`)

| Doc | Purpose |
|---|---|
| `API.md` | HTTP API reference |
| `DEPLOYMENT.md` | Where everything runs + cloud-server migration |
| `TESTING.md` | Running tests |
| `ARCHITECTURE.md` / `ARCHITECTURE_DIAGRAM.md` | Deep-dive diagrams |
| `ERROR_CODES.md` | API error envelope + codes |
| `CONTRIBUTING.md` | Contribution guidelines |
| `COMPREHENSIVE_TEST_LIST.md` | Test inventory |
| `RUNBOOKS.md`, `SLA.md`, `DISASTER_RECOVERY.md`, `ZERO_DOWNTIME_MIGRATIONS.md` | Ops |
| `DATA_RETENTION.md`, `PRIVACY_POLICY.md`, `compliance/DPIA.md` | Compliance |
| `DEMO_CREDENTIALS_2026-27.md` | Demo accounts |
| `SPRINT_PROGRESS.md`, `POSTMORTEM_TEMPLATE.md` | Process |

---

## License / status

Commercial project. See `PRODUCTION_READINESS_AUDIT.md` for the current audit state.