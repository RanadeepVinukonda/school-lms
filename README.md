# Genesis School LMS

An end-to-end school management and learning platform: a React SPA, an Express
(TypeScript) REST API, and a Capacitor Android app.

| Area | Tech |
|---|---|
| Frontend | React 18 + Vite 6 + Tailwind, Zustand, TanStack Query |
| Backend | Node 20 + Express 4 + TypeScript, Drizzle ORM |
| Database | PostgreSQL via Supabase (+ pgvector embeddings) |
| Auth | Supabase Auth (JWT), MFA (TOTP), httpOnly cookies + CSRF |
| Jobs | Inngest (`textbook-pipeline`) + in-process scheduler timers |
| AI | Gemini + OpenRouter, `@xenova/transformers` embeddings |
| Files | Cloudinary + Supabase Storage |
| Mobile | Capacitor shell (`lms/frontend/android`, app id `com.school.lms`) |
| CI/CD | GitHub Actions; Vercel (frontend); Docker (backend) |

---

## Repo layout

```
.
├── .github/workflows/     # CI + (optional) Play Store AAB pipeline
├── deploy/                # Cloud-server templates (env, compose, nginx, vercel)
├── lms/
│   ├── backend/           # Express REST API (port 4000 in Docker / 3001 dev)
│   ├── frontend/          # React SPA (Vite) + Capacitor Android project
│   ├── pgbouncer/         # Optional connection pooler
│   └── search/            # Optional Elasticsearch microservice
├── vercel.json            # Frontend deploy: rootDirectory + /api rewrite
├── README.md              # This file — quick start + docs index
├── ARCHITECTURE.md        # System architecture
└── GUIDE.md               # Server handoff + Google Play release guide
```

---

## Docs index

| Doc | Purpose |
|---|---|
| `README.md` | This file — quick start, scripts, docs index |
| `DOCUMENTATION.md` | Developer docs: setup, API, testing, migrations, contributing |
| `ARCHITECTURE.md` | System architecture: stack, topology, middleware, security, decisions |
| `GUIDE.md` | Cloud-server connection/handoff + Play Store AAB release workflow |
| `LICENSE` | Proprietary license (see below) |

---

## Quick start

Prerequisites: Node 20+, a Supabase project, Cloudinary account, and a Gemini API
key. Credential guidance: `GUIDE.md` §4 (environment variables that matter).

### Backend

```bash
cd lms/backend
cp .env.example .env          # fill values (see GUIDE.md §4)
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

Key scripts (`lms/frontend/package.json`): `dev`, `build`, `lint`, `test`
(vitest), `typecheck`, and the Android build scripts `android:sync`, `apk:debug`,
`apk:release` (Windows), `apk:release:posix` (macOS/Linux).

### Local stack (Docker)

```bash
cd lms && docker-compose up --build   # postgres:5432, backend:4000, frontend:80
```

---

## Architecture

The authoritative architecture doc is [`ARCHITECTURE.md`](ARCHITECTURE.md). Key facts:

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
  optional shared-cache enhancement (see `ARCHITECTURE.md` §5.5).
- **Resilience**: circuit breakers (AI, Supabase, Cloudinary), idempotency keys,
  Postgres advisory locks, safe-compare helpers.

---

## API

- Interactive docs (Swagger UI): `GET /api-docs` when
  `API_DOCS_ENABLED=true` (enabled by default outside production; Basic-auth
  protected in production via `API_DOCS_USERNAME`/`API_DOCS_PASSWORD`).
- OpenAPI spec: `GET /api-docs.json`.
- Response/error envelope: `ARCHITECTURE.md` §8.
- Route groups: auth, school (classes/subjects), finance (fees/payroll), academics
  (courses, assignments, quizzes, exams, textbooks, attendance, timetable, coding…),
  HR (staff/leave/transport/inventory), content (upload, AI, OCR, YouTube…),
  infrastructure (health, metrics, settings, audit, jobs).

Run locally and browse `http://localhost:3001/api-docs` for the full, authoritative
endpoint reference.

---

## Deployment

| Surface | How | Docs |
|---|---|---|
| Web frontend | Vercel (auto-deploy on push to `main`) | `vercel.json`, `GUIDE.md` §3 |
| Backend | Cloud server: Docker Compose + Nginx + certbot | `deploy/`, `GUIDE.md` §3–4 |
| Android | `npm run apk:release` → AAB → Play Console | `GUIDE.md` §5 |

Env + secrets guidance (every variable, how to obtain, what never to share):
`GUIDE.md` §4.

---

## License

**Proprietary — © 2026 Ranadeep Vinukonda. All rights reserved.** See
[`LICENSE`](LICENSE) for the single-school license terms. This is a commercial
product; open use requires a separate written agreement with the author.
