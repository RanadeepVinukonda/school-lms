# Genesis: Developer Setup and Deployment Guide

This document outlines the setup, local execution, Git integration, and Vercel Continuous Deployment (CI/CD) instructions for the Genesis Adaptive Learning Platform.

---

## 1. Project Structure

The project is structured as a monorepo containing two main folders:
- **`backend/`**: Express.js API, Supabase/Postgres database adapter, and background workers (pg-boss).
- **`frontend/`**: React.js SPA built with Vite, Tailwind CSS, and Radix UI components.

---

## 2. Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js** (v18 or higher recommended)
- **Git**
- **Vercel CLI** (Optional, for manual deployment control: `npm install -g vercel`)

---

## 3. Local Setup & Environment Variables

Create the respective `.env` files in both the `backend` and `frontend` folders:

### A. Backend Setup (`lms/backend/.env`)

Create a file named `.env` in `lms/backend/` and configure the following variables:

```env
# General Config
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Supabase Database Credentials
DATABASE_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# LLM Providers (Gemini / OpenAI API)
GEMINI_API_KEY="your-api-key"
AI_BASE_URL="https://api.openai.com/v1/chat/completions" # Or Gemini Beta OpenAI compatibility endpoint
AI_MODEL="gpt-4o-mini" # Or gemini-2.0-flash

# Cloudinary Credentials (for PDF and media hosting)
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# Redis Queue Connection (Upstash Redis URL for production queue, or empty for local mock)
REDIS_URL="rediss://default:YOUR_PASSWORD@your-upstash-redis-endpoint:6379"
```

### B. Frontend Setup (`lms/frontend/.env`)

Create a file named `.env` in `lms/frontend/` and configure the following:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

---

## 4. Running the Project Locally

### Install Dependencies
Run this command in the `lms/` root directory to install all packages:
```bash
npm install --prefix backend && npm install --prefix frontend && npm install
```

### Running Backend API & Worker
Start the Express server and local BullMQ workers:
```bash
cd backend
npm run dev
```
- **Port**: `http://localhost:3001`
- **Health Check**: `http://localhost:3001/api/health`

*Note: If `REDIS_URL` is empty/missing, the backend connection automatically falls back to an in-memory queue (`ioredis-mock`). If a `REDIS_URL` is configured, it will listen for incoming background jobs.*

### Running Frontend
Start the Vite development server in another terminal window:
```bash
cd frontend
npm run dev
```
- **URL**: `http://localhost:5173`

---

## 5. Linking Git and Pushing to a New Repository

To transfer this project and keep it connected to your GitHub repository:

1. **Initialize Git (if not already done)**:
   ```bash
   git init
   ```
2. **Link to your Github Repository**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
3. **Commit your files**:
   ```bash
   git add .
   git commit -m "Initial commit of Genesis Project"
   ```
4. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

Every time you commit and run `git push origin main`, your GitHub repository will be updated.

---

## 6. Configuring Vercel Continuous Deployment (CI/CD)

Vercel provides automatic deployments on every `git push`. To set this up:

1. **Log in to Vercel**: Go to [vercel.com](https://vercel.com) and link your GitHub account.
2. **Import Project**: Click **"Add New"** > **"Project"** and import the GitHub repository you just pushed.
3. **Configure Project Settings**:
   - **Framework Preset**: Other / Node.js
   - **Root Directory**: `lms`
   - **Build Command**: `npm run build:backend && npm run build:frontend`
   - **Output Directory**: `frontend/dist` (Vite's build output folder)
4. **Configure Environment Variables**:
   Add all key-value pairs from your backend and frontend `.env` files into the Vercel **Environment Variables** panel. (Ensure VITE prefix is used on frontend variables so they are accessible at build time).
5. **Deploy**: Click **Deploy**. Vercel will trigger a build, construct the React bundle, register the Express API serverless functions, and host the site.

Once set up, **any push to the `main` branch will automatically trigger a Vercel rebuild and deploy the updates instantly.**

---

## 7. Crucial Architectural Note: Background Workers

Because Vercel hosts code on **Serverless Functions** (which shut down after a request completes), it **cannot run long-lived, persistent background listeners (workers)**. 

### How Textbook Parsing Works:
1. When a textbook upload or reprocess is requested, the Vercel API function pushes a parsing job into the **Upstash Redis queue** (`uploadQueue`) and returns `202 Accepted` to the teacher frontend.
2. To consume and process this job (download PDF, extract text, trigger Gemini AI formatting, rank YouTube videos), **a persistent process must be running**.
3. **To run this process**: Simply keep the backend running locally (`npm run dev` in the `backend` folder) on your machine or host it on a small VM/container (e.g. Render, Railway, AWS ECS) with the production `.env` config. The local instance will connect to the pg-boss queue in Postgres, fetch the textbook job, perform the intensive processing, log updates directly to the database, and update status to `ready`.
