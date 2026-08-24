# Genesis LMS — Server Deployment Guide

> **For the server administrator.** This guide covers deploying the backend API to a cloud server using Docker.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     USERS (Browser)                      │
└───────────────┬──────────────────────┬───────────────────┘
                │ HTTPS                │ HTTPS
                ▼                      ▼
┌───────────────────────┐   ┌─────────────────────────────┐
│     Vercel (CDN)      │   │     Cloud Server            │
│   Frontend App        │   │     Nginx → Backend (x2)    │
│  genesis-frontend-    │   │     Port 4000               │
│  teal.vercel.app      │   │                             │
└───────────────────────┘   └─────────────────────────────┘
                                        │
                                        ▼
                             ┌─────────────────────┐
                             │   Supabase (Cloud)   │
                             │   Database + Auth    │
                             └─────────────────────┘
```

**Your role:** Get the backend running on your cloud server. Frontend is already on Vercel (managed by Ranadeep).

---

## Quick Checklist

Before starting, confirm you have these from Ranadeep:

- [ ] `.env` file with all production secrets (sent securely, **never over plain text**)
- [ ] Access to this repo's `deploy/` folder (or Ranadeep sends the 3 files)

Then follow these steps in order:

| Step | Task | Who |
|------|------|-----|
| 1 | Install Docker on server | You |
| 2 | Copy files to server | You |
| 3 | Fill in `.env` | You + Ranadeep |
| 4 | Start Docker containers | You |
| 5 | Install Nginx + SSL | You |
| 6 | Point DNS `api.YOUR-DOMAIN.com` → server IP | You |
| 7 | Update `vercel.json` on Vercel | Ranadeep |
| 8 | Build APK (if needed) | Ranadeep |

---

## Step 1 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and log back in, then verify:

```bash
docker --version        # Docker version 24+ or 25+
docker compose version  # Docker Compose v2+
```

---

## Step 2 — Copy Files to Server

Create a directory and copy these 3 files into it:

```bash
mkdir -p /opt/genesis-lms
cd /opt/genesis-lms
```

**Files needed in `/opt/genesis-lms/`:**

| File | Source |
|------|--------|
| `docker-compose.cloud.yml` | From repo `deploy/` folder |
| `nginx-backend.conf` | From repo `deploy/` folder |
| `.env` | Sent by Ranadeep (contains all secrets) |

**Optional but recommended:** Also copy `backend.env.template` for reference.

---

## Step 3 — Configure `.env`

Open `.env` and verify these critical values are correct:

```env
# MUST be production
NODE_ENV=production

# MUST be 4000 (matches Docker HEALTHCHECK)
PORT=4000

# Frontend URL (CORS allow-list)
FRONTEND_URL=https://genesis-frontend-teal.vercel.app

# HTTPS cookies required in production
COOKIE_SECURE=true

# Docker image version (Ranadeep will tell you which version)
IMAGE_VERSION=v1.0.0

# Number of backend replicas (start with 2)
BACKEND_REPLICAS=2

# Supabase connection string (from Ranadeep)
DATABASE_URL=postgresql://...

# Cron secret for scheduled jobs (generate with: openssl rand -hex 32)
CRON_SECRET=...
```

**Do NOT change:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_*`, `GEMINI_API_KEY` — these are pre-filled in the `.env` Ranadeep sends you.

---

## Step 4 — Start Backend

```bash
cd /opt/genesis-lms
docker compose -f docker-compose.cloud.yml up -d
```

Verify it's running:

```bash
docker compose -f docker-compose.cloud.yml ps
# Should show 2 backend containers with "Up" status

curl http://localhost:4000/health
# Should return: {"status":"ok","database":"connected",...}
```

**Troubleshooting:**

```bash
# If container won't start, check logs:
docker compose -f docker-compose.cloud.yml logs backend --tail 50

# Common issue: missing env var. Check .env file has all required keys.
```

---

## Step 5 — Install Nginx + SSL

### 5a. Install Nginx

```bash
sudo apt update && sudo apt install -y nginx
```

### 5b. Configure Nginx

```bash
# Copy the config file
sudo cp nginx-backend.conf /etc/nginx/sites-available/genesis-backend

# Enable the site
sudo ln -sf /etc/nginx/sites-available/genesis-backend /etc/nginx/sites-enabled/

# Remove default site if it conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### 5c. Get SSL Certificate

**First:** Point your DNS (see Step 6), then run:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.YOUR-DOMAIN.com
```

Certbot automatically:
- Obtains the SSL certificate
- Updates Nginx config with SSL directives
- Sets up auto-renewal

### 5d. Verify Nginx

```bash
curl http://localhost/health
# Should return the same health response as Step 4
```

---

## Step 6 — Point DNS

**Who:** You (server admin) or domain owner.

1. Log in to your domain registrar (BigRock, GoDaddy, etc.)
2. Find DNS management for your domain
3. Add this record:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | YOUR_SERVER_IP | 300 |

**Example:** If your domain is `school-lms.com`, add:
- Name: `api`
- Value: `123.45.67.89` (your server's public IP)

**Wait 5-10 minutes** for DNS propagation, then verify:

```bash
nslookup api.YOUR-DOMAIN.com
# Should return your server IP

curl https://api.YOUR-DOMAIN.com/health
# Should return: {"status":"ok",...}
```

---

## Step 7 — Update Vercel Frontend (Ranadeep's Job)

**This is NOT done on your server.** Ranadeep updates the frontend to point API calls to your server.

Ranadeep will:
1. Replace `vercel.json` with the version from `deploy/vercel.json.cloud`
2. Replace `YOUR-DOMAIN.com` with your actual domain
3. Push to trigger a new Vercel deployment

**You don't need to do anything here** — just confirm the health endpoint works on your server.

---

## Step 8 — APK Build (Ranadeep's Job)

**This is NOT done on your server.** Ranadeep builds the APK locally and sends it to you for distribution.

You don't need to do anything here.

---

## Day-to-Day Operations

### Update to a new version

Ranadeep will push a new Docker image tag (e.g., `v1.1.0`). You update and restart:

```bash
cd /opt/genesis-lms

# Update IMAGE_VERSION in .env
# Then pull and restart:
docker compose -f docker-compose.cloud.yml pull
docker compose -f docker-compose.cloud.yml up -d
```

### Rollback if something breaks

```bash
# Set IMAGE_VERSION back to previous version in .env
docker compose -f docker-compose.cloud.yml up -d
```

### Scale replicas up/down

```bash
# Run 3 backend instances instead of 2:
BACKEND_REPLICAS=3 docker compose -f docker-compose.cloud.yml up -d
```

### View logs

```bash
# Last 100 lines:
docker compose -f docker-compose.cloud.yml logs backend --tail 100

# Follow live:
docker compose -f docker-compose.cloud.yml logs -f backend
```

### Restart everything

```bash
docker compose -f docker-compose.cloud.yml restart
sudo systemctl restart nginx
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
| Container exits immediately | Check logs: `docker compose -f docker-compose.cloud.yml logs backend` |
| Health check fails | Verify `.env` has all required vars, especially `DATABASE_URL` |
| Nginx 502 Bad Gateway | Backend not running — check `docker compose ps` |
| SSL certificate fails | DNS not propagated yet — wait 10 min, check with `nslookup` |
| CORS errors in browser | `FRONTEND_URL` in `.env` must match the Vercel domain exactly |

---

## Files Reference

| File | Purpose | Location on Server |
|------|---------|-------------------|
| `docker-compose.cloud.yml` | Docker service definitions | `/opt/genesis-lms/` |
| `nginx-backend.conf` | Nginx reverse proxy + load balancer | `/etc/nginx/sites-available/genesis-backend` |
| `.env` | All production secrets | `/opt/genesis-lms/` (gitignored) |
| `backend.env.template` | Reference for env vars | `/opt/genesis-lms/` (optional) |
