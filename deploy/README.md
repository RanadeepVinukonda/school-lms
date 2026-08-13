# Genesis LMS — Backend on a Cloud Server (Frontend stays on Vercel)

The **frontend stays on Vercel** (static CDN). This guide moves **only the backend**
from Render onto the client's cloud server, behind **Nginx (TLS reverse proxy)**,
with optional **Redis** for a later shared cache. Templates you only need to fill in:

| File | Purpose |
|---|---|
| `deploy/backend.env.template` | Backend env vars — copy to `lms/backend/.env` on the server, fill values |
| `deploy/docker-compose.cloud.yml` | Runs backend (and optional Redis) in Docker |
| `deploy/nginx-backend.conf` | Host Nginx → reverse-proxies `/api` to the backend |
| `deploy/vercel.json.cloud` | Frontend wiring — replace the Render URL in your real `vercel.json` |

---

## 1. Topology

```
Browser
   │  https://genesis-frontend-....vercel.app
   ▼
Vercel (frontend, static)
   │  vercel.json rewrite:  /api/(.*)  →  https://api.YOURDOMAIN.com/api/$1
   ▼
Cloud server (your box)
   └─ Nginx (:443, certbot TLS)          # deploy/nginx-backend.conf
        └─ 127.0.0.1:4000                # backend Docker container
             ├─ Supabase (DB)            # stays managed off-box
             ├─ Cloudinary (media)
             └─ Redis :6379 (optional)
```

- The frontend calls a **relative `/api`** path (`src/lib/constants.ts`), so all
  API traffic is same-origin through Vercel → your server. Cookies stay
  first-party → CSRF + session cookies work exactly like today.
- **TLS terminates on your server's Nginx** (certbot), not on Vercel.
- Database/media never live on the box (Supabase + Cloudinary).

---

## 2. What to run on the server

- **Docker** (backend container) — recommended.
- **Nginx** (host) — TLS + reverse proxy (template provided).
- **certbot** — free Let's Encrypt cert.
- **Redis** — optional, not required yet (see §7).

---

## 3. The `.env` (copy → fill)

On the server, copy `deploy/backend.env.template` to `lms/backend/.env` and fill in
every `<< ... >>`. **Exactly these are REQUIRED or the app won't boot:**
`NODE_ENV`, `PORT=4000`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Critical values for a real server:

| Var | Value / why |
|---|---|
| `NODE_ENV=production` | enables security headers, JSON logs, strict sameSite cookie |
| `PORT=4000` | matches the Docker HEALTHCHECK — **do not change** |
| `FRONTEND_URL` | your exact Vercel URL (CORS allow-list) |
| `COOKIE_SECURE=true` | httpOnly cookies only over HTTPS |
| `DATABASE_URL` | **required** for `/health`, `/health/deep`, and raw-SQL transactions (fee, inventory, timetable, advisory locks). Use the Supabase **transaction/session pooler** URI, e.g. `postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres` |
| `DATABASE_POOL_MAX=20` | keep ≤ 20 per instance (Supabase pooler cap) |
| `CRON_SECRET=` | `openssl rand -hex 32`. If unset, `/jobs/cron/*` is unauthenticated |
| `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` | get from app.inngest.com. Without them Inngest runs **dev mode** and textbook uploads are processed **inline** in the same process (works, but blocks the API during heavy uploads) |
| `YOUTUBE_API_KEY` | keeps your verified Khan Academy video search working |

---

## 4. Docker Compose (`deploy/docker-compose.cloud.yml`)

```bash
cd /opt/genesis                      # repo root (so ../lms/backend context resolves)
cp deploy/backend.env.template lms/backend/.env   # then edit it
docker compose -f deploy/docker-compose.cloud.yml up -d --build
docker compose -f deploy/docker-compose.cloud.yml ps
```

Touch test from the host:
```bash
curl http://127.0.0.1:4000/health           # {"ok":true,...} or HTTP 200
curl http://127.0.0.1:4000/                 # {"success":true,"status":"ok",...}
```

Notes baked into the template:
- Port **4000 bound to loopback only** — the container is NOT exposed publicly.
- `memory: 2G` — the textbook pipeline (pdf-parse, transformers ONNX embeddings,
  tesseract OCR) is CPU/RAM heavy and runs in this same process.
- `stop_grace_period: 30s` — lets graceful shutdown drain the PG pool + scheduler.
- Healthcheck uses `/health` (matches `Dockerfile`).

---

## 5. Nginx (`deploy/nginx-backend.conf`)

```bash
sudo cp deploy/nginx-backend.conf /etc/nginx/sites-available/genesis-backend
sudo sed -i 's/api.YOURDOMAIN.com/api.yourschool.com/g' /etc/nginx/sites-available/genesis-backend
sudo ln -s /etc/nginx/sites-available/genesis-backend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourschool.com     # turns on HTTPS + auto-renew
```

Why the template looks like this:
- **Long proxy timeouts (600s)** — `/api/inngest` can run the textbook pipeline for
  minutes; `/api/ocr/*` allows 180–240s server-side; `/api/ai/*` generates long.
- **`client_max_body_size 55m`** — textbook PDFs allowed up to 50 MB.
- **`proxy_buffering off`** — safe for streaming/long polls.
- **Rate-limit zone at Nginx** *in addition to* the app's Express limiters
  (Express rate limits are in-memory/per-process).
- `location / { return 404 }` — the API host serves no static files.

> Nginx `trust proxy`: the app sets `app.set('trust proxy', 1)` (app.ts:34), and your
> Nginx is the single proxy hop — matches. Do NOT add another public proxy in front,
> or the client IPs + rate limits will misbehave.

---

## 6. Wire the frontend (the only frontend change)

Your repo's `vercel.json` currently rewrites `/api` to Render:
```json
"source": "/api/(.*)",
"destination": "https://school-lms-api-b8cn.onrender.com/api/$1"
```
Change ONE line to your server:
```json
"destination": "https://api.your-school-domain.com/api/$1"
```
Deploy Vercel (or commit + push — it auto-deploys). No frontend rebuild or env
change is needed because the base URL is the relative `/api`.

> Optional: if you prefer direct API calls with `VITE_API_BASE_URL=https://api....`,
> you'd need cross-origin cookie handling (`COOKIE_DOMAIN`, SameSite). Don't — the
> Vercel rewrite is simpler and keeps cookies first-party.

---

## 7. Redis (optional; only when you scale)

The backend **does not read Redis yet** — caching is in-memory
(`src/utils/cache.ts`: users, classes, fees, quizzes, settings caches + LRU). Redis
becomes useful when you run **multiple backend replicas** and need one shared cache
(or a job queue for the heavy pipeline). Plan:

1. Uncomment the `redis` service in `deploy/docker-compose.cloud.yml`.
2. `npm i ioredis` in `lms/backend`.
3. Add `src/utils/redis.ts` + a `cached(key, ttl, fn)` helper (see
   `docs/CLOUD_DEPLOY_GUIDE.md` earlier draft) wiring `REDIS_URL=redis://redis:6379`.
4. Swap the heaviest in-memory caches (subject icons/listing, academic-year, AI
   responses) to Redis.

**Don't** wire Redis today unless you're already seeing memory/scale pressure — the
in-memory LRU cache is adequate for a single backend instance.

---

## 8. Scaling the backend (do this LAST)

Single instance handles a school easily. When you grow:

1. **One instance, bigger box** — simplest: bump memory/CPU in the compose file.
2. **Nginx keep-alive + gzip** — already set.
3. **Multiple replicas** — requires decisions because:
   - Rate limiters are **in-memory per process** (limits multiply per replica).
   - The 7 in-process schedulers run in **every** replica (duplicate jobs —
     mostly guarded by Postgres advisory locks, but still).
   - Inngest `textbook-pipeline` is a **separate** worker — the cleanest
     split is: API replicas (no pipeline) + one dedicated worker.
   - Then add Redis for a shared cache + rate-limit store.

So: **start with 1 replica** + increase resources. Only multi-replica when a school
needs it — and then prefer "Nginx → weighted upstream of 2–3 backend replicas".

---

## 9. Go-live checklist

- [ ] DNS A record `api.<domain>` → server IP; propagation confirmed
- [ ] `lms/backend/.env` filled (REQUIRED keys present, `DATABASE_URL` set)
- [ ] `docker compose -f deploy/docker-compose.cloud.yml up -d` → healthy
- [ ] `curl http://127.0.0.1:4000/health` returns ok
- [ ] Nginx serving `https://api.<domain>/api/health` through TLS
- [ ] `vercel.json` rewrite destination = `https://api.<domain>/api/$1`; app login works
- [ ] `CRON_SECRET` set; `YOUTUBE_API_KEY` set
- [ ] ufw allows only 22, 80, 443
- [ ] Redis: only if you added the app-side helper (§7)
- [ ] Verify textbooks still process (reprocess one) after switching