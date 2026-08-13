# Deployment

Where each piece runs today and how the client's cloud-server target fits in.

## Current topology

| Piece | Host | Config |
|---|---|---|
| Frontend (React SPA) | **Vercel** (`genesis-frontend-...vercel.app`) | `vercel.json` + `lms/frontend/` |
| Backend (Express API) | **Render** (`school-lms-api-b8cn.onrender.com`) | `.github/workflows/render-deploy.yml` |
| Database | **Supabase** (Postgres 16, pgvector, Storage, Auth) | `SUPABASE_*` env vars |
| Media | **Cloudinary** | `CLOUDINARY_*` env vars |
| Mobile APK | **Expo / macOS build** | `genesis-webview/` |

## The `/api` wiring (frontend → backend)

The frontend calls a **relative `/api`** (`src/lib/constants.ts` → `API_BASE_URL`).
`vercel.json` rewrites `/api/*` to the backend host, keeping cookies first-party
(WebView/CSRF-friendly).

```json
{
  "source": "/api/(.*)",
  "destination": "https://<backend-host>/api/$1"
}
```

Switching backend hosts = change **one** line in `vercel.json`.

## Moving the backend to the client's cloud server

Recommended: keep the frontend on Vercel; run the backend (and optionally Redis)
on the client's VM behind Nginx. Fully templated setup:

```
deploy/
├── README.md                 # step-by-step guide
├── backend.env.template      # backend env — fill the <<...>> values
├── docker-compose.cloud.yml  # backend + optional redis
├── nginx-backend.conf        # Nginx reverse proxy (TLS, timeouts, rate limits)
└── vercel.json.cloud         # the one frontend change (rewrite destination)
```

Follow [`deploy/README.md`](../deploy/README.md) end to end. High-level steps:

1. DNS: `api.<domain>` → server IP.
2. Copy `backend.env.template` → `lms/backend/.env`, fill values
   (`NODE_ENV=production`, `PORT=4000`, Supabase, Gemini, Cloudinary, `DATABASE_URL`…).
3. `docker compose -f deploy/docker-compose.cloud.yml up -d --build`.
4. Nginx site → TLS via certbot → `/api` proxied to `127.0.0.1:4000`.
5. Change `vercel.json` rewrite destination to the new API host; push.
6. Set `CRON_SECRET` and `YOUTUBE_API_KEY` (recommended).

### Production gotchas

- `DATABASE_URL` is effectively required (health + raw-SQL transactions) — use the
  Supabase transaction/session pooler URI, `DATABASE_POOL_MAX` ≤ 20.
- `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` move Inngest out of dev mode;
  otherwise textbook uploads process **inline** and block the API.
- Backend container must run on `PORT=4000` (Docker HEALTHCHECK is hardcoded).
- Env/secret control list: [`ENV_MANIFEST.md`](../ENV_MANIFEST.md).

## Local Docker stack

```bash
docker-compose up --build   # postgres:5432, backend:4000, frontend:80
```

## Mobile / APK

See [`BUILD_APK.md`](../BUILD_APK.md) and the `genesis-webview/` Expo project.
The WebView loads the deployed frontend URL, so it picks up backend moves
automatically via the Vercel rewrite.