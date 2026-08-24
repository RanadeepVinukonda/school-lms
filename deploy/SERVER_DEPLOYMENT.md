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
│   (Frontend)     │          │   Nginx (LB)         │
│  genesis-frontend│   /api   │    ↓↓↓               │
│  -teal.vercel.app│ ───────► │  Backend x2 replicas │
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

1. **3 files** from `deploy/` folder in the repo
2. **`.env` file** with all production secrets (sent securely)
3. **Domain DNS** — point `api.yourdomain.com` to your server IP

## Quick Start

### 1. Install Docker + Docker Compose
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then:
docker --version
docker compose version
```

### 2. Create project directory
```bash
mkdir -p /opt/genesis-lms
cd /opt/genesis-lms
```

### 3. Place files
Put these in `/opt/genesis-lms/`:
- `docker-compose.cloud.yml`
- `nginx-backend.conf`
- `.env` (from Ranadeep, securely)

### 4. Set the version
```bash
# Add to .env:
IMAGE_VERSION=v1.0.0
BACKEND_REPLICAS=2
```

### 5. Start
```bash
docker compose -f docker-compose.cloud.yml up -d
```

### 6. Install Nginx
```bash
sudo apt update && sudo apt install -y nginx
sudo cp nginx-backend.conf /etc/nginx/sites-available/genesis-backend
sudo ln -sf /etc/nginx/sites-available/genesis-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Get SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
# Point DNS first: api.yourdomain.com → YOUR_SERVER_IP
sudo certbot --nginx -d api.yourdomain.com
```

### 8. Verify
```bash
curl http://localhost:4000/health
curl https://api.yourdomain.com/health
```

## .env File

Ask Ranadeep for the `.env` file. It contains production secrets. **Never commit this file to Git.**

Required keys:
```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://genesis-frontend-teal.vercel.app
COOKIE_SECURE=true
IMAGE_VERSION=v1.0.0
BACKEND_REPLICAS=2
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

## Scaling

### Change number of replicas
```bash
# Run 3 backend instances:
BACKEND_REPLICAS=3 docker compose -f docker-compose.cloud.yml up -d

# Or edit .env and restart:
# Set BACKEND_REPLICAS=3 in .env
docker compose -f docker-compose.cloud.yml up -d
```

### What each replica gets
- 1 GB RAM, 1 CPU core (configurable in docker-compose.cloud.yml)
- Nginx automatically load-balances across all replicas
- Each replica is independent — if one crashes, others keep serving

### Recommended replicas by school size
| Users | Replicas | RAM each | Total RAM |
|-------|----------|----------|-----------|
| < 200 | 1 | 1 GB | 1 GB |
| 200-500 | 2 | 1 GB | 2 GB |
| 500-1000 | 3 | 1 GB | 3 GB |
| 1000+ | 4-5 | 1 GB | 4-5 GB |

## Versioning

### When Ranadeep pushes a new version

**Step 1:** Ranadeep builds and pushes a new image tag:
```bash
docker build -t ranadeep8919/genesis-backend:v1.1.0 ...
docker push ranadeep8919/genesis-backend:v1.1.0
```

**Step 2:** You update the version and restart:
```bash
# Edit .env:
IMAGE_VERSION=v1.1.0

# Pull and restart:
docker compose -f docker-compose.cloud.yml pull
docker compose -f docker-compose.cloud.yml up -d
```

### Rollback if something breaks
```bash
# Edit .env:
IMAGE_VERSION=v1.0.0

# Restart:
docker compose -f docker-compose.cloud.yml up -d
```

## Updating the Backend

```bash
# Pull new image:
docker compose -f docker-compose.cloud.yml pull

# Restart with zero downtime (rolling update):
docker compose -f docker-compose.cloud.yml up -d
```

## Troubleshooting

```bash
# Check backend logs:
docker compose -f docker-compose.cloud.yml logs backend --tail 50

# Check all running replicas:
docker compose -f docker-compose.cloud.yml ps

# Check which replica is handling requests:
docker compose -f docker-compose.cloud.yml top

# Restart everything:
docker compose -f docker-compose.cloud.yml restart
sudo systemctl restart nginx
```
