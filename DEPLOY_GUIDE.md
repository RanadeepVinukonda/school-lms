# Genesis School LMS — Production Deployment & Scaling Guide

This guide takes the LMS from a dev box to a production server (physical or cloud) that can serve a whole school — thousands of students — and shows how to scale it when you outgrow one machine.

## 1. Stack Summary (what you're deploying)

| Component | Tech | Where it runs |
|-----------|------|---------------|
| Frontend (web) | Vite + React, served by nginx | `lms/frontend` container |
| Backend API | Express + TypeScript (Drizzle ORM) | `lms/backend` container |
| Database | PostgreSQL 16 | `lms/docker-compose.prod.yml` |
| Connection pooler | PgBouncer | `lms/docker-compose.prod.yml` |
| Auth | Supabase (JWT) — cloud | supabase.co |
| File uploads | Cloudinary — cloud | cloudinary.com |
| AI / OCR | Gemini API, tesseract.js | backend (heavy!) |
| Mobile | Expo app → hits the same API + Supabase | APK |

The heavy compute is already offloaded to cloud services (Supabase auth, Cloudinary files). Your server mainly runs the API, Postgres, and static files — which is exactly the part that scales cheaply.

## 2. Recommended Server Size (one machine start)

Estimate: **4 vCPU, 8 GB RAM, 80 GB SSD** — comfortable for 2,000–5,000 students.
Smaller pilot: **2 vCPU / 4 GB** works for ~1,000 students.

Recommended providers: Hetzner (cheapest), DigitalOcean/Vultr (easiest), or any physical server with Ubuntu 22.04/24.04. A school LAN server also works — the whole stack runs behind one IP.

Container memory budget (already capped in `docker-compose.prod.yml`):
postgres 512M + pgbouncer 128M + backend 1G + frontend 256M ≈ **2 GB**, so an 8 GB box has room for 2–3 backend replicas later.

## 3. First Deploy (single server, TLS, nginx)

### Step 1 — Install Docker + nginx on Ubuntu

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # re-login after this
```

### Step 2 — Get the code + secrets

```bash
sudo mkdir -p /opt/school-lms && sudo chown "$USER" /opt/school-lms
git clone https://github.com/RanadeepVinukonda/school-lms.git /opt/school-lms
cd /opt/school-lms/lms
cp backend/.env.production.template backend/.env
nano backend/.env   # fill: FRONTEND_URL, SUPABASE_*, CLOUDINARY_*, GEMINI_API_KEY, DB_PASSWORD
```

Required values in `backend/.env`:
- `DB_PASSWORD` — used by `docker-compose.prod.yml` (also set in the shell: `export DB_PASSWORD=...`)
- `FRONTEND_URL=https://lms.your-school-domain.com`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY`
- `COOKIE_SECURE=true`

Point the domain's A record to the server's public IP before Step 4 (certbot needs it).

### Step 3 — Host nginx as the edge reverse proxy

The frontend container already bundles nginx, but you want a **host-level nginx** in front: TLS termination, gzip, asset caching, and one place to add more backend replicas later.

`/etc/nginx/sites-available/school-lms`:

```nginx
upstream backend_api {
    server 127.0.0.1:4000;
    # When you scale: add more replicas on other ports, e.g.
    # server 127.0.0.1:4001;
    # server 127.0.0.1:4002;
    keepalive 32;
}

server {
    listen 80;
    server_name lms.your-school-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lms.your-school-domain.com;

    ssl_certificate     /etc/letsencrypt/live/lms.your-school-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lms.your-school-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 50m;   # file uploads (Cloudinary proxy path)

    # ---- API goes straight to backend replicas ----
    location /api/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
        proxy_next_upstream error timeout http_502 http_503;   # failover between replicas
    }

    # ---- Everything else = static frontend ----
    location / {
        proxy_pass http://127.0.0.1:80;       # frontend nginx container
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/school-lms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
```

### Step 4 — TLS with Let's Encrypt (auto-renew)

```bash
sudo certbot --nginx -d lms.your-school-domain.com
# certbot rewrites the 443 block with real cert paths; re-add the /api/ block if it was replaced.
sudo systemctl enable --now certbot.timer   # auto-renew
```

### Step 5 — Build & start the stack

```bash
cd /opt/school-lms/lms
export DB_PASSWORD=YourStrongDBPassword
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps   # all 4 should be healthy
```

Frontend at `https://lms.your-school-domain.com`, API at `https://lms.your-school-domain.com/api/`.

### Step 6 — Point the mobile APK at it

The Android app is the Vite frontend wrapped in a Capacitor shell. Set the env vars in `lms/frontend/.env` (used at web-build time) before running the APK build:
```
VITE_API_BASE_URL=https://lms.your-school-domain.com/api
VITE_SUPABASE_URL=...   # same as web
VITE_SUPABASE_ANON_KEY=...
```
Rebuild the APK with `scripts/build-android-release.ps1` (Windows) or `scripts/build-android-release.sh` (POSIX). If the school is on one LAN, use a local IP domain instead — the nginx setup is identical.

## 4. Backups (do this on day one)

```bash
sudo crontab -e
```
```cron
# 03:00 daily: dump DB, keep 14 days
0 3 * * * docker exec $(docker ps -qf name=postgres) pg_dump -U lms -d school_lms -Fc -f /tmp/lms.dump && docker cp $(docker ps -qf name=postgres):/tmp/lms.dump /opt/backups/lms-$(date +\%F).dump && find /opt/backups -name 'lms-*.dump' -mtime +14 -delete
```

Files are on Cloudinary and auth on Supabase, so the Postgres dump is the only on-server state that matters.

## 5. Scaling — as the school grows

### Tier 1: Same server, more backend processes (up to ~10k students)

The API is stateless (JWT in a cookie, verified against Supabase), so you scale the backend by running more replicas. nginx round-robins and auto-fails-over (the `proxy_next_upstream` line in §3).

```bash
cd /opt/school-lms/lms
docker compose -f docker-compose.prod.yml up -d --scale backend=3 --no-recreate backend
```
Publish each on a different host port (4000, 4001, 4002) and add them to the `upstream backend_api` block. Then:
```bash
sudo nginx -s reload
```

What scales in this tier:
- Backend replicas (Node is single-threaded; 3 replicas ≈ 3x request capacity).
- PgBouncer already pools Postgres connections (it's in the compose file).
- Static files are served by nginx (cheap, ~thousands of requests/sec).

Known limits to accept or fix at this tier:
- `express-rate-limit` uses in-memory stores → each replica counts separately. Fine for a school; if you want a shared limit, add Redis (below).
- Tesseract OCR + Gemini calls are CPU/latency heavy. If OCR is used a lot, run one backend as a dedicated worker container, or bump CPU on the box.

### Tier 2: Shared Redis (limits + future session store)

```bash
# docker-compose.prod.yml  — add:
redis:
  image: redis:7-alpine
  restart: unless-stopped
```
Point rate limits at it by adding `redis` to the backend `depends_on` and wiring a `rate-limit-redis` store — or keep it simple and just note that per-instance limits are acceptable for now.

### Tier 3: Multiple servers (very large schools)

When one box saturates (watch CPU/memory/`/metrics`):

1. **Database → managed Postgres** (Supabase, AWS RDS, or a second dedicated DB server with PgBouncer). Postgres is the single hardest thing to shard — move it off the app server first.
2. **Backend replicas across servers**, all pointing at the same managed DB + Redis:
   - Add a second server, run the same `docker-compose.prod.yml` minus `postgres`.
   - Add its IP to the host nginx `upstream backend_api`.
3. **CDN for static assets** — point Cloudflare at the domain; nginx on the origin stays. Cloudflare also gives DDoS protection and HTTP/3.
4. App instances stay stateless, so you can also swap to a cloud load balancer (ALB / Hetzner LB) in front of both boxes.

Rough ceiling: one 4 vCPU box ≈ several thousand concurrent users; a 2–3 box cluster with managed Postgres handles a 10k+ student school comfortably.

## 6. Monitoring & ops

Already built in:
- `/health` endpoint — used by container healthchecks and can be hooked to UptimeRobot/Pingdom.
- Prometheus metrics at `/metrics` (`prom-client`) — scrape with Prometheus + Grafana when you want dashboards.
- Sentry (`SENTRY_DSN`) — enable for error tracking.

Minimum you should run from day one:
- UptimeRobot on `https://lms.your-school-domain.com/health`
- The cron backup from §4
- `docker compose ps` + `df -h` in a weekly cron, email output

## 7. Rolling update (zero-downtime-ish)

```bash
cd /opt/school-lms/lms
git pull
export DB_PASSWORD=YourStrongDBPassword
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```
With backend replicas + `proxy_next_upstream`, restarting one at a time gives true zero downtime:
```bash
docker compose -f docker-compose.prod.yml up -d --no-deps --scale backend=3
docker compose -f docker-compose.prod.yml restart backend
```

## 8. Security checklist

- `COOKIE_SECURE=true` in production `.env`.
- UFW: allow only 22, 80, 443 (block everything else including 4000, 5432, 6432).
- `DB_PASSWORD` from a secret manager or `.env`, never committed.
- Keep Supabase service-role key server-side only.
- The compose file already runs containers read-only with `no-new-privileges`.
- Test a restore from your backup once before you need it.
