# School LMS — Deployment Guide

[![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?logo=render&logoColor=white)](https://dashboard.render.com)

## Architecture

```
                         ┌─────────────┐
                         │   Domain    │
                         │  (Caddy/Nginx)
                         └──────┬──────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
              ┌─────▼─────┐          ┌──────▼──────┐
              │  Frontend  │          │   Backend   │
              │  (nginx)   │◄────────►│  (Express)  │
              │   port 80  │  /api/   │  port 4000  │
              └────────────┘          └──────┬───────┘
                                             │
                                      ┌──────▼───────┐
                                      │  Supabase     │
                                      │  (managed DB) │
                                      └──────────────┘
```

- **Backend**: Express.js TypeScript API (Docker, port 4000)
- **Frontend**: Vite React SPA served by nginx (Docker, port 80)
- **Database**: Supabase PostgreSQL (managed — not self-hosted)
- **CI/CD**: GitHub Actions → build Docker images → push to GHCR → SSH deploy to VPS

---

## Render Deployment (Backend)

The backend is deployed on **Render** (Web Service). GitHub Actions triggers a deploy on every push to `main` that touches `lms/backend/`.

### GitHub Secrets for Render

Add these to **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `RENDER_DEPLOY_HOOK` | Deploy hook URL from Render Dashboard → Backend Service → Deploy Hooks |
| `RENDER_API_KEY` | Render API key (Account Settings → API Keys) |
| `RENDER_SERVICE_ID` | Backend service ID (from Render dashboard URL: `/services/srv-XXXXX`) |

### Set Up Deploy Hook

1. Go to **Render Dashboard** → **genesis-backend** service
2. Click **Deploy Hooks** → **Create Deploy Hook**
3. Copy the generated URL
4. Add it as `RENDER_DEPLOY_HOOK` in GitHub Secrets

Every push to `main` with backend changes will now:
1. Call the deploy hook → Render starts a new deploy
2. Wait for the deploy to finish
3. Report status back to GitHub (✅/❌ on the commit)

---

## Prerequisites

| Thing | Why |
|---|---|
| **Docker** (VPS) | Run containers |
| **Docker Compose v2** (VPS) | Orchestrate services |
| **SSH key** | GitHub Actions connects to VPS |
| **Domain** (optional) | SSL cert, production URL |
| **GitHub account** | GHCR, Actions, Secrets |
| **Supabase project** | Database, auth, storage |
| **Cloudinary account** | Image/file uploads |
| **Gemini API key** | AI features |

---

## Environment Variables — GitHub Secrets

Add these to **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `SSH_HOST` | VPS IP or hostname |
| `SSH_USER` | SSH username (root or deploy user) |
| `SSH_KEY` | Private SSH key (PEM format) |
| `SSH_PORT` | SSH port (default `22`) |
| `GHCR_PAT` | GitHub PAT with `read:packages` scope for image pulls on VPS |
| `BACKEND_ENV` | Base64-encoded `lms/backend/.env.production` file |
| `FRONTEND_ENV` | Base64-encoded `lms/frontend/.env.production` file |
| `DOMAIN` | Production domain (e.g., `lms.your-school.com`) |

### Preparing Env Secrets

```bash
# Encode backend .env to base64 (Windows PowerShell)
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content "lms/backend/.env.production" -Raw)))

# Encode backend .env to base64 (Linux/Mac)
base64 -w0 lms/backend/.env.production

# Copy output → paste as GitHub secret "BACKEND_ENV"
# Same for FRONTEND_ENV
```

---

## VPS First-Time Setup

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
docker --version
```

### 2. Create App Directory

```bash
sudo mkdir -p /opt/school-lms
sudo chown $USER:$USER /opt/school-lms
```

### 3. Open Firewall Ports

```bash
# Allow HTTP, HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Allow SSH
sudo ufw allow 22/tcp
sudo ufw enable
```

### 4. Configure Domain DNS

Point your domain's DNS A record to the VPS IP address.

---

## Deploy

### Automatic (CI/CD)

Push to `main` → GitHub Actions runs:

1. Build backend Docker image → push to `ghcr.io/<repo>/backend:<sha>`
2. Build frontend Docker image → push to `ghcr.io/<repo>/frontend:<sha>`
3. SSH to VPS → pull images → `docker compose up -d` → health check

### Manual

```bash
# Build images
docker build -t lms-backend lms/backend
docker build -t lms-frontend lms/frontend

# Run with compose
DB_PASSWORD=yourpassword docker compose up -d
```

---

## SSL / Certbot

Use Caddy for automatic HTTPS (simplest) or nginx + certbot.

### Option A: Caddy (Recommended)

Create `/opt/school-lms/Caddyfile`:

```
your-domain.com {
    reverse_proxy frontend:80
}
```

Add to `docker-compose.yml`:

```yaml
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - frontend

volumes:
  caddy_data:
```

Caddy auto-provisions and renews SSL certs.

### Option B: Nginx + Certbot (Traditional)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (certbot adds systemd timer automatically)
sudo certbot renew --dry-run
```

Nginx config on host (proxies to Docker frontend):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Health Checks

After deploy, verify:

```bash
# Backend health
curl http://localhost:4000/health

# Deep health (checks DB, AI, Supabase connectivity)
curl http://localhost:4000/health/deep

# Frontend
curl -I http://localhost:80
```

---

## Backup Strategy

### Database (Supabase)

Supabase provides automated backups on Pro plan. For self-hosted Postgres:

```bash
# Manual backup
docker exec -t school-lms-postgres-1 pg_dump -U lms school_lms > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker exec -i school-lms-postgres-1 psql -U lms school_lms
```

### Cron job on VPS (daily backup)

```bash
# /etc/cron.daily/school-lms-backup
#!/bin/bash
BACKUP_DIR=/opt/school-lms/backups
mkdir -p $BACKUP_DIR
docker exec school-lms-postgres-1 pg_dump -U lms school_lms | gzip > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Critical Data

| What | How | Frequency |
|---|---|---|
| PostgreSQL | `pg_dump` via cron | Daily |
| Supabase | Supabase automated backup | Daily (Pro) |
| .env files | Store in GitHub Secrets + password manager | On change |
| Uploaded files | Cloudinary replicates across regions | Built-in |

---

## Rollback Procedure

### Option 1: Re-run Previous Workflow (Recommended)

1. Go to GitHub → Actions → Deploy workflow
2. Find the last known-good run
3. Click **Re-run all jobs**

### Option 2: Manual Rollback

```bash
ssh user@vps
cd /opt/school-lms

# List available images
docker images ghcr.io/your-org/school-lms/backend

# Tag the known-good version
docker tag ghcr.io/your-org/school-lms/backend:sha-<GOOD> ghcr.io/your-org/school-lms/backend:latest

# Update docker-compose to use the good SHA
sed -i 's/sha-BAD/sha-GOOD/' docker-compose.yml

# Restart
docker compose up -d

# Verify
curl -f http://localhost:4000/health
```

### Option 3: Revert Git + Force Deploy

```bash
git revert HEAD --no-edit
git push origin main
# CI/CD runs deploy with reverted code
```

---

## Monitoring (Quick Setup)

```bash
# Check container status
docker ps
docker compose -f /opt/school-lms/docker-compose.yml ps

# View logs
docker compose -f /opt/school-lms/docker-compose.yml logs --tail=100 -f

# Resource usage
docker stats

# Backend health
curl -f http://localhost:4000/health
curl -f http://localhost:4000/health/deep
```

---

## Updating

- **Backend changes**: push to `main`, CI/CD rebuilds + redeploys
- **Frontend changes**: same — VITE_ vars baked into image at build time
- **DB migrations**: run via Supabase Dashboard or `npm run db:push`
- **Env changes**: update GitHub Secret → deploy creates new image with new vars

---

## Troubleshooting

| Problem | Check |
|---|---|
| Container won't start | `docker compose logs backend` |
| Database connection error | Verify `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in backend.env |
| Health check fails | `docker compose ps` — is backend running? Port conflict? |
| Frontend blank page | Browser console errors? Wrong VITE_SUPABASE_URL? |
| SSL cert expired | `sudo certbot renew` or check Caddy logs |
| No disk space | `docker system prune -af` (removes unused images, containers, volumes) |
