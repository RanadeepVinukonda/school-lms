# Genesis LMS — Server Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USERS (Browser)                   │
└──────────┬──────────────────────────────┬───────────┘
           │ HTTPS                        │ HTTPS
           ▼                              ▼
┌──────────────────┐          ┌──────────────────────┐
│     Vercel CDN   │          │   Cloud Server       │
│   (Frontend)     │          │   Nginx + Docker     │
│  genesis-frontend│   /api   │                      │
│  -teal.vercel.app│ ───────► │  Backend (:4000)     │
└──────────────────┘          └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │   Supabase (Managed)  │
                              │   PostgreSQL + Auth   │
                              │   File Storage        │
                              └──────────────────────┘
```

## What You Need From Ranadeep

1. **Docker image name** — e.g. `ranadeepvinukonda/genesis-backend:latest`
2. **docker-compose.cloud.yml** — already in `deploy/`
3. **nginx-backend.conf** — already in `deploy/`
4. **.env file** — fill in the values (see template below)
5. **Domain DNS** — point `api.yourdomain.com` to your server IP

## Quick Start (5 minutes)

### 1. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then:
docker --version
```

### 2. Create project directory
```bash
mkdir -p /opt/genesis-lms
cd /opt/genesis-lms
```

### 3. Create the .env file
```bash
nano .env
```
Paste and fill in values from the template below.

### 4. Download compose file
```bash
# Option A: If Ranadeep gave you the files directly
# Place docker-compose.cloud.yml in /opt/genesis-lms/

# Option B: Pull the Docker image directly
docker pull ranadeepvinukonda/genesis-backend:latest
```

### 5. Start the backend
```bash
# If using docker-compose.cloud.yml:
docker compose -f docker-compose.cloud.yml up -d

# Or run directly:
docker run -d \
  --name genesis-backend \
  --env-file .env \
  --restart unless-stopped \
  -p 127.0.0.1:4000:4000 \
  ranadeepvinukonda/genesis-backend:latest
```

### 6. Install Nginx
```bash
sudo apt update && sudo apt install -y nginx
sudo cp nginx-backend.conf /etc/nginx/sites-available/genesis-backend
sudo ln -sf /etc/nginx/sites-available/genesis-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Get SSL certificate
```bash
sudo apt install -y certbot python3-certbot-nginx
# Point DNS first: api.yourdomain.com → YOUR_SERVER_IP
sudo certbot --nginx -d api.yourdomain.com
```

### 8. Verify
```bash
# Check backend is running:
curl http://localhost:4000/health

# Check through Nginx:
curl https://api.yourdomain.com/health
```

## .env Template

Copy this to `/opt/genesis-lms/.env` on the server:

Ask Ranadeep for the `.env` file — it contains all production secrets. **Never commit this file to Git.**

The file must contain these keys (ask Ranadeep for the actual values):
```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://genesis-frontend-teal.vercel.app
COOKIE_SECURE=true
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=textbooks
DATABASE_URL=...
GEMINI_API_KEY=...
AI_BASE_URL=https://openrouter.ai/api/v1/chat/completions
AI_MODEL=gemini-3.1-flash-lite
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
YOUTUBE_API_KEY=...
FIREBASE_SERVICE_ACCOUNT_KEY=...
CRON_SECRET=...
LOG_LEVEL=info
```

## Updating the Backend

When Ranadeep pushes a new version:

```bash
# Pull the new image:
docker pull ranadeepvinukonda/genesis-backend:latest

# Restart:
docker compose -f docker-compose.cloud.yml up -d --force-recreate

# Or if running directly:
docker stop genesis-backend && docker rm genesis-backend
docker run -d \
  --name genesis-backend \
  --env-file .env \
  --restart unless-stopped \
  -p 127.0.0.1:4000:4000 \
  ranadeepvinukonda/genesis-backend:latest
```

## Troubleshooting

```bash
# Check backend logs:
docker logs genesis-backend --tail 50

# Check if backend is healthy:
curl http://localhost:4000/health

# Check Nginx:
sudo nginx -t
sudo systemctl status nginx

# Restart everything:
docker compose -f docker-compose.cloud.yml restart
sudo systemctl restart nginx
```
