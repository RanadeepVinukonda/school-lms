# Genesis School LMS — Physical Server Deployment Guide

For running the LMS on **your own physical server** — either a dedicated box at the school (LAN) or a physical server in a colocation/office rack with internet.

## 1. Reality check: this app needs internet

Your stack uses cloud services that a fully offline server cannot replace:

| Service | Used for | Offline fallback |
|---------|----------|------------------|
| Supabase | Auth + JWT + storage | Would need to self-host Auth + a full Postgres auth rework |
| Cloudinary | File/image uploads | Would need local storage backend rework |
| Gemini AI | AI features | Won't work offline |

**Conclusion:** a physical server works great as the host, but keep it **connected to the internet** (school broadband). The heavy compute (AI, file storage) stays in the cloud — your physical box runs the API + Postgres + static files, exactly like a cloud VM, just on your own hardware.

If the school LAN is air-gapped (no internet), this app needs code changes first — say so and we plan those separately.

## 2. Hardware you need

For 1,000–3,000 students, a modest box is enough (the DB is small — a school's data fits in a few GB):

| Component | Minimum | Comfortable |
|-----------|---------|-------------|
| CPU | 4 cores (any modern Xeon/Ryzen/i5) | 8 cores |
| RAM | 8 GB | 16 GB |
| Storage | 120 GB SSD | 2x SSD in RAID-1, or SSD + 2 TB HDD for backups |
| NIC | 1x GbE | 2x GbE (or 1+ management port) |
| Power | — | UPS (schools have power cuts — this is mandatory in practice) |

Buy once: **UPS first**. A school with no UPS will corrupt Postgres in the first power cut.

## 3. OS + base setup

Ubuntu Server 24.04 LTS (10-year support, boring and reliable).

```bash
# after install + login:
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx ufw
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # re-login after this

# static IP — set in netplan (Ubuntu) to a reserved LAN address, e.g. 192.168.1.50
# or set a DHCP reservation in the school router.

# firewall — allow SSH, web; block everything else (incl. 4000/5432/6432)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 4. Getting the code on the server

```bash
sudo mkdir -p /opt/school-lms && sudo chown "$USER" /opt/school-lms
git clone https://github.com/RanadeepVinukonda/school-lms.git /opt/school-lms
cd /opt/school-lms/lms
cp backend/.env.production.template backend/.env
nano backend/.env   # fill DB_PASSWORD, SUPABASE_*, CLOUDINARY_*, GEMINI_API_KEY, FRONTEND_URL, COOKIE_SECURE=true
```

## 5. Two ways to reach it — pick based on school

### Option A: LAN only (default for school labs/classrooms)

Students on the school wifi/LAN reach it at `http://192.168.1.50` (the server's LAN IP). No domain, no TLS needed internally — but see §7 for self-signed TLS so phones/APK accept it.

Set in `backend/.env`: `FRONTEND_URL=http://192.168.1.50`

Build & start:
```bash
cd /opt/school-lms/lms
export DB_PASSWORD=YourStrongDBPassword
docker compose -f docker-compose.prod.yml up -d --build
```

### Option B: Internet access (homework from home, mobile app outside school)

1. **Domain name** — buy one (e.g. `lms.schoolname.edu`) or free dynamic DNS (DuckDNS/No-IP) because school IPs are usually dynamic.
2. **Port-forward** on the school router: WAN `80/443` → `192.168.1.50:80/443`.
3. Follow the nginx + certbot steps in §6 — Let's Encrypt needs the domain to resolve to your public IP first.

## 6. Host nginx reverse proxy + TLS (required for internet, optional for LAN)

Same config as the cloud guide — this is the edge that fronts the Docker stack:

```nginx
# /etc/nginx/sites-available/school-lms
upstream backend_api {
    server 127.0.0.1:4000;
    keepalive 32;
}

server {
    listen 80;
    server_name lms.schoolname.edu;   # or the LAN IP for option A
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lms.schoolname.edu;

    ssl_certificate     /etc/letsencrypt/live/lms.schoolname.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lms.schoolname.edu/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 50m;

    location /api/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_next_upstream error timeout http_502 http_503;
    }

    location / {
        proxy_pass http://127.0.0.1:80;
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

**Internet option:** `sudo certbot --nginx -d lms.schoolname.edu` then `sudo systemctl enable --now certbot.timer`.

**LAN-only option (self-signed TLS):**
```bash
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/ssl/private/lms.key -out /etc/ssl/certs/lms.crt \
  -subj "/CN=192.168.1.50"
```
Put those paths in the 443 block. Students will see a cert warning once; the APK needs `COOKIE_SECURE=true` and the app loads over `https://192.168.1.50`. If you skip TLS entirely on LAN, set `COOKIE_SECURE=false` (cookie won't persist over plain http).

## 7. Mobile APK for the school

Build per `BUILD_APK.md`, with `.env`:
```
EXPO_PUBLIC_API_URL=https://192.168.1.50/api        # LAN option
# or https://lms.schoolname.edu/api                  # internet option
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
Side-load the APK onto school tablets. **On Android, a self-signed cert needs to be trusted or the app must use the internet domain option.**

## 8. Backups (on a physical server this is critical)

Two disks / an external drive. Cron:

```bash
sudo crontab -e
```
```cron
# 03:00 nightly: dump Postgres to a second disk, keep 14 days
0 3 * * * docker exec $(docker ps -qf name=postgres) pg_dump -U lms -d school_lms -Fc -f /tmp/lms.dump && docker cp $(docker ps -qf name=postgres):/tmp/lms.dump /mnt/backup-disk/lms-$(date +\%F).dump && find /mnt/backup-disk -name 'lms-*.dump' -mtime +14 -delete
```

And copy `/mnt/backup-disk` to a USB/external disk once a week, kept off-site. A school's Postgres data is small — the whole DB is a few hundred MB.

## 9. Scaling the physical server (as enrollment grows)

### Same box (to ~10k students)
Backend is stateless → run more replicas, add ports to nginx `upstream`:

```bash
cd /opt/school-lms/lms
# edit docker-compose.prod.yml backend ports: 4000, 4001, 4002
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```
Add `server 127.0.0.1:4001;` and `4002` to `upstream backend_api`, then `sudo nginx -s reload`. Add RAM/CPU as needed — it's a physical box, so it's cheap to upgrade.

### Second physical server (very large school)
- Move Postgres to one server dedicated to the DB (with PgBouncer), app+nginx on the other(s).
- Both on the school LAN, DB on a private subnet (`192.168.1.50` DB, `192.168.1.51`+ app).
- Point all app servers' `DATABASE_URL` at the DB server; each keeps nginx + backend replicas.
- LAN latency is ~0.5 ms — this works beautifully.

## 10. Physical-server specific ops

| Concern | Practice |
|---------|----------|
| Power cuts | UPS + `postgres` container `restart: unless-stopped` (already set); box auto-starts on power-on |
| Reboot | `docker compose ... up -d` again after boot — or add a cron `@reboot` line |
| Overheating | Monitor `sensors`; keep the rack ventilated; check monthly |
| Disk filling | `df -h` weekly (cron → email); prune Docker images monthly |
| Logs | Rotate: `docker compose` json-file `max-size: 10m` already set |
| Unattended kernel updates | `sudo apt install unattended-upgrades` (security patches) |
| Staff handover | Leave a README on the server: IP, DB password location, how to restart the stack |

Weekly health cron (emails you):
```bash
sudo crontab -e
```
```cron
0 6 * * 1 ( docker compose -f /opt/school-lms/lms/docker-compose.prod.yml ps; df -h; free -h ) | mail -s "LMS weekly check" admin@school.edu
```

## 11. Security checklist (physical box)

- UFW: only 22/80/443. Backend (4000), Postgres (5432/6432) must NOT be exposed to the internet.
- If students use the same wifi as the server, keep the DB on a firewall-separated subnet or use a server NIC + switch segment.
- Physical lock on the server room. Anyone with hands on the box owns it.
- `DB_PASSWORD` only in `backend/.env`, chmod 600, never in the repo.
- `COOKIE_SECURE=true` if HTTPS; verify cookies actually persist after login.
- Test one restore from backup before school starts.
