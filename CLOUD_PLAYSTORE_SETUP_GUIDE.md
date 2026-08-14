# School LMS — Cloud + Play Store Professional Release Guide

One doc: put backend on cloud, wire frontend to it, buy the right server, and automate AAB uploads to Google Play.

Stack today: **Vite+React frontend (Vercel) → Express backend (Render) → PostgreSQL + Supabase auth + Cloudinary files**. Mobile app is **Capacitor** (web app wrapped in Android shell).

> **No domain? No problem.** This guide is written for the no-domain case. Everything runs on PaaS free subdomains (`*.vercel.app`, `*.onrender.com`, `*.supabase.co`) which come with HTTPS built in. HTTPS is **mandatory** — Android blocks plain-HTTP (`cleartext`) in the app. You skip the VPS, nginx, and certbot sections entirely. Options marked **[VPS/domain]** are for later if you buy one.

---

## 1. What runs where (target architecture)

| Piece | Runs on | Notes |
|-------|---------|-------|
| Frontend web | Vercel (free tier fine) | Vite build, static |
| Backend API | Your server: VPS (Hetzner/DO/Vultr) or Render | Node/Express |
| Database | Managed Postgres (Supabase/RDS) OR Postgres on the VPS | Postgres is the hard part — managed is easier |
| Auth | Supabase (already cloud) | no server work |
| File uploads | Cloudinary (already cloud) | no server work |
| Android app | Capacitor shell → loads frontend | same API + Supabase |

Heavy work is already offloaded (Supabase, Cloudinary, Gemini). Your server just runs the API + Postgres. That's what makes this cheap to host.

---

## 2. What to ask the cloud/server person (send them this)

Before you pay anyone, get these answers:

**Server / VPS** — skip these unless you later buy a domain and move off PaaS:
1. How many vCPU + GB RAM + GB SSD? (want ≥ 4 vCPU / 8 GB / 80 GB; 2 vCPU/4GB minimum)
2. Ubuntu 22.04/24.04? Docker + Docker Compose v2 available/installable?
3. Public static IP + root SSH access? (you need root or sudo)
4. Can I open ports 22 (SSH), 80, 443 only? Firewall/UFW enabled?
5. Is there a second private IP for DB if I split servers later?
6. Backup policy — does provider snapshot? Cost?
7. Uptime SLA? Support hours? Is it a real company or one person?

**No-domain setup** — what you actually need to confirm:
8. Render app URL: `https://<your-api>.onrender.com` (auto HTTPS, no cost)
9. Vercel app URL: `https://<your-project>.vercel.app` (auto HTTPS, no cost)
10. Supabase project URL: `https://<ref>.supabase.co` (already have it)
11. **Email / SMTP (optional):** ask provider for SMTP credentials (host, port, user, pass) or use a free tier (Resend, Brevo).

**What they must give you in writing:**
- Render/Vercel project URLs (the free subdomains)
- Supabase URL + keys
- SMTP creds if using email

> Rule: anyone who asks for your Supabase/Cloudinary/Play Store keys to "manage" them — say no. Only the server person needs is SSH + DB password for their box. Keep `SUPABASE_SERVICE_ROLE_KEY` and Play Store keys with you.

## 2b. What to give the cloud person (and what to NEVER give)

They only need enough to deploy + configure. Split access: they own the server plumbing, you keep the code and secrets.

**Give them (deploy-scoped):**
- **Render/Vercel collaborator invite** (Settings → Team → Members → "contributor" role), NOT your GitHub repo ownership
- **The GitHub repo as read-only** (`Settings → Collaborators → Read`) OR a deploy webhook — they pull, never push
- **A template `.env` with dummy/placeholder values** so they wire the plumbing. **You paste the real secrets yourself**, or give real values only via a secure channel (password manager share, not WhatsApp/email)
- **SSH/docker access on their own server** — that's their territory anyway
- **DB credentials for the app database** (you can create a separate DB user, not the admin)

**Never give them:**
- GitHub **admin/write** on the repo (read is enough for deploy)
- Your GitHub account login or token
- `SUPABASE_SERVICE_ROLE_KEY` full admin (if they truly need it, give the **limited** service role key scoped to the DB from Supabase dashboard, or fill it in yourself after they finish)
- Play Console account or service account JSON
- Android keystore + passwords
- Cloudinary API secret, Gemini API key

**How to hand over secrets safely:** put all real values in a shared password-manager vault (Bitwarden/1Password free shared folder). They open the vault on their machine, fill `.env`, you can revoke access later. Never paste keys in chat/email.

**Check after they're done (revocable control):**
- Create your own SSH key, keep root; they get a non-root user
- Render/Vercel: keep yourself as **Owner**, they're Contributor — you can remove them anytime
- Secrets: rotate any key you don't trust. GitHub/Render dashboards show "last accessed" — audit periodically

---

## 3. Deploy backend to cloud

### Option A — PaaS (Render, simplest, no domain needed) ✅ default

1. Push repo to GitHub.
2. Render → New → Web Service → pick repo → `lms/backend`.
3. Build command: `npm ci && npm run build`. Start: `npm start`.
4. Add all env vars from `lms/backend/.env.production.template` in Render dashboard (Settings → Environment).
5. Add a Postgres → Render → New → PostgreSQL, or use Supabase DB.
6. Deploy. Render gives you `https://your-api.onrender.com` — HTTPS free, no domain needed.

### Option B — VPS with Docker [VPS/domain — only if you later buy a domain]

Your `docker-compose.yml` in `lms/` already runs postgres + backend + frontend. For a real server, follow `DEPLOY_GUIDE.md` §3 (install Docker + nginx + certbot, `cp .env.production.template .env`, fill values, `docker compose -f docker-compose.prod.yml up -d --build`).

**Minimal backend-only flow (if frontend stays on Vercel):**
```bash
# server
mkdir -p /opt/school-lms && cd /opt/school-lms
git clone <your-repo> .
cd lms
cp backend/.env.production.template backend/.env
nano backend/.env     # fill real values below
docker compose up -d --build backend postgres
```
Then put nginx (or Caddy — simpler) in front of port 4000 with a domain + certbot.

**Backend `.env` — the values that matter:**
```
PORT=4000
FRONTEND_URL=https://your-frontend.vercel.app     # CORS + cookies
DATABASE_URL=postgresql://lms:pass@localhost:5432/school_lms
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...    # NEVER expose to frontend
GEMINI_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
COOKIE_SECURE=true
COOKIE_DOMAIN=.your-domain.com   # only if backend shares domain with frontend
```

---

## 4. Configure frontend to talk to the backend

Frontend uses Vite env vars. Edit `lms/frontend/.env.production`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=https://your-api.onrender.com    # or https://api.your-domain.com
VITE_BASE_URL=https://your-frontend.vercel.app
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

**Critical config match-up (the #1 "it works locally, breaks in prod" bug):**
- Backend `FRONTEND_URL` MUST equal frontend's real origin (`https://<project>.vercel.app`). CORS denies everything else.
- Frontend `VITE_API_BASE_URL` MUST equal the backend's public URL (`https://<api>.onrender.com`).
- **No domain means frontend and backend are on different origins** (`*.vercel.app` vs `*.onrender.com`) → the auth cookie must be sent cross-site. Make sure the backend sets `SameSite=None; Secure` on the cookie, and `COOKIE_SECURE=true`. If auth cookies still won't persist, switch to a Bearer-token header mode in the API client (store JWT in localStorage). Same-domain nginx proxy trick (`VITE_API_BASE_URL=/api`) only works once you have a domain — see [VPS/domain].
- `COOKIE_SECURE=true` — always in production.

Rebuild + redeploy frontend after env changes (Vite bakes env vars at build time).

### Capacitor app points at the same thing

`lms/frontend/capacitor.config.ts` — two ways:
1. **Hosted webview (current):** `server.url` = your live frontend URL. App always shows latest site, no app update needed for web changes. But it's basically a browser bookmark — Play reviewers may reject if it doesn't feel like an app.
2. **Bundled (better for Play Store):** remove `server.url`, keep `webDir: 'dist'`, app ships with the built site inside. Update needed for each change. Feels native, passes review.

`allowNavigation` must include: your backend domain, `*.supabase.co`, Cloudinary. Add your API domain or mobile login/API calls silently fail.

---

## 5. nginx, Redis, scaling

Full detail already in `DEPLOY_GUIDE.md` §3–§5. **Skip all of this without a domain — PaaS handles TLS, reverse proxying, and load for you.**

- **nginx** = edge reverse proxy: TLS termination (certbot), gzip, static caching, and `/api/` → backend upstream with `proxy_next_upstream` failover. [VPS/domain]
- **Redis** = shared rate-limit store + future sessions. Needed once you run >1 backend replica (each replica's in-memory limiter counts separately). Add to compose: [VPS/domain]
  ```yaml
  redis:
    image: redis:7-alpine
    restart: unless-stopped
  ```
- **Scale ladder:**
  1. No domain → scale by upgrading Render plan (replicas/instances), that's it. Vercel/Render/Supabase handle their own scaling.
  2. One box, more backend replicas: `docker compose up -d --scale backend=3`, add ports to nginx `upstream` (≈10k students). [VPS/domain]
  3. Move Postgres to managed (Supabase/RDS) — hardest thing to shard, move first.
  4. Second app server pointing at same DB + Redis; nginx upstream lists both IPs. [VPS/domain]
  5. Cloudflare in front (CDN + DDoS + HTTP/3). [domain]
- **Backups:** managed Postgres (Supabase/Render) backs up automatically. For self-hosted: daily `pg_dump` cron (DEPLOY_GUIDE.md §4). Test a restore once.

---

## 6. Play Store + GitHub Actions (automated AAB pipeline)

### One-time setup (30 min)

1. **Play Console** → complete account (payments, app created, Data Safety + content declarations). Until the app is "fully set up" the API rejects uploads.
2. **Google Cloud** → create project → IAM & Admin → Service Accounts → create `play-deploy`, role `Service Account User`.
3. **Play Console → Settings → API access → Grant access** to that account → app permission: "Release to production / Manage testing tracks".
4. **Google Cloud → service account → Keys → Add key → JSON** → download.
5. **GitHub repo → Settings → Secrets and variables → Actions → New repository secret:**
   - `PLAY_SERVICE_ACCOUNT_JSON` = entire JSON file contents
   - `ANDROID_KEYSTORE_BASE64` = base64 of your `.keystore` signing file (below)
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

### Signing key (do this once, keep forever)

Play requires AABs to be signed. Two paths:
- **Play App Signing (recommended):** sign with a throwaway upload key, Play re-signs with its own key. Key loss not fatal.
- **Self-managed:** sign with your own keystore, never lose it (if lost, you can't update the app — Google won't give a new key).

Create upload key:
```bash
keytool -genkey -v -keystore school-lms.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
certutil -encode school-lms.keystore school-lms.keystore.base64   # then paste into ANDROID_KEYSTORE_BASE64
```

### The workflow

File: `.github/workflows/playstore.yml` (at repo root, alongside existing `ci.yml`):

```yaml
name: Android Release

on:
  push:
    tags:
      - "v*.*.*"          # git tag v1.2.3 triggers release

jobs:
  build-and-upload:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: lms/frontend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: lms/frontend/package-lock.json

      - name: Install + build web
        run: |
          npm ci
          npm run build

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - name: Decode signing key
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > android/app/upload.keystore

      - name: Build AAB
        working-directory: lms/frontend/android
        env:
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: ./gradlew bundleRelease

      - name: Upload to Play (Internal testing)
        uses: r0adkll/upload-google-play@v1
        with:
          service_account_json: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
          package_name: com.school.lms
          release_files: lms/frontend/android/app/build/outputs/bundle/release/app-release.aab
          track: internal
```

### Wire the keystore into gradle

`lms/frontend/android/app/build.gradle` — add signing config (values come from env in CI):
```gradle
android {
    signingConfigs {
        release {
            storeFile file("upload.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Version control (Play rejects reused version codes)

`android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 1   // +1 EVERY release, never reuse
        versionName "1.0.0"
    }
}
```
Bump `versionCode` by hand each release, or auto-bump in CI. Keep it boring: bump manually before tagging.

### The release loop (what "every app does")

```
git tag v1.2.3 && git push --tags
   │
   ▼
GitHub Actions: build → sync → gradlew bundleRelease → upload to INTERNAL track
   │
   ▼
You install on device via Internal testing link (or opt-in testers), smoke test
   │
   ▼
Play Console → Internal → Promote release → Production (staged rollout 10% → 50% → 100%)
   │
   ▼
Play serves the update to everyone. Users auto-update.
```

**Why Internal-first:** Play review is fast for the same app, and you never ship a broken build to everyone. Promote manually — one click in Play Console.

---

## 7. First-time checklist (run top to bottom)

- [ ] Render app up, `/health` returns 200 from outside (visit `https://<api>.onrender.com/health` in browser)
- [ ] Backend `.env` filled (FRONTEND_URL = your vercel.app URL)
- [ ] Frontend `.env.production` filled, `VITE_API_BASE_URL` = onrender URL, CORS matches, cookie SameSite=None
- [ ] HTTPS everywhere (free — vercel.app/onrender.com/supabase.co all have it)
- [ ] Login, one upload, one AI call — all work through the real URLs
- [ ] Postgres backup confirmed (managed auto-backup or cron)
- [ ] Play Console app fully set up (declarations done)
- [ ] Keystore created + secrets added to GitHub
- [ ] `playstore.yml` merged, `git tag v0.1.0` → build goes to Internal testing
- [ ] Device install from Internal link → smoke test → promote to Production
