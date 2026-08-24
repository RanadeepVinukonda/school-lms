# Genesis LMS — Server Deployment Guide

> **For the server administrator.** One command starts everything — backend + Nginx + load balancer.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     USERS (Browser)                      │
└───────────────┬──────────────────────┬───────────────────┘
                │ HTTPS                │ HTTPS
                ▼                      ▼
┌───────────────────────┐   ┌─────────────────────────────┐
│     Vercel (CDN)      │   │     Cloud Server (Docker)   │
│   Frontend App        │   │     Nginx → Backend (x2)    │
│  genesis-frontend-    │   │     Ports 80 + 443          │
│  teal.vercel.app      │   │                             │
└───────────────────────┘   └─────────────────────────────┘
                                        │
                                        ▼
                             ┌─────────────────────┐
                             │   Supabase (Cloud)   │
                             │   Database + Auth    │
                             └─────────────────────┘
```

---

## What You Need From Ranadeep

1. **4 files** from `deploy/` folder (see Step 2)
2. **`.env` file** with all production secrets (sent securely)

---

## Quick Start (5 minutes)

### Step 1 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and log back in, then verify:

```bash
docker --version        # Docker version 24+ or 25+
docker compose version  # Docker Compose v2+
```

### Step 2 — Copy files to server

```bash
mkdir -p /opt/genesis-lms
cd /opt/genesis-lms
```

Put these 4 files in `/opt/genesis-lms/`:

| File | What it does |
|------|-------------|
| `docker-compose.cloud.yml` | Starts Nginx + Backend containers |
| `nginx-backend.conf` | Nginx reverse proxy + load balancer config |
| `.env` | All production secrets (from Ranadeep) |
| `backend.env.template` | Reference for env vars (optional) |

### Step 3 — Verify `.env`

Open `.env` and check these critical values:

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://genesis-frontend-teal.vercel.app
COOKIE_SECURE=true
IMAGE_VERSION=v1.0.0
BACKEND_REPLICAS=2
```

### Step 4 — Start everything

```bash
cd /opt/genesis-lms
docker compose -f docker-compose.cloud.yml up -d
```

That's it. Nginx + Backend are running.

### Step 5 — Verify

```bash
# Check containers are up:
docker compose -f docker-compose.cloud.yml ps

# Health check (should return JSON with "status":"ok"):
curl http://localhost/health
```

---

## SSL Certificate (Required for HTTPS)

### 6a. Point DNS first

Go to your domain registrar (BigRock, GoDaddy, etc.) and add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | YOUR_SERVER_IP | 300 |

**Example:** Domain `school-lms.com` → add record `api` → `123.45.67.89`

Wait 5-10 minutes for DNS to propagate.

### 6b. Get the certificate

```bash
cd /opt/genesis-lms

# Create certbot directory
mkdir -p certbot/conf certbot/www

# Get the certificate (replace email and domain)
docker compose -f docker-compose.cloud.yml run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d api.YOUR-DOMAIN.com \
  --agree-tos \
  -m your-email@domain.com
```

### 6c. Restart with SSL

```bash
docker compose -f docker-compose.cloud.yml restart nginx
```

### 6d. Verify HTTPS

```bash
curl https://api.YOUR-DOMAIN.com/health
# Should return: {"status":"ok","database":"connected",...}
```

**SSL auto-renews** via the certbot service built into docker-compose.

---

## Day-to-Day Operations

### Update to a new version

Ranadeep pushes a new Docker image (e.g., `v1.1.0`). You update:

```bash
cd /opt/genesis-lms

# 1. Update IMAGE_VERSION in .env (or pass as env var):
#    IMAGE_VERSION=v1.1.0

# 2. Pull new image + restart (zero downtime):
docker compose -f docker-compose.cloud.yml pull
docker compose -f docker-compose.cloud.yml up -d
```

### Rollback

```bash
# Set IMAGE_VERSION back to previous version in .env, then:
docker compose -f docker-compose.cloud.yml up -d
```

### Scale replicas

```bash
# Run 3 backend instances:
docker compose -f docker-compose.cloud.yml up -d --scale backend=3

# Back to 2:
docker compose -f docker-compose.cloud.yml up -d --scale backend=2
```

### View logs

```bash
# Backend logs (last 100 lines):
docker compose -f docker-compose.cloud.yml logs backend --tail 100

# Nginx logs:
docker compose -f docker-compose.cloud.yml logs nginx --tail 50

# Follow live:
docker compose -f docker-compose.cloud.yml logs -f
```

### Restart everything

```bash
docker compose -f docker-compose.cloud.yml restart
```

---

## Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 1 core | 2 cores |
| Disk | 10 GB | 20 GB |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `docker: permission denied` | Run `sudo usermod -aG docker $USER` then log out/in |
| Container exits immediately | `docker compose -f docker-compose.cloud.yml logs backend --tail 50` |
| Health check fails | Check `.env` has all required vars, especially `DATABASE_URL` |
| Nginx 502 Bad Gateway | Backend not running — `docker compose -f docker-compose.cloud.yml ps` |
| SSL certificate fails | DNS not propagated — wait 10 min, check with `nslookup api.YOUR-DOMAIN.com` |
| CORS errors in browser | `FRONTEND_URL` in `.env` must match Vercel domain exactly |
| Port 80/443 already in use | Stop host nginx: `sudo systemctl stop nginx && sudo systemctl disable nginx` |

---

## Files on Server

```
/opt/genesis-lms/
├── docker-compose.cloud.yml    # Service definitions (Nginx + Backend)
├── nginx-backend.conf          # Nginx config (auto-mounted into container)
├── .env                        # Secrets (gitignored)
├── backend.env.template        # Reference for env vars
└── certbot/
    └── conf/                   # SSL certificates (auto-created)
```

---

## What Ranadeep Does (Not Your Job)

These are handled by Ranadeep — you don't need to do them:

| Task | When |
|------|------|
| Update `vercel.json` rewrites to point to your domain | After DNS is set |
| Update `capacitor.config.ts` allowNavigation | After DNS is set |
| Update `cors.ts` PRODUCTION_ORIGINS | After DNS is set |
| Build APK | When needed |
| Push new Docker image versions | When code changes |
