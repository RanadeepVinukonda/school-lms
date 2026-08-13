# School LMS — Environment & Credentials Manifest

**Project:** School LMS — Express/TypeScript backend, React/Vite frontend, React Native/Expo mobile (3 apps: teacher, student, parent), Supabase/PostgreSQL with Drizzle ORM, AI via Gemini & OpenRouter, background jobs via Inngest, push notifications via Firebase Cloud Messaging.

> **⚠️ WARNING:** Every variable below is a **secret** unless marked otherwise. Never commit `.env` files, never paste keys into Slack/email, never hardcode fallback values in source. Use a secrets manager in production. Rotate keys periodically.

---

## Table of Contents

1. [Server & Environment](#1-server--environment)
2. [Supabase & Database](#2-supabase--database)
3. [AI / LLM](#3-ai--llm)
4. [Cloudinary (Media)](#4-cloudinary-media)
5. [Email (SMTP)](#5-email-smtp)
6. [Monitoring (Sentry)](#6-monitoring-sentry)
7. [Firebase & Push Notifications](#7-firebase--push-notifications)
8. [Expo (Mobile Builds)](#8-expo-mobile-builds)
9. [Inngest (Background Jobs)](#9-inngest-background-jobs)
10. [YouTube API](#10-youtube-api)
11. [Cron Jobs](#11-cron-jobs)
12. [Rate Limiting & Cookies](#12-rate-limiting--cookies)
13. [Frontend (Vite) Vars](#13-frontend-vite-vars)
14. [Mobile (Expo) Vars](#14-mobile-expo-vars)
15. [CI/CD Secrets](#15-cicd-secrets)
16. [Quick-Start .env Template](#16-quick-start-env-template)
17. [Secrets Management Best Practices](#17-secrets-management-best-practices)

---

## 1. Server & Environment

### Variable: `NODE_ENV`

- **Description:** Runtime environment. Controls logging verbosity, error detail, CORS, and whether mock values are allowed for required keys.
- **Required:** Yes (backend crashes without it)
- **Used in:** Backend
- **How to obtain:** Set manually. Not fetched from any service.
  1. Choose the value: `development`, `production`, or `test`
  2. Backend uses `z.enum()` — any other value causes a validation error
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** In production, `COOKIE_SECURE` should be `true` and Sentry should be configured.

---

### Variable: `PORT`

- **Description:** TCP port for the Express server.
- **Required:** No (defaults to `3001`)
- **Used in:** Backend
- **How to obtain:**
  1. Pick any available port (e.g., `3001`)
  2. Or use `0` for a random OS-assigned port (not recommended for production)
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** In production, use a standard port (3001) behind a reverse proxy (Nginx, Caddy).

---

### Variable: `FRONTEND_URL`

- **Description:** Origin URL of the frontend app for CORS headers.
- **Required:** No (defaults to `http://localhost:5173`)
- **Used in:** Backend
- **How to obtain:**
  1. Development: `http://localhost:5173`
  2. Production: `https://your-domain.com`
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Keep this scoped to the actual frontend origin to prevent CORS abuse.

---

### Variable: `COOKIE_DOMAIN`

- **Description:** Domain for session cookies. Needed when API and frontend are on different subdomains.
- **Required:** No
- **Used in:** Backend
- **How to obtain:** Set to your root domain (e.g., `.your-school.com`)
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Never use a too-broad domain (`.com`). Keep it scoped to your app's domain.

---

### Variable: `COOKIE_SECURE`

- **Description:** Whether cookies require HTTPS. Must be `true` in production.
- **Required:** No (defaults to `false`)
- **Used in:** Backend
- **How to obtain:** Set to `true` in production, `false` in local development
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Never use `false` in production — cookies will be sent over unencrypted HTTP.

---

## 2. Supabase & Database

### Variable: `SUPABASE_URL`

- **Description:** Supabase project URL. Used by the backend, frontend, and mobile apps to connect to your Supabase instance.
- **Required:** Yes (backend, frontend, and mobile all fail to start)
- **Used in:** Backend, Frontend (as `VITE_SUPABASE_URL`), Mobile (as `EXPO_PUBLIC_SUPABASE_URL`)
- **How to obtain:**
  1. Go to [https://supabase.com](https://supabase.com)
  2. Sign up / log in with your GitHub or email
  3. Create a new project (or select existing)
  4. Wait for the database to provision (~2 minutes)
  5. In the project dashboard, go to **Project Settings → API**
  6. Copy the **Project URL** (looks like `https://xxxx.supabase.co`)
  7. Paste into your `.env` as `SUPABASE_URL`, `VITE_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_URL`
- **Permissions needed:** Project owner or admin
- **Cost:** Free tier: 500 MB database, 2 GB bandwidth, 50,000 monthly active users. Pro: $25/month for 8 GB database, 50 GB bandwidth.
- **Security note:** This URL is public (it's just an endpoint). Safe to expose to client apps, but treat the project as a whole with care.

---

### Variable: `SUPABASE_ANON_KEY`

- **Description:** Public anonymous key for the Supabase client. Used on the frontend and mobile apps for Row Level Security (RLS)-protected queries.
- **Required:** Yes (frontend and mobile cannot make Supabase queries)
- **Used in:** Backend, Frontend (as `VITE_SUPABASE_ANON_KEY`), Mobile (as `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- **How to obtain:**
  1. Same Supabase project dashboard as above
  2. Go to **Project Settings → API**
  3. Copy the **anon public** key (starts with `eyJ...`)
  4. Paste into `.env` files
- **Permissions needed:** Project member
- **Cost:** Free (included with Supabase project)
- **Security note:** This key is **public** by design. It does not grant access beyond what RLS allows. But if your RLS policies are too permissive, this key can expose data. Always lock down RLS.

---

### Variable: `SUPABASE_SERVICE_ROLE_KEY`

- **Description:** **Super admin key.** Bypasses all RLS policies. Use only in server-side code (backend, CI/CD migrations) — never expose to the frontend or mobile.
- **Required:** Yes (backend cannot run schema migrations or admin operations)
- **Used in:** Backend, CI/CD
- **How to obtain:**
  1. Same Supabase project dashboard
  2. Go to **Project Settings → API**
  3. Copy the **service_role** key (starts with `eyJ...`)
  4. Paste into your backend `.env` and your CI/CD secrets manager
- **Permissions needed:** Project owner
- **Cost:** Free (included)
- **Security note:** **This key grants full access to your database.** Never commit it, never expose it to client code. If leaked, rotate immediately in Supabase Dashboard → Settings → API → JWT Settings → Generate new key.

---

### Variable: `SUPABASE_STORAGE_BUCKET`

- **Description:** Name of the Supabase Storage bucket used for file uploads (textbooks, assignments, etc.).
- **Required:** No (defaults to `textbooks`)
- **Used in:** Backend
- **How to obtain:**
  1. In Supabase Dashboard, go to **Storage**
  2. Create a new bucket (e.g., `textbooks`)
  3. Set it to **public** or **private** depending on your RLS strategy
  4. Copy the bucket name
  5. Set `SUPABASE_STORAGE_BUCKET=textbooks`
- **Permissions needed:** Project member
- **Cost:** Free tier: 1 GB storage, 2 GB bandwidth. Pro: 100 GB storage, 200 GB bandwidth.
- **Security note:** Use RLS policies on the `storage.objects` table to control access. Never set a bucket to fully public without RLS.

---

### Variable: `DATABASE_URL`

- **Description:** Direct PostgreSQL connection string (with password). Used by Drizzle ORM for migrations and direct queries.
- **Required:** No (backend uses Supabase client + service role by default, but needed for `drizzle-kit` migrations)
- **Used in:** Backend (Drizzle migrations), CI/CD
- **How to obtain:**
  1. In Supabase Dashboard, go to **Project Settings → Database**
  2. Under **Connection string**, select **URI**
  3. Copy the connection string (looks like `postgresql://postgres.xxxx:password@aws-0-xx.pooler.supabase.com:6543/postgres`)
  4. Fill in the `[YOUR-PASSWORD]` placeholder with your database password
- **Permissions needed:** Project owner
- **Cost:** Free (included)
- **Security note:** **Contains your database password in plain text.** Never commit. Never share. Use connection pooling (Supabase's `:6543` port) in production.

---

### Variable: `SUPABASE_JWT_SECRET`

- **Description:** Secret used to sign and verify Supabase auth JWTs. Needed if you implement custom auth flows or verify tokens server-side.
- **Required:** No
- **Used in:** Backend
- **How to obtain:**
  1. In Supabase Dashboard, go to **Project Settings → API**
  2. Under **JWT Settings**, find **JWT Secret**
  3. Click **Reveal** and copy
- **Permissions needed:** Project owner
- **Cost:** Free (included)
- **Security note:** **This is a signing secret.** If leaked, anyone can forge valid JWTs. Rotate immediately on suspected compromise.

---

## 3. AI / LLM

### Variable: `GEMINI_API_KEY`

- **Description:** Google AI Gemini API key. Used for AI-powered features (textbook generation, content summarization, etc.).
- **Required:** Yes (backend crashes without it in non-test mode)
- **Used in:** Backend
- **How to obtain:**
  1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
  2. Sign in with your Google account
  3. Click **Create API Key**
  4. Select an existing Google Cloud project or create a new one
  5. Copy the generated key (starts with `AIza...`)
  6. Paste into your `.env` as `GEMINI_API_KEY`
- **Permissions needed:** Google Cloud project with Generative Language API enabled
- **Cost:** **Free tier:** 60 requests per minute, 1,500 requests per day (Gemini 1.5 Flash). **Paid:** Pay-as-you-go via Google Cloud. ~$0.075 per million input tokens for Gemini 1.5 Flash.
- **Security note:** This key authenticates your project for API calls. If leaked, others can use your quota. Enable API key restrictions in Google Cloud Console (restrict to Generative Language API only).

---

### Variable: `AI_API_KEY`

- **Description:** API key for an alternative LLM provider (OpenRouter by default). Used as a fallback or alternative to Gemini.
- **Required:** No (backend defaults to empty string)
- **Used in:** Backend
- **How to obtain:**
  1. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
  2. Sign up / log in with GitHub, Google, or email
  3. Click **Create Key**
  4. Give it a name (e.g., "School LMS Production")
  5. Copy the key (starts with `sk-or-...`)
  6. Set `AI_API_KEY=sk-or-your-key-here`
- **Permissions needed:** OpenRouter account
- **Cost:** **Free tier:** OpenRouter gives $1 free credit on signup. **Paid:** Usage-based, varies by model. Rates at [https://openrouter.ai/models](https://openrouter.ai/models). GPT-4o-mini ~$0.15/M tokens.
- **Security note:** This key can be used to call any model on OpenRouter on your behalf. Restrict it in OpenRouter settings if possible. Rotate if compromised.

---

### Variable: `AI_BASE_URL`

- **Description:** Base URL for the alternative LLM API endpoint.
- **Required:** No (defaults to `https://openrouter.ai/api/v1/chat/completions`)
- **Used in:** Backend
- **How to obtain:**
  1. Default: leave it as-is for OpenRouter
  2. For other providers, find their chat completions endpoint:
     - OpenAI: `https://api.openai.com/v1/chat/completions`
     - Anthropic (via OpenRouter): leave default
     - Local (Ollama): `http://localhost:11434/v1/chat/completions`
- **Permissions needed:** None
- **Cost:** Free to set
- **Security note:** Ensure the endpoint uses HTTPS in production.

---

### Variable: `AI_MODEL`

- **Description:** Model identifier for the alternative LLM.
- **Required:** No (defaults to `openai/gpt-4o-mini`)
- **Used in:** Backend
- **How to obtain:**
  - OpenRouter models: `openai/gpt-4o`, `anthropic/claude-3.5-sonnet`, `google/gemini-2.0-flash-001`
  - OpenAI: `gpt-4o-mini`, `gpt-4o`
  - Any model ID the provider supports
- **Permissions needed:** None
- **Cost:** Varies by model (see provider pricing)
- **Security note:** Ensure the chosen model is available on your provider and budgeted.

---

### Variable: `AI_TEXTBOOK_API_KEY`

- **Description:** Separate API key for the dedicated textbook generation LLM. Allows using a different provider/model for textbook generation vs general AI features.
- **Required:** No
- **Used in:** Backend
- **How to obtain:** Same process as `AI_API_KEY` — get a key from OpenRouter or your chosen provider
- **Permissions needed:** Account on the provider
- **Cost:** Same model-dependent pricing
- **Security note:** Separate key allows independent rotation and usage monitoring for the textbook pipeline.

---

### Variable: `AI_TEXTBOOK_BASE_URL`

- **Description:** Base URL for the textbook LLM provider.
- **Required:** No
- **Used in:** Backend
- **How to obtain:** Same as `AI_BASE_URL` — endpoint URL for your chosen provider
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Use HTTPS in production.

---

### Variable: `AI_TEXTBOOK_MODEL`

- **Description:** Model identifier for textbook generation. Can use a more capable (and expensive) model for generating textbooks while using a cheaper model for other AI tasks.
- **Required:** No
- **Used in:** Backend
- **How to obtain:** Same as `AI_MODEL` — pick the model ID
- **Permissions needed:** None
- **Cost:** Varies by model
- **Security note:** Pick a model with sufficient context window for textbook generation (≥32K tokens recommended).

---

## 4. Cloudinary (Media)

### Variable: `CLOUDINARY_CLOUD_NAME`

- **Description:** Your Cloudinary cloud identifier. All media uploads (images, videos, documents) use this.
- **Required:** Yes (backend crashes without it in non-test mode)
- **Used in:** Backend
- **How to obtain:**
  1. Go to [https://cloudinary.com](https://cloudinary.com)
  2. Sign up / log in
  3. After login, you land on the Dashboard
  4. Your **Cloud name** is displayed at the top (looks like `your-company`)
  5. Copy and set `CLOUDINARY_CLOUD_NAME=your-company`
- **Permissions needed:** Cloudinary account
- **Cost:** **Free tier:** 25 GB storage, 25 GB bandwidth, 25 MB file size limit, 1,000 transformations. **Paid:** starts at $89/month for 50 GB storage.
- **Security note:** This value is semi-public (appears in frontend upload presets). It is not a secret but keep it consistent across environments.

---

### Variable: `CLOUDINARY_API_KEY`

- **Description:** API key for server-side Cloudinary operations (secure uploads, transforms, admin).
- **Required:** Yes (backend crashes without it in non-test mode)
- **Used in:** Backend
- **How to obtain:**
  1. In Cloudinary Dashboard, go to **Settings → Access Keys** (or Dashboard → API Keys)
  2. If no key exists, click **Generate New API Key**
  3. Copy the **API Key** (it's a numeric string)
  4. Set `CLOUDINARY_API_KEY=your-api-key`
- **Permissions needed:** Cloudinary account admin
- **Cost:** Free (included)
- **Security note:** This key combined with the API secret can upload, transform, and delete assets. Never expose to client code.

---

### Variable: `CLOUDINARY_API_SECRET`

- **Description:** Secret for server-side Cloudinary API authentication.
- **Required:** Yes (backend crashes without it in non-test mode)
- **Used in:** Backend
- **How to obtain:**
  1. Same location as API Key (Dashboard or Settings → Access Keys)
  2. Click **Reveal** next to **API Secret**
  3. Copy the long string
  4. Set `CLOUDINARY_API_SECRET=your-api-secret`
- **Permissions needed:** Cloudinary account admin
- **Cost:** Free (included)
- **Security note:** **This is a secret.** Never commit, never share. Rotate by regenerating keys in Cloudinary Dashboard.

---

### Variable: `VITE_CLOUDINARY_UPLOAD_PRESET`

- **Description:** Named upload preset for unsigned uploads from the frontend.
- **Required:** No
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. In Cloudinary Dashboard, go to **Settings → Upload**
  2. Scroll to **Upload presets**
  3. Click **Add upload preset**
  4. Name it (e.g., `school_lms_preset`)
  5. Set **Signing Mode** to `Unsigned`
  6. Configure allowed file types, transformations, etc.
  7. Save and copy the preset name
  8. Set `VITE_CLOUDINARY_UPLOAD_PRESET=school_lms_preset`
- **Permissions needed:** Cloudinary account admin
- **Cost:** Free (included with account)
- **Security note:** Unsigned presets are public by design. Restrict them to specific file types and sizes in the preset configuration to prevent abuse.

---

## 5. Email (SMTP)

### Variable: `SMTP_HOST`

- **Description:** SMTP server hostname for sending transactional emails (password resets, notifications, etc.).
- **Required:** No (defaults to `smtp.gmail.com`)
- **Used in:** Backend
- **How to obtain:**
  - Gmail: `smtp.gmail.com`
  - SendGrid: `smtp.sendgrid.net`
  - Mailgun: `smtp.mailgun.org`
  - Custom: your SMTP server host
- **Permissions needed:** SMTP account credentials
- **Cost:** Depends on provider
- **Security note:** Use a dedicated email sender, not your personal email.

---

### Variable: `SMTP_PORT`

- **Description:** SMTP server port.
- **Required:** No (defaults to `587`)
- **Used in:** Backend
- **How to obtain:**
  - `587` (STARTTLS, recommended)
  - `465` (SSL)
  - `25` (plain, usually blocked by ISPs)
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Prefer `587` over `465` or `25`.

---

### Variable: `SMTP_USER`

- **Description:** SMTP authentication username (usually the email address).
- **Required:** No (email sending fails without it)
- **Used in:** Backend
- **How to obtain:**
  1. For Gmail: use your full Gmail address
  2. For SendGrid: use `apikey`
  3. For Mailgun: use `postmaster@your-domain.com`
- **Permissions needed:** SMTP account
- **Cost:** Free tier options: Gmail (free with Google account), SendGrid (100 emails/day free), Mailgun (5,000 emails/month free for first 3 months)
- **Security note:** If using Gmail, enable 2FA and create a **Gmail App Password** (not your regular password).

---

### Variable: `SMTP_PASS`

- **Description:** SMTP authentication password.
- **Required:** No (email sending fails without it)
- **Used in:** Backend
- **How to obtain:**
  - **Gmail with 2FA:** Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → create an App Password → copy the 16-character code
  - **SendGrid:** Use your SendGrid API key
  - **Mailgun:** Use your Mailgun SMTP password
- **Permissions needed:** SMTP account
- **Cost:** Free (included)
- **Security note:** **This is a credential.** Never commit. For Gmail, always use an App Password, never your actual Google password.

---

### Variable: `SMTP_FROM`

- **Description:** "From" email address for outgoing emails.
- **Required:** No (defaults to `noreply@school-lms.com`)
- **Used in:** Backend
- **How to obtain:**
  1. Choose a sender address (e.g., `noreply@your-school.com`)
  2. Ensure the domain's SPF/DKIM/DMARC records are configured to allow sending
- **Permissions needed:** Domain ownership (for SPF/DKIM setup)
- **Cost:** Free (just an address string)
- **Security note:** Configure SPF, DKIM, and DMARC to prevent your emails from being marked as spam.

---

## 6. Monitoring (Sentry)

### Variable: `SENTRY_DSN`

- **Description:** Sentry Data Source Name. Routes error reports from the backend to your Sentry project.
- **Required:** No (error monitoring silently disabled)
- **Used in:** Backend, CI/CD
- **How to obtain:**
  1. Go to [https://sentry.io](https://sentry.io)
  2. Sign up / log in
  3. Create a new project → Select **Node.js** or **Express**
  4. Copy the DSN string (looks like `https://xxx@xxx.ingest.de.sentry.io/xxxx`)
  5. Set `SENTRY_DSN=https://your-dsn`
- **Permissions needed:** Sentry account, project admin
- **Cost:** **Free tier:** 5,000 events/month, 1 user. **Team:** $26/user/month for advanced features.
- **Security note:** The DSN is technically public (it appears in client SDKs), but your backend DSN should be kept as an environment variable. Rotate if you suspect unauthorized event submission.

---

## 7. Firebase & Push Notifications

### Variable: `VITE_FIREBASE_API_KEY`

- **Description:** Firebase Web API key. Used to initialize Firebase on the frontend for push notifications.
- **Required:** No (push notifications disabled on frontend)
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
  2. Create a project (or select existing)
  3. Go to **Project Settings → General → Your apps**
  4. Click **Add app → Web**
  5. Register the app (name it e.g., "School LMS Web")
  6. Copy the `apiKey` from the config object
  7. Set `VITE_FIREBASE_API_KEY=your-api-key`
- **Permissions needed:** Firebase project owner
- **Cost:** **Free:** Firebase is free. Cloud Messaging has no cost. Firebase App Check may have usage costs.
- **Security note:** This key is public (client-side). Firebase security relies on App Check + Firebase Security Rules, not the API key.

---

### Variable: `VITE_FIREBASE_AUTH_DOMAIN`

- **Description:** Firebase Auth domain for authentication redirects.
- **Required:** No
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. Same Firebase Console → **Project Settings → General**
  2. Format: `<project-id>.firebaseapp.com`
  3. Set `VITE_FIREBASE_AUTH_DOMAIN=school-ca94b.firebaseapp.com`
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Public value. No special handling needed.

---

### Variable: `VITE_FIREBASE_PROJECT_ID`

- **Description:** Firebase project identifier.
- **Required:** No
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. Firebase Console → **Project Settings → General**
  2. Find **Project ID**
  3. Set `VITE_FIREBASE_PROJECT_ID=school-ca94b`
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Public value.

---

### Variable: `VITE_FIREBASE_STORAGE_BUCKET`

- **Description:** Firebase Storage bucket for file storage (if using Firebase Storage in addition to Supabase Storage).
- **Required:** No
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. Firebase Console → **Storage** → note the bucket URL
  2. Format: `<project-id>.appspot.com` or `<project-id>.firebasestorage.app`
- **Permissions needed:** None
- **Cost:** **Free:** 5 GB storage, 1 GB download/day. **Pay-as-you-go:** $0.026/GB stored, $0.12/GB downloaded.
- **Security note:** Public value. Access control is via Firebase Storage Rules.

---

### Variable: `VITE_FIREBASE_MESSAGING_SENDER_ID`

- **Description:** Firebase Cloud Messaging sender ID for push notifications.
- **Required:** No (push notifications won't work without it)
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. Firebase Console → **Project Settings → Cloud Messaging**
  2. Find **Sender ID**
  3. Set `VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id`
- **Permissions needed:** Firebase project owner
- **Cost:** **Free.** FCM has no cost.
- **Security note:** Semi-public value (needed by browser for push registration).

---

### Variable: `VITE_FIREBASE_APP_ID`

- **Description:** Firebase app identifier.
- **Required:** No (push notifications won't work without it)
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. Firebase Console → **Project Settings → General → Your apps**
  2. Find your Web app's **App ID** (`1:xxx:web:yyy`)
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Public value.

---

### Variable: `VITE_FIREBASE_VAPID_KEY`

- **Description:** Voluntary Application Server Identification key for FCM. Required for push notification subscription.
- **Required:** No (push notification subscription fails without it)
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. Firebase Console → **Project Settings → Cloud Messaging**
  2. Under **Web Push certificates**, find **Key pair**
  3. Click **Generate** if none exists
  4. Copy the key
  5. Set `VITE_FIREBASE_VAPID_KEY=your-vapid-key`
- **Permissions needed:** Firebase project owner
- **Cost:** Free
- **Security note:** This is a public key (safe to expose to clients). The corresponding private key is managed server-side by Firebase.

---

### Variable: `VITE_FIREBASE_MEASUREMENT_ID`

- **Description:** Google Analytics measurement ID for Firebase Analytics.
- **Required:** No
- **Used in:** Frontend (Vite)
- **How to obtain:**
  1. Firebase Console → **Analytics**
  2. Find the **Measurement ID** (`G-XXXXXXXXXX`)
- **Permissions needed:** Firebase project with Google Analytics enabled
- **Cost:** Free
- **Security note:** Public value.

---

### Variable: `FIREBASE_SERVICE_ACCOUNT_KEY`

- **Description:** Firebase Admin SDK service account JSON. Used for server-side Firebase operations (sending push notifications, admin auth, etc.).
- **Required:** No (server-side push notifications and Firebase admin features disabled)
- **Used in:** Backend
- **How to obtain:**
  1. Firebase Console → **Project Settings → Service accounts**
  2. Click **Generate new private key**
  3. A JSON file downloads automatically
  4. Copy the entire JSON content as a single-line string
  5. Set `FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'`
  6. **Alternative:** Save the JSON to a file and use `FIREBASE_SERVICE_ACCOUNT_PATH` env var
- **Permissions needed:** Firebase project owner or Firebase Admin SDK Admin role
- **Cost:** Free (Firebase Admin SDK usage included with Firebase plan)
- **Security note:** **CRITICAL SECURITY RISK.** This JSON contains an unencrypted RSA private key. Anyone with this file can impersonate your Firebase project with full admin access. Never commit it. Best practice: store in a secrets manager and load at runtime, never in an env var as a JSON string if your runtime supports file paths.

---

## 8. Expo (Mobile Builds)

### Variable: `EXPO_ACCESS_TOKEN`

- **Description:** Expo access token for EAS Build and OTA updates from CI/CD.
- **Required:** No (needed for automated builds; local development doesn't need it)
- **Used in:** Backend, CI/CD
- **How to obtain:**
  1. Go to [https://expo.dev](https://expo.dev)
  2. Sign in with your Expo account
  3. Open your project dashboard
  4. Go to **Settings → Access tokens**
  5. Click **Create access token**
  6. Name it (e.g., "CI/CD Token")
  7. Copy the token (starts with `expo-...`)
  8. Set `EXPO_ACCESS_TOKEN=expo-your-token`
- **Permissions needed:** Expo project owner or admin
- **Cost:** **Free tier:** 30 builds/month, 1 GB OTA updates. **Pro:** $35/user/month for unlimited builds.
- **Security note:** This token grants access to your Expo project's builds and updates. Never commit. Rotate if compromised.

---

### Variable: `EXPO_PUBLIC_API_URL`

- **Description:** Backend API URL for the mobile apps.
- **Required:** Yes (mobile apps cannot connect to backend without it)
- **Used in:** Mobile (teacher, student, parent apps — all 3)
- **How to obtain:**
  1. Development: `http://<your-local-ip>:3001/api` (use your LAN IP, not localhost, for device testing)
  2. Production: `https://api.your-school.com/api`
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Use HTTPS in production. On Android, iOS blocks cleartext HTTP by default; you'll need to configure `NSAppTransportSecurity` (iOS) or a network security policy (Android) for local dev.

---

## 9. Inngest (Background Jobs)

### Variable: `INNGEST_SIGNING_KEY`

- **Description:** Key for verifying Inngest webhook requests and authenticating the Inngest SDK with the Inngest Cloud API.
- **Required:** No (Inngest falls back to unverifed mode locally; required for production Inngest Cloud)
- **Used in:** Backend
- **How to obtain:**
  1. Go to [https://app.inngest.com](https://app.inngest.com)
  2. Sign up / log in with GitHub or email
  3. Create a new workspace and app
  4. Go to **Settings → Env Variables / API Keys** (varies by dashboard version)
  5. Generate a new signing key
  6. Set `INNGEST_SIGNING_KEY=your-signing-key`
- **Permissions needed:** Inngest account, workspace admin
- **Cost:** **Free tier:** 100,000 steps/month on Inngest Cloud. **Pro:** $50/month for 1M steps.
- **Security note:** This key authenticates your app to Inngest Cloud. Never commit. Rotate if compromised.

---

## 10. YouTube API

### Variable: `YOUTUBE_API_KEY`

- **Description:** Google Cloud API key for accessing the YouTube Data API v3 (searching videos, fetching metadata for educational content).
- **Required:** No (YouTube features disabled)
- **Used in:** Backend
- **How to obtain:**
  1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
  2. Create a project or select existing
  3. Go to **APIs & Services → Library**
  4. Search for **YouTube Data API v3** and enable it
  5. Go to **APIs & Services → Credentials**
  6. Click **Create Credentials → API Key**
  7. Copy the key (starts with `AIza...`)
  8. Set `YOUTUBE_API_KEY=AIza...`
- **Permissions needed:** Google Cloud project owner or editor
- **Cost:** **Free:** 10,000 quota units/day (roughly 10,000 requests). Extra quota can be requested on the paid plan.
- **Security note:** Restrict the API key to YouTube Data API v3 only in **API Restrictions**. Restrict by HTTP referrer if used from client code.

---

## 11. Cron Jobs

### Variable: `CRON_SECRET`

- **Description:** Shared secret for authenticating cron job HTTP triggers. Passed in the `Authorization` header when cron endpoints are called.
- **Required:** No (cron endpoints return 401 without it)
- **Used in:** Backend
- **How to obtain:**
  1. Generate a random, high-entropy string:
     - Open a terminal and run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     - Or use: `openssl rand -hex 32`
  2. Copy the 64-character hex string
  3. Set `CRON_SECRET=<generated-value>`
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** This is a shared secret. Keep it consistent between your cron job runner (e.g., Vercel Cron, cron-job.org) and your backend. Rotate periodically.

---

## 12. Rate Limiting & Cookies

### Variable: `AUTH_RATE_LIMIT_MAX`

- **Description:** Maximum number of auth endpoint requests (login, register) allowed per window per IP.
- **Required:** No (defaults to `20`)
- **Used in:** Backend
- **How to obtain:** Tune based on your traffic. Recommended: `5` for production, `20` for development.
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Lower values help prevent brute-force login attacks. Increase cautiously.

---

### Variable: `AUTH_RATE_LIMIT_WINDOW_MS`

- **Description:** Time window (in milliseconds) for auth rate limiting.
- **Required:** No (defaults to `300000` = 5 minutes)
- **Used in:** Backend
- **How to obtain:** `300000` (5 min) for production, `60000` (1 min) for testing.
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Keep this short enough to mitigate brute-force but long enough to avoid user frustration.

---

### Variable: `API_RATE_LIMIT_MAX`

- **Description:** Maximum number of general API requests per window per IP.
- **Required:** No (defaults to `100`)
- **Used in:** Backend
- **How to obtain:** Tune based on expected API usage. `100` is reasonable for most apps.
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Prevent API abuse by setting this based on your expected client traffic.

---

### Variable: `API_RATE_LIMIT_WINDOW_MS`

- **Description:** Time window (in milliseconds) for general API rate limiting.
- **Required:** No (defaults to `60000` = 1 minute)
- **Used in:** Backend
- **How to obtain:** `60000` (1 min) is standard.
- **Permissions needed:** None
- **Cost:** Free
- **Security note:** Adjust based on your API's normal usage patterns.

---

## 13. Frontend (Vite) Vars

The frontend uses Vite, which requires all environment variables to be prefixed with `VITE_`. These are statically embedded at build time and exposed to the browser.

| Variable | Maps to backend var | Required | Default |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `SUPABASE_URL` | **Yes** | — |
| `VITE_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` | **Yes** | — |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | (Cloudinary preset) | No | — |
| `VITE_FIREBASE_API_KEY` | (Firebase Web API Key) | No | — |
| `VITE_FIREBASE_AUTH_DOMAIN` | (Firebase Auth domain) | No | — |
| `VITE_FIREBASE_PROJECT_ID` | (Firebase project ID) | No | — |
| `VITE_FIREBASE_STORAGE_BUCKET` | (Firebase Storage bucket) | No | — |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (FCM sender ID) | No | — |
| `VITE_FIREBASE_APP_ID` | (Firebase app ID) | No | — |
| `VITE_FIREBASE_VAPID_KEY` | (FCM VAPID key) | No | — |
| `VITE_FIREBASE_MEASUREMENT_ID` | (GA measurement ID) | No | — |

These are set in `lms/frontend/.env`. See sections above for instructions on obtaining each value.

> **Note:** Vite inlines these values at build time. They are visible in the browser's `import.meta.env`. Never put actual secrets here — use the backend for sensitive operations.

---

## 14. Mobile (Expo) Vars

All three mobile apps (`teacher`, `student`, `parent`) use the same three environment variables, prefixed with `EXPO_PUBLIC_`:

| Variable | Maps to backend var | Required | Default |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | **Yes** | `http://localhost:3001/api` |
| `EXPO_PUBLIC_SUPABASE_URL` | `SUPABASE_URL` | **Yes** | — |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` | **Yes** | — |

Set these in each app's `.env` file:
- `lms/mobile/teacher/.env`
- `lms/mobile/student/.env`
- `lms/mobile/parent/.env`

See sections above for Supabase key instructions. The API URL should point to your live backend in production (e.g., `https://api.your-school.com/api`).

---

## 15. CI/CD Secrets

These secrets should be configured in your CI/CD provider (GitHub Actions, GitLab CI, etc.) for automated builds, tests, and deployments.

### GitHub Actions Setup

1. Go to your GitHub repository → **Settings → Secrets and variables → Actions**
2. Add the following **Repository secrets**:

| Secret name | Maps to | Required for |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Backend env | Migrations + tests in CI |
| `SUPABASE_URL` | Backend env | Integration tests |
| `SUPABASE_ANON_KEY` | Backend env | Integration tests |
| `SENTRY_DSN` | Backend env | Error monitoring in deployed builds |
| `CLOUDINARY_CLOUD_NAME` | Backend env | Image upload tests |
| `CLOUDINARY_API_KEY` | Backend env | Image upload tests |
| `CLOUDINARY_API_SECRET` | Backend env | Image upload tests |
| `GEMINI_API_KEY` | Backend env | AI feature tests |
| `EXPO_ACCESS_TOKEN` | Expo | EAS Build + EAS Submit |
| `INNGEST_SIGNING_KEY` | Inngest | Background jobs in CI |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase | Push notification tests |

### GitHub Environments (Production Protection)

For production, use **GitHub Environments** with approval gates:

1. Go to **Settings → Environments → New environment** → name it `production`
2. Add **protection rules**:
   - Required reviewers (at least 1)
   - Wait timer (optional, e.g., 5 minutes)
3. Add **environment secrets** for production-only values:
   - Production `DATABASE_URL`
   - Production `SENTRY_DSN`
   - Production SMTP credentials
   - Production `SUPABASE_SERVICE_ROLE_KEY`
4. Update your deployment workflow to target the `production` environment:

```yaml
deploy:
  environment:
    name: production
    url: https://your-school.com
```

---

## 16. Quick-Start .env Template

Below is a complete `.env` file for local development. Copy-paste this to `lms/backend/.env` and fill in your values.

```bash
# ===================================================================
# School LMS — Backend Environment Variables (Development)
# Fill in every value marked <--- FILL
# ===================================================================

# -- Server ----------------------------------------------------------
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# -- Supabase (Required) --------------------------------------------
SUPABASE_URL=https://<your-project>.supabase.co                  # <--- FILL
SUPABASE_ANON_KEY=eyJ...                                          # <--- FILL
SUPABASE_SERVICE_ROLE_KEY=eyJ...                                  # <--- FILL
SUPABASE_STORAGE_BUCKET=textbooks

# -- Direct Database (Optional — needed for drizzle-kit) -----------
DATABASE_URL=postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres  # <--- FILL

# -- AI / LLM -------------------------------------------------------
GEMINI_API_KEY=AIza...                                            # <--- FILL
AI_API_KEY=sk-or-...                                              # <--- FILL (OpenRouter — optional)
AI_BASE_URL=https://openrouter.ai/api/v1/chat/completions
AI_MODEL=openai/gpt-4o-mini

# -- AI Textbook (Optional — separate provider for textbooks) ------
# AI_TEXTBOOK_API_KEY=
# AI_TEXTBOOK_BASE_URL=
# AI_TEXTBOOK_MODEL=

# -- Cloudinary (Required) ------------------------------------------
CLOUDINARY_CLOUD_NAME=<your-cloud-name>                           # <--- FILL
CLOUDINARY_API_KEY=<your-api-key>                                 # <--- FILL
CLOUDINARY_API_SECRET=<your-api-secret>                           # <--- FILL

# -- Firebase (Optional — push notifications) ----------------------
# FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}      # <--- FILL (JSON as single line)

# -- SMTP / Email (Optional) ---------------------------------------
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
# SMTP_USER=you@gmail.com                                          # <--- FILL
# SMTP_PASS=your-app-password                                      # <--- FILL (Gmail App Password)
# SMTP_FROM=noreply@school-lms.com

# -- Rate Limiting --------------------------------------------------
# AUTH_RATE_LIMIT_MAX=5
# AUTH_RATE_LIMIT_WINDOW_MS=900000
# API_RATE_LIMIT_MAX=100
# API_RATE_LIMIT_WINDOW_MS=60000

# -- Cookie / Session ------------------------------------------------
# COOKIE_DOMAIN=
# COOKIE_SECURE=false

# -- Monitoring (Optional) ------------------------------------------
# SENTRY_DSN=https://xxx@xxx.ingest.de.sentry.io/xxx              # <--- FILL

# -- Inngest (Optional — for background jobs) -----------------------
# INNGEST_SIGNING_KEY=signkey-...                                  # <--- FILL

# -- YouTube (Optional) ---------------------------------------------
# YOUTUBE_API_KEY=AIza...                                          # <--- FILL

# -- Cron (Optional) ------------------------------------------------
# CRON_SECRET=<64-char-hex-string>                                 # <--- FILL

# -- Expo (Optional — for mobile builds) ----------------------------
# EXPO_ACCESS_TOKEN=expo-...                                       # <--- FILL
```

### Frontend `.env` (`lms/frontend/.env`)

```bash
VITE_SUPABASE_URL=https://<your-project>.supabase.co              # <--- FILL
VITE_SUPABASE_ANON_KEY=eyJ...                                      # <--- FILL
VITE_CLOUDINARY_UPLOAD_PRESET=school_lms_preset                    # <--- FILL (optional)
VITE_FIREBASE_API_KEY=AIza...                                      # <--- FILL (optional)
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com                # <--- FILL
VITE_FIREBASE_PROJECT_ID=<project-id>                              # <--- FILL
VITE_FIREBASE_STORAGE_BUCKET=<project>.appspot.com                 # <--- FILL
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789                        # <--- FILL
VITE_FIREBASE_APP_ID=1:xxx:web:yyy                                 # <--- FILL
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX                          # <--- FILL (optional)
VITE_FIREBASE_VAPID_KEY=BC...                                      # <--- FILL
```

### Mobile `.env` (all 3 apps — `lms/mobile/{teacher,student,parent}/.env`)

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001/api                       # <--- CHANGE for production
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co         # <--- FILL
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...                                # <--- FILL
```

---

## 17. Secrets Management Best Practices

### 1. Never Commit `.env` Files

- Add `.env` to `.gitignore` at the root level
- Verify periodically: `git status` should never show `.env` files
- Do a one-time audit: `git log --diff-filter=A -- .env` — if `.env` was ever committed, rotate **every** key in it immediately and force-push to remove (or consider the repo compromised)
- Use `.env.example` files (already done in this project) as templates with placeholder values

### 2. Use GitHub Environments with Protection Rules

- **Create separate environments** for `development`, `staging`, and `production`
- **Require approval gates** for production deployments (prevent accidental deploys)
- **Use environment-specific secrets** so staging keys don't overlap with production
- **Enable deployment branches** restriction (only `main` or `release/*` can deploy to production)

### 3. Rotate Keys on a Regular Schedule

| Frequency | Key |
|---|---|
| Every 3 months | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` |
| Every 6 months | `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`, `AI_API_KEY` |
| Every 12 months | `SENTRY_DSN`, `FIREBASE_SERVICE_ACCOUNT_KEY` |
| On developer departure | All keys the developer had access to |
| Immediately on suspected breach | All keys |

For Supabase key rotation: Supabase Dashboard → Project Settings → API → JWT Settings → Generate new key.

### 4. Use a Secrets Manager in Production

| Solution | Pros | Cons |
|---|---|---|
| **Doppler** | Best DX, CLI tool, env injection, free for small teams ($5/mo for 5 projects) | Third-party dependency |
| **AWS Secrets Manager** | Native to AWS, IAM integration, automatic rotation | More complex setup, $0.40/secret/month |
| **HashiCorp Vault** | Self-hosted, most flexible, dynamic secrets | Operational overhead |
| **GitHub Actions Secrets** | Built-in if already on GitHub Actions | No local development sync |
| **Infisical** | Open source, Doppler-like, self-hostable | Newer project |

**Recommendation for this project:**
- **Start:** Use `.env` files locally + GitHub Actions secrets for CI/CD
- **Scale:** Add Doppler (free tier) — it syncs across environments and team members
- **Enterprise:** Move to AWS Secrets Manager or Vault

### 5. Audit Access to Secrets

- **Keep a secrets inventory** — this document serves as that inventory. Review it quarterly.
- **Use least-privilege access:** Only backend developers need the service_role key. Frontend developers only need the anon key.
- **Log access to secrets** in your secrets manager (most providers support this)
- **Remove access immediately** when a team member leaves or changes roles
- **Monitor for leaked keys:**
  - Enable **GitHub secret scanning** (Settings → Code security → Secret scanning)
  - Use a service like **GitGuardian** or **truffleHog** to scan repos for committed secrets
  - Set up alerts in your secrets manager for unusual access patterns
- **When a key is leaked:**
  1. Rotate the key immediately
  2. Check provider logs for unauthorized usage
  3. Revoke any tokens/access granted with that key
  4. Investigate how the leak happened
  5. Update processes to prevent recurrence

### 6. Development Workflow Rules

- **Never hardcode fallback secrets** in source code (already done properly via Zod schema defaults for non-sensitive values)
- **Use different keys per environment** — never share production keys with developers for local testing
- **Use mock values in test mode** — the backend's Zod schema already does this (see `isTest` checks in `env.ts`)
- **Prevent accidental commits** — install a pre-commit hook:
  ```bash
  # .git/hooks/pre-commit
  if git diff --cached --name-only | grep -q '\.env$'; then
    echo "ERROR: .env files should not be committed"
    exit 1
  fi
  ```
- **Pair programming tips:** When sharing your screen, cover your `.env` file. Never paste secrets in Slack, Discord, or public issue trackers.
