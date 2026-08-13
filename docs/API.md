# Genesis LMS — API Reference

The backend exposes an Express REST API at `/api`. The **authoritative** reference
is the live Swagger UI (`GET /api-docs`) — this page is the human-readable map.

## Base URLs

| Environment | Base |
|---|---|
| Local dev | `http://localhost:3001/api` |
| Local Docker | `http://localhost:4000/api` |
| Vercel frontend → backend | same-origin `/api` (rewritten by `vercel.json`) |
| Cloud server (client) | `https://api.<domain>/api` (Nginx-proxied) |

The backend strips the leading `/api` internally (`src/app.ts`), so `/api/health`
and `/health` both resolve.

## Authentication

Two supported methods:

1. **Bearer token** — `Authorization: Bearer <jwt>` (Supabase-issued JWT,
   verified via `supabase.auth.getUser`).
2. **httpOnly session cookie** — set on `/auth/refresh` and OTP login. Requires
   `COOKIE_SECURE=true` in production; cross-subdomain use needs `COOKIE_DOMAIN`.

Mutating requests (`POST/PUT/PATCH/DELETE`) also require the CSRF double-submit:
`x-csrf-token` header must match the `csrf-token` cookie. Exempt endpoints:
login, register, refresh, forgot/reset password.

## Response envelope

```json
{
  "success": true,
  "data": { "..." }
}
```

Errors (see [`ERROR_CODES.md`](ERROR_CODES.md)):

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Human-readable message",
    "requestId": "req-...",
    "details": {}
  }
}
```

## Versioning

Routes are mounted at both `/` and `/api/v1` for backward-compatible migration.
New endpoints should mount under `/api/v1`.

## Route groups

### Auth — `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Password login |
| POST | `/auth/refresh` | Refresh token + set cookie |
| POST | `/auth/logout` | Revoke token, clear cookie |
| POST | `/auth/session` | Restore session from cookie |
| POST | `/auth/forgot-password` / `/auth/reset-password` / `/auth/reset-with-token` | Password flows |
| POST | `/auth/mfa/setup` / `/auth/mfa/verify` | TOTP MFA |
| GET | `/csrf-token` | Fetch CSRF token (sets cookie) |

### Health & infrastructure
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Shallow health (DB ping) |
| GET | `/health/deep` | Probes DB, AI provider, Supabase |
| GET | `/health/ready` | Load-balancer readiness (`SELECT 1`) |
| GET | `/metrics` | Prometheus metrics (admin) |
| GET | `/api-docs` | Swagger UI |
| GET | `/api-docs.json` | OpenAPI JSON |
| POST | `/jobs/cron/reminders`, `/jobs/cron/cleanup`, `/jobs/cron/reports` | Manual cron triggers (header `x-cron-secret` = `CRON_SECRET`) |

### School — `/schools`, `/class`, `/subject`, `/academic-year`, ...
Classes, subjects, classrooms, enrollments, teacher-class-subject mappings,
teacher videos.

### Finance — `/fee`, `/payroll`
Fee structures, payments, receipts (PDF), outstanding reports; payroll runs and
payslips.

### Academics
Courses, lessons, assignments (v1/v2), quizzes (v1/v2), exams (v1/v2), grades,
analytics, concepts, textbooks, attendance, timetable, coding challenges, mind
maps, gamification, NEP questions, virtual labs, adaptive quizzes, reports.

### HR — `/staff`, `/leave`, `/transport`, `/inventory`
Staff CRUD, leave workflow, transport routes, inventory with atomic deduction.

### Content — `/upload`, `/ai`, `/ocr`, `/youtube`, `/cloudinary`
File uploads, AI chat/tutor/question-generator, OCR (image → text, up to 180-240s),
YouTube search, Cloudinary ops.

### Other
`/user` (GDPR export/delete), `/messages`, `/notifications`, `/settings`,
`/audit`, `/notice`, `/parent`, `/timetable`, `/results-push`, `/lti`.

## Rate limits (per IP / user)

| Limiter | Limit | Env vars |
|---|---|---|
| Auth | 100 / 5 min | `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MS` |
| API | 100 / 1 min | `API_RATE_LIMIT_MAX` / `API_RATE_LIMIT_WINDOW_MS` |
| AI chat | 10 / 1 min per user | `AI_RATE_LIMIT_MAX` / `AI_RATE_LIMIT_WINDOW_MS` |
| Upload/OCR | 5 / 1 min | hardcoded |
| Health | 30 / 1 min | hardcoded |

Limits are in-memory per process. Behind Nginx, also enforce `limit_req`
(`deploy/nginx-backend.conf`).

## CORS

Production allow-list (`src/config/cors.ts`): `https://app.school-lms.com`,
the Vercel frontend, `FRONTEND_URL`, `capacitor://localhost`, localhost dev ports,
and `^https://genesis-frontend-.*\.vercel\.app$` previews. Add your own frontend
origin by setting `FRONTEND_URL` or appending to `PRODUCTION_ORIGINS`.

## Long-running endpoints (proxy timeouts)

| Endpoint | Server timeout | Notes |
|---|---|---|
| `/api/inngest` | minutes | Inngest drains the textbook pipeline |
| `/ocr/scan*`, `/ocr/chat` | 180–240s | OCR + AI |
| `/ai/*` | 30s global, extended per-route | AI generation |

Set Nginx `proxy_read_timeout` ≥ 600s (`deploy/nginx-backend.conf`).