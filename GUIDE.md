# Genesis School LMS — Server Handoff & Google Play Release Guide

One document for the two handoffs you'll do as the app owner:

1. **Cloud server connection** — what to ask the server person, what to give them, and what to keep for yourself.
2. **Google Play (AAB) updates** — how to build, sign, and release new app versions to the Play Store.

---

## 1. What runs where

| Piece | Runs on | Who manages it |
|---|---|---|
| Web frontend (React SPA) | **Vercel** (static CDN) | You |
| Backend API (Express/Node) | **Cloud server** (Docker container, port 4000) | Server person |
| Database (PostgreSQL) | **Supabase** (managed, cloud) | Supabase |
| Auth (JWT) | **Supabase Auth** (cloud) | Supabase |
| File uploads | **Cloudinary** (cloud) | Cloudinary |
| AI / OCR | **Gemini API** + server-side OCR | You |
| Android app | **Capacitor shell** wrapping the web frontend | You |

The server only runs the API. Everything heavy (auth, database, files, AI) is already off-box — that is why a small VPS is enough.

### How the pieces connect

```
Phone / Browser
      │  https://genesis-frontend-....vercel.app
      ▼
Vercel (static frontend)
      │  vercel.json rewrite:  /api/(.*)  →  https://api.YOURDOMAIN.com/api/$1
      ▼
Cloud server  (Nginx :443, TLS via certbot)
      └─ 127.0.0.1:4000  →  backend Docker container
             ├─ Supabase (DB + auth)      — managed, off-box
             ├─ Cloudinary (media)        — managed, off-box
             └─ Redis :6379 (optional)    — only when you scale to 2+ replicas
```

The frontend calls a **relative `/api`** path, so the browser and cookies stay
same-origin — CSRF + session cookies work exactly as they do in development.

---

## 2. Cloud server — the handoff with the server person

> Rule of thumb: **they own the server plumbing, you keep the code and the secrets.**

### 2.1 What to ASK the server person (send this checklist)

**Hardware / OS**
- [ ] How many **vCPU / GB RAM / GB SSD**? Want ≥ 4 vCPU / 8 GB / 80 GB (minimum 2 vCPU / 4 GB for ~1,000 students).
- [ ] **Ubuntu 22.04 or 24.04**? Docker + Docker Compose v2 installed or installable?
- [ ] **Public static IP** + **root SSH access** (root or sudo)?

**Network**
- [ ] Can I open only **22 (SSH), 80 (HTTP), 443 (HTTPS)**? Is the firewall (UFW) on?
- [ ] Ports **4000 (backend), 5432 (DB), 6432 (pgbouncer)** stay **closed** to the internet?
- [ ] Is there a domain available? (`api.yourdomain.com`) — needed for HTTPS via certbot.

**Reliability**
- [ ] Backup policy — does the provider snapshot? What does it cost?
- [ ] Uptime SLA? Support hours? Real company or one person?

**Credentials you need from them**
- [ ] **SSH access** (IP, user, port) so you can verify work.
- [ ] If they set up the DB on the box: the **app database credentials** (non-admin user).
- [ ] SMTP credentials **if** the school wants email — otherwise use Resend/Brevo free tier.

### 2.2 What to GIVE the server person

- **The GitHub repo as read-only** (`Settings → Collaborators → Read`) or a deploy webhook. They pull — they never push.
- **A template `.env` with placeholders** (use `lms/backend/.env.production.template`). You paste the real secrets yourself, or share real values only through a **password-manager share** (Bitwarden/1Password shared folder) — never in chat or email.
- **The SSH/Docker access on their own server** — that's their territory anyway.
- **DB credentials for the app database** — create a separate non-admin user if they need DB access.
- **Vercel collaborator invite** (Contributor role) so they can deploy/wire — **you stay Owner**.

### 2.3 What to NEVER give anyone

- ❌ GitHub **admin/write** on the repo
- ❌ Your GitHub login or any personal token
- ❌ `SUPABASE_SERVICE_ROLE_KEY` (full admin key) — if they truly need DB access, give them a **scoped key from the Supabase dashboard**, or paste it in yourself after they finish
- ❌ **Play Console account** or the **service-account JSON**
- ❌ The **Android keystore** file and its passwords (losing these = you can never update the app)
- ❌ `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`

### 2.4 Verify after they're done

- [ ] You have your own **root SSH key**; the server person uses a **non-root user**.
- [ ] Vercel: you are **Owner**, they are **Contributor** (removable anytime).
- [ ] Rotate any key you don't fully trust. Audit "last accessed" in GitHub/Vercel dashboards.
- [ ] `curl https://api.YOURDOMAIN.com/api/health` returns `{"ok":true,...}` from your machine.

---

## 3. Server setup — quick reference (for the server person)

The repo ships ready-to-fill templates in `deploy/`:

| File | Purpose |
|---|---|
| `deploy/backend.env.template` | Copy to `lms/backend/.env`, fill every `<< ... >>` |
| `deploy/docker-compose.cloud.yml` | Runs the backend container (port 4000, loopback only) |
| `deploy/nginx-backend.conf` | Host Nginx → reverse-proxies `/api` to the backend |

```bash
# Ubuntu: install Docker + nginx + certbot
sudo apt update && sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker

# Get code + secrets
sudo mkdir -p /opt/genesis && sudo chown "$USER" /opt/genesis
git clone https://github.com/RanadeepVinukonda/school-lms.git /opt/genesis
cd /opt/genesis
cp deploy/backend.env.template lms/backend/.env
nano lms/backend/.env          # fill real values (see §4)

# Build + start backend
docker compose -f deploy/docker-compose.cloud.yml up -d --build
docker compose -f deploy/docker-compose.cloud.yml ps   # healthy

# Touch test from the server
curl http://127.0.0.1:4000/health

# Nginx + TLS
sudo cp deploy/nginx-backend.conf /etc/nginx/sites-available/genesis-backend
sudo sed -i 's/api.YOURDOMAIN.com/api.yourdomain.com/g' /etc/nginx/sites-available/genesis-backend
sudo ln -s /etc/nginx/sites-available/genesis-backend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com        # HTTPS + auto-renew

# Firewall: only 22, 80, 443
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

### Wire the frontend (one line in Vercel)

`vercel.json` currently rewrites `/api/*` to Render. Change the destination to your server:

```json
{ "source": "/api/(.*)", "destination": "https://api.yourdomain.com/api/$1" }
```

Commit + push → Vercel auto-deploys. No frontend rebuild or env change needed (the app uses the relative `/api` base).

---

## 4. Environment variables that matter

**Backend** (`lms/backend/.env`, REQUIRED or the app won't boot):

| Var | Value / why |
|---|---|
| `NODE_ENV=production` | security headers, JSON logs, strict SameSite cookie |
| `PORT=4000` | matches the Docker HEALTHCHECK — **do not change** |
| `FRONTEND_URL` | your exact Vercel URL (CORS allow-list) |
| `COOKIE_SECURE=true` | httpOnly cookies only over HTTPS |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | auth + DB (service role stays server-side) |
| `DATABASE_URL` | required for `/health` and raw-SQL transactions. Use the Supabase **transaction/session pooler** URI (`…pooler.supabase.com:6543/…`) |
| `DATABASE_POOL_MAX=20` | keep ≤ 20 per instance (Supabase pooler cap) |
| `GEMINI_API_KEY` | AI features |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | file uploads |
| `CRON_SECRET` | `openssl rand -hex 32` — guards `/jobs/cron/*` |
| `YOUTUBE_API_KEY` | keeps Khan Academy video search working |

**Frontend** (baked in at build time — rebuild + redeploy Vercel after changing):

| Var | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://api.yourdomain.com/api` (or relative `/api` via Vercel rewrite) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | same as web |
| `VITE_BASE_URL` | your Vercel URL |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | uploads |

---

## 5. Google Play (AAB) update workflow

The Android app is the web frontend wrapped in a **Capacitor** shell
(`lms/frontend/android`, app id `com.school.lms`, name **Genesis**).

### 5.1 One-time prerequisites

- [ ] **Play Console account** complete (payment, app created, Data Safety + content declarations done).
- [ ] App **fully set up** in Play Console — the API rejects uploads until declarations are finished.
- [ ] **Signing key decided** (below).
- [ ] (CI path only) **Play service account** created — see §5.4.

### 5.2 Signing key (create once, keep forever)

Play requires a signed AAB. Two options:

- **Play App Signing (recommended)** — sign with a throwaway *upload key*; Play re-signs with its own key. Losing the upload key is not fatal.
- **Self-managed** — you own the keystore; if you lose it, **you can never update the app** (Google won't reissue).

Create the upload key:

```bash
keytool -genkey -v -keystore upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
# remember the keystore + key passwords. Store them with the file, offline.
```

Back up `upload.keystore` + both passwords somewhere safe (password manager + offline copy). This file is irreplaceable.

### 5.3 Manual release (no CI — do this every version)

```bash
cd lms/frontend

# 1. Point the app at the right backend (only if the URL changed)
#    edit capacitor.config.ts server.url / allowNavigation, then:
#    edit lms/frontend/android/app/build.gradle → bump versionCode (+1, never reuse)

# 2. Build the web app + sync Capacitor + build the release AAB
npm run build
npx cap sync android
#    Windows:  npm run apk:release            → builds APK
#              cd android && gradlew.bat bundleRelease   → builds AAB (Play Store)
#    macOS/Linux: npm run apk:release:posix   → APK
#              cd android && ./gradlew bundleRelease     → AAB
```

Outputs:

| Artifact | Path | Used for |
|---|---|---|
| `app-release.aab` | `lms/frontend/android/app/build/outputs/bundle/release/` | **Play Store upload** |
| `app-release.apk` | `lms/frontend/android/app/build/outputs/apk/release/` | Direct install / testing |

Upload + promote:

```
Play Console → your app → Release → Internal testing → Create release
   → upload app-release.aab  →  save → review (add release notes)
   → rollout to testers → install on a phone from the internal link → smoke test
   → promote release → Production → staged rollout (10% → 50% → 100%)
   → Play serves the update; users auto-update
```

**Why Internal first:** Play review is fast for a known app, and you never ship a
broken build to everyone. Promote to Production manually — one click.

**Never reuse a `versionCode`.** Play rejects duplicate codes. Bump it in
`lms/frontend/android/app/build.gradle` (`versionCode`) before each release and
also bump `versionName` (e.g. `1.0.1`).

### 5.4 Optional: automated AAB → Play (GitHub Actions)

Automate the §5.3 loop by tagging a version. One-time setup:

1. **Google Cloud** → create project → IAM & Admin → Service Accounts → create `play-deploy` with role *Service Account User*.
2. **Play Console → Settings → API access → Grant access** → give the account *Release to production / Manage testing tracks*.
3. **Google Cloud → service account → Keys → Add key → JSON** → download.
4. **GitHub → repo → Settings → Secrets → Actions**:
   - `PLAY_SERVICE_ACCOUNT_JSON` — the entire JSON contents
   - `ANDROID_KEYSTORE_BASE64` — `base64` of `upload.keystore`
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
5. Add the workflow `.github/workflows/playstore.yml` (build → `cap sync android` → `gradlew bundleRelease` → `r0adkll/upload-google-play` to the **internal** track).

Then the loop is:

```
git tag v1.2.3 && git push --tags
   ▼
GitHub Actions: build web → cap sync → bundleRelease → upload to INTERNAL
   ▼
Install from Internal link on a phone → smoke test
   ▼
Play Console → promote to Production (staged rollout)
```

---

## 6. Go-live checklist

**Server**
- [ ] DNS `api.<domain>` → server IP, propagation confirmed
- [ ] Backend `.env` filled (REQUIRED keys present, `DATABASE_URL` set, `CRON_SECRET` set)
- [ ] `docker compose -f deploy/docker-compose.cloud.yml up -d` healthy
- [ ] `curl https://api.<domain>/api/health` returns ok from outside
- [ ] `vercel.json` rewrite → `https://api.<domain>/api/$1`; login works through the app
- [ ] UFW allows only 22, 80, 443
- [ ] Backup confirmed (Supabase auto-backup or a `pg_dump` cron); one restore tested

**Play Store**
- [ ] Play Console app fully set up (declarations done)
- [ ] Upload keystore created + backed up (never lost, never shared)
- [ ] `versionCode` bumped; AAB built from current `main`
- [ ] Internal testing → device smoke test → promote to Production

**After go-live (recurring)**
- New web features: commit → push → Vercel deploys (no app update needed while the app uses hosted `server.url`).
- New app version: bump `versionCode` → build AAB → internal → promote (or tag `v…` if CI is set up).
