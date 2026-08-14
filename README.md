# School LMS (Genesis)

Full-stack school management + learning platform: web frontend, REST API, PostgreSQL database, and an Android app via Capacitor.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query, Zustand, React Router |
| Backend | Express, TypeScript, Drizzle ORM, Supabase (auth + realtime), Inngest (jobs) |
| Database | PostgreSQL 16 (+ PgBouncer) |
| Extras | Cloudinary (files), Sentry (errors), prom-client (metrics), Tesseract.js (OCR), KaTeX |
| Mobile | Vite web app wrapped in a Capacitor Android shell |

## Repo layout

```
lms/
├── backend/          # Express REST API (lms/backend)
│   ├── src/          # controllers, routes, services, jobs, validators, tests
│   └── scripts/      # backup.sh, rotate-jwt-secret.sh, seed-genesis-demo.mjs
├── frontend/         # React SPA (lms/frontend) + Capacitor android project
│   └── scripts/      # build-android-release.ps1 / .sh
├── pgbouncer/        # connection pooler config
├── docker-compose.yml        # dev: pgbouncer + postgres + backend + frontend
├── docker-compose.prod.yml   # prod stack (memory caps, healthchecks)
└── docker-compose.test.yml
.github/workflows/     # ci.yml (lint+typecheck+test+build), render-deploy.yml
```

## Quick start

### Backend

```bash
cd lms/backend
cp .env.example .env       # fill SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, CLOUDINARY_*
npm ci
npm run dev                # tsx watch, default port 3001
```

### Frontend

```bash
cd lms/frontend
cp .env.example .env
npm ci
npm run dev                # Vite dev server, default port 5173
```

### Full stack with Docker

```bash
cd lms
export DB_PASSWORD=yourpassword
docker compose up -d --build
```

### Android APK

```bash
cd lms/frontend
npm run apk:debug          # or apk:release
```

## Scripts

| Command | Where | What |
|---------|-------|------|
| `npm run build` | backend | Compile TS → `dist/` |
| `npm test` | backend | Jest + supertest |
| `npm run db:*` | backend | drizzle-kit generate/push/pull/studio |
| `npm run db:cleanup` | backend | Remove demo data |
| `npm run build` | frontend | Vite production build |
| `npm test` | frontend | Vitest + jsdom |
| `npm run typecheck` | frontend | `tsc --noEmit` |
| `npm run apk:debug` | frontend | Debug APK (Capacitor) |
| `bash scripts/backup.sh` | backend | Postgres dump to Cloudinary |

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — full system architecture (single source of truth)
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) — production deployment
- [DEPLOY_GUIDE_PHYSICAL.md](DEPLOY_GUIDE_PHYSICAL.md) — on-prem VPS deployment
- [CLOUD_PLAYSTORE_SETUP_GUIDE.md](CLOUD_PLAYSTORE_SETUP_GUIDE.md) — Play Store publishing
- [ENV_MANIFEST.md](ENV_MANIFEST.md) — all environment variables
- [docs/](docs/) — runbooks, disaster recovery, SLA, error codes, privacy policy
