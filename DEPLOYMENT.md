# Deployment Guide — Genesis LMS

**One-time setup. Covers Vercel, Render, env vars, and APK build.**

---

## What You Already Have

GitHub Secrets (already set):
- `RENDER_API_KEY`
- `RENDER_DEPLOY_HOOK`
- `RENDER_SERVICE_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Existing services:
- Backend on Render
- Frontend on Vercel
- Supabase project

---

## Part 1: Render (Backend) — Update Env Vars

### 1.1 Go to Render Dashboard

1. [render.com](https://render.com) → your API service
2. **Environment** tab

### 1.2 Add/Update These Env Vars

Copy-paste each line. Replace values in `<BRACKETS>` with yours:

```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=<YOUR_VERCEL_URL>
SUPABASE_URL=<YOUR_SUPABASE_URL>
SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
SUPABASE_STORAGE_BUCKET=textbooks
DATABASE_URL=<YOUR_SUPABASE_DATABASE_URL>
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
AI_BASE_URL=https://openrouter.ai/api/v1/chat/completions
AI_MODEL=gemini-3.1-flash-lite
CLOUDINARY_CLOUD_NAME=<YOUR_CLOUDINARY_CLOUD_NAME>
CLOUDINARY_API_KEY=<YOUR_CLOUDINARY_API_KEY>
CLOUDINARY_API_SECRET=<YOUR_CLOUDINARY_API_SECRET>
YOUTUBE_API_KEY=<YOUR_YOUTUBE_API_KEY>
COOKIE_SECURE=true
```

> **Important:** `FRONTEND_URL` must be your Vercel URL (not localhost). This fixes CORS.

### 1.3 Save & Deploy

Click **Save changes** → Render auto-redeploys.

---

## Part 2: Vercel (Frontend) — Next.js Migration

### 2.1 Go to Vercel Dashboard

1. [vercel.com](https://vercel.com) → your Genesis project
2. **Settings** → **Environment Variables**

### 2.2 Delete All Old `VITE_*` Variables

Remove every variable that starts with `VITE_`. They don't work with Next.js.

### 2.3 Add These Environment Variables

Copy-paste block. Replace values in `<BRACKETS>` with yours:

```bash
# ── Required ──────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=<YOUR_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<YOUR_UPLOAD_PRESET>

# ── Firebase / Push Notifications ─────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=<YOUR_FIREBASE_API_KEY>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<YOUR_FIREBASE_AUTH_DOMAIN>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<YOUR_FIREBASE_PROJECT_ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<YOUR_FIREBASE_STORAGE_BUCKET>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<YOUR_SENDER_ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<YOUR_FIREBASE_APP_ID>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<YOUR_MEASUREMENT_ID>
NEXT_PUBLIC_FIREBASE_VAPID_KEY=<YOUR_VAPID_KEY>

# ── App Config ────────────────────────────────────
NEXT_PUBLIC_APP_NAME=Genesis
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 2.4 Build Settings

Go to **Settings → General**:

| Field | Value |
|-------|-------|
| Framework Preset | Next.js |
| Root Directory | `lms/frontend` |
| Build Command | `npx next build --webpack` |
| Output Directory | `.next` (leave default) |
| Install Command | `npm ci` |

### 2.5 Deploy

Go to **Deployments** → click **Redeploy** on latest commit.

Vercel builds and deploys. Takes ~1-2 minutes.

---

## Part 3: GitHub Actions Workflow

Create `.github/workflows/deploy.yml` for auto-deploy on push:

```yaml
name: Deploy Genesis LMS

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./lms/frontend
          vercel-args: '--prod'

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

### 3.1 Get Vercel Tokens

1. Vercel → Settings → Tokens → Create
2. Add to GitHub Secrets: `VERCEL_TOKEN`

3. Get org/project IDs:
```bash
cd lms/frontend
npx vercel link
cat .vercel/project.json
```

4. Add to GitHub Secrets:
```
VERCEL_ORG_ID = <from project.json>
VERCEL_PROJECT_ID = <from project.json>
```

---

## Part 4: Build APK (Android)

### 4.1 Prerequisites

- Android Studio: https://developer.android.com/studio
- Java JDK 17: https://adoptium.net/temurin/releases/?version=17

### 4.2 Build Steps

```bash
cd lms/frontend

# Step 1: Build Next.js
npx next build --webpack

# Step 2: Sync Capacitor
npx cap sync android

# Step 3: Open Android Studio
npx cap open android
```

### 4.3 In Android Studio

1. Wait for Gradle sync (first time takes 5-10 min)
2. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4.4 For Play Store (Signed AAB)

```bash
cd lms/frontend/android

# Generate release keystore (one time)
keytool -genkey -v -keystore genesis-release.keystore -alias genesis -keyalg RSA -keysize 2048 -validity 10000

# Build release AAB
./gradlew bundleRelease
```

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

### 4.5 Version Bump

Edit `lms/frontend/android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2        # Increment each release
    versionName "1.1"    # User-facing version
}
```

---

## Part 5: Verify Everything Works

### Checklist

```
□ Backend health check responds
□ Frontend loads at Vercel URL
□ Login works (auth flow)
□ API calls succeed from frontend
□ Push notifications registered
□ File uploads work (Cloudinary)
□ AI tutor responds (Gemini)
□ Mobile app connects to Vercel URL
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on Vercel | Ensure Build Command is `npx next build --webpack` |
| API calls fail (CORS) | `FRONTEND_URL` in Render must match your Vercel domain |
| Env vars not loading | Only `NEXT_PUBLIC_*` vars work in browser. Redeploy after changing. |
| APK blank screen | `capacitor.config.ts` → `server.url` must be live Vercel URL |
| Render cold start (30s) | Free tier spins down. Upgrade to Starter ($7/mo) |
| Firebase config empty | Check `.env` has all `NEXT_PUBLIC_FIREBASE_*` vars set |

---

## Cost

| Service | Free | Production |
|---------|------|------------|
| Vercel | 100GB bandwidth | $20/mo |
| Render | 750 hrs (spins down) | $7/mo |
| Supabase | 500MB DB, 50K MAU | $25/mo |
| **Total** | **$0** | **~$52/mo** |
