# School LMS — Architecture Diagrams

## 1. System Context (C4 Level 1)

```mermaid
graph TB
    subgraph Users
        T[Teacher]
        S[Student]
        A[Admin / Super Admin]
        P[Parent]
    end

    subgraph "Frontend Platforms"
        WEB["React SPA on Vercel"]
        MOBILE["Expo RN Apps Student/Teacher/Parent"]
    end

    subgraph "Backend Services"
        API["Express API on Render / Docker"]
        INNGEST["Inngest Background Jobs"]
        WORKER["Textbook Pipeline Worker"]
    end

    subgraph "External Services"
        SUPABASE["Supabase PostgreSQL + Auth"]
        GEMINI["Gemini AI / OpenRouter"]
        CLOUDINARY["Cloudinary File Uploads"]
        SENTRY["Sentry Error Tracking"]
    end

    T --> WEB
    S --> WEB
    A --> WEB
    P --> WEB
    T --> MOBILE
    S --> MOBILE
    P --> MOBILE

    WEB --> API
    MOBILE --> API
    API --> SUPABASE
    API --> GEMINI
    API --> CLOUDINARY
    API --> SENTRY
    API --> INNGEST
    INNGEST --> WORKER
    WORKER --> SUPABASE
    WORKER --> GEMINI
```

## 2. Backend Architecture (Express.js)

```mermaid
graph TB
    subgraph "Middleware Stack (app.ts)"
        REQ[Request] --> REQID[requestId]
        REQID --> NONCE[nonce]
        NONCE --> SEC[securityHeaders]
        SEC --> CORS[cors]
        CORS --> JSON[express.json]
        JSON --> METRICS[metricsMiddleware]
        METRICS --> TIMEOUT[timeoutMiddleware]
        TIMEOUT --> PREFIX["/api strip"]
        PREFIX --> LOG[requestLogger]
        LOG --> SANITIZE[sanitizeInput]
        SANITIZE --> CSRF[csrfProtection]
        CSRF --> RATE[rateLimit]
        RATE --> ROUTES[routes]
        ROUTES --> ERROR[errorHandler]
    end

    subgraph "Route Modules"
        AUTH["/auth routes"]
        SCHOOL["/ school module"]
        ACAD["/ academics module"]
        CONT["/ content module"]
        FIN["/ finance module"]
        HR["/ hr module"]
        INFRA["/ infrastructure module"]
    end
    ROUTES --> AUTH
    ROUTES --> SCHOOL
    ROUTES --> ACAD
    ROUTES --> CONT
    ROUTES --> FIN
    ROUTES --> HR
    ROUTES --> INFRA

    subgraph "Route-Controller-Service Pattern"
        RT[Route] --> CT[Controller]
        CT --> SR[Service Layer]
        SR --> DB["(Supabase PostgreSQL)"]
    end

    subgraph "Service Layer (~82 services)"
        S1[textbook.service]
        S2[exam-v2.service]
        S3[quiz-v2.service]
        S4[ai.service]
        S5[ai-question-generator.service]
        S6[auth.service]
        S7[user.service]
        S8[class.service]
        S9[attendance.service]
        S10[fee.service]
        S11[grade.service]
        S12[assignment.service]
        S13[notification.service]
        S14[concept-questions.service]
        S15[question-bank.service]
        S16[concept-progress.service]
        S17[content-publishing.service]
        S18[... 65 more services]
    end

    SR --- S1
    SR --- S2
    SR --- S3
    SR --- S4
    SR --- S5
    SR --- S6
    SR --- S7
    SR --- S8
    SR --- S9
    SR --- S10
    SR --- S11
    SR --- S12
    SR --- S13
    SR --- S14
    SR --- S15
    SR --- S16
    SR --- S17
    SR --- S18

    subgraph "Background Jobs"
        Q[Inngest Queue]
        SCHED[scheduler.ts]
        WP["worker.ts Textbook Pipeline"]
        REM[sendReminders.job]
        CLEAN[cleanupExpired.job]
        REP[generateReports.job]
    end
    Q --> WP
    SCHED --> REM
    SCHED --> CLEAN
    SCHED --> REP

    subgraph "Config and Utils"
        ENV["config/env.ts Zod-validated"]
        LOGGER["config/logger.ts Winston"]
        SWAGGER[config/swagger.ts]
        ERRORS["utils/errors.ts AppError hierarchy"]
        RESPONSE[utils/response.ts]
        PAG[utils/pagination.ts]
        BASE["lib/base-service.ts Generic CRUD"]
        TM[database/transaction-manager.ts]
    end
```

## 3. Frontend Architecture (React)

```mermaid
graph TB
    subgraph "App Entry"
        MAIN[main.tsx] --> APP[App.tsx]
        APP --> AUTHGATE[AuthGate]
        AUTHGATE --> ROUTER[RouterProvider]
        APP --> CONTEXT[ClassScopeProvider]
        APP --> OFFLINE[OfflineStatusBar]
        APP --> UPLOAD[UploadProgressBanner]
        APP --> PWA[PWAInstallPrompt]
        APP --> NOTIF[PushNotificationManager]
    end

    subgraph "State Management (Zustand)"
        ST_AUTH["authStore user, token, role"]
        ST_CHAT["chatStore conversations"]
        ST_LANG["languageStore i18n locale"]
        ST_NOTIF["notificationStore alerts"]
        ST_UI["uiStore sidebar, modals"]
        ST_UPLOAD["uploadStore progress queue"]
    end

    subgraph "Router (React Router v6)"
        RTR[createBrowserRouter]
        RTR --> PUBLIC["Public Routes Welcome, Login"]
        RTR --> STUDENT["Student Routes ~30 pages"]
        RTR --> TEACHER["Teacher Routes ~33 pages"]
        RTR --> ADMIN["Admin Routes ~22 pages"]
        RTR --> PARENT["Parent Routes ~6 pages"]
        RTR --> K2["K2 Pre-Primary ~5 pages"]
        STUDENT --> SL[StudentLayout]
        TEACHER --> TL[TeacherLayout]
        ADMIN --> AL[AdminLayout]
        PARENT --> PL[ParentLayout]
    end

    subgraph "Component Library"
        COMMON["common/ LoadingSkeleton, SplashScreen, ErrorBoundary, PWAInstall"]
        UI["ui/ Buttons, Inputs, Modals, Cards, Tabs, Table"]
        LAYOUT["layout/ Sidebar, Header, Navbar"]
    end

    subgraph "Feature Components"
        TEXTBOOK["textbook/ UploadProgress, Viewer"]
        CODING["coding/ CodeEditor, StreamProject"]
        VLABS["virtual-labs/ LabSimulator"]
        MINDMAP["mindmap/ Editor, Viewer"]
        OCR["ocr/ Scanner, Viewer"]
        GAMIFICATION["gamification/ Leaderboard, Badges"]
        ASSESS["assessment/ QuizAttempt, ExamCorrection"]
        NEP["nep-questions/ NEPQuestionBuilder"]
        STUDENT_CPNTS["student/ ConceptCard, VideoCard"]
        TEACHER_CPNTS["teacher/ GradeBook, Analytics"]
    end

    subgraph "API Layer"
        API["api.ts Axios Instance"]
        API --> REQ_INT["Request Interceptor Bearer Token + CSRF"]
        API --> RES_INT["Response Interceptor 401 -> Refresh -> Retry"]
        API_SVC["~30 service files authService, textbookService, ..."]
    end

    subgraph "Types"
        TYPES["types/ 17 type files"]
        TYPES --> U[user.ts]
        TYPES --> TB[textbook.ts]
        TYPES --> E[exam.ts]
        TYPES --> Q[quiz.ts]
        TYPES --> ASS[assignment.ts]
        TYPES --> AUTH[auth.ts]
        TYPES --> OCR_T[ocr.ts]
    end

    subgraph "i18n"
        I18N["i18n/ en, hi, te, ta, kn"]
    end
```

## 4. Database Entity Relationships

```mermaid
erDiagram
    schools ||--o{ users : "belongs to"
    schools ||--o{ classes : "contains"
    schools ||--o{ subjects : "offers"

    users ||--o{ enrollments : "enrolled"
    users ||--o{ attendance : "marked"
    users ||--o{ submissions : "submitted"
    users ||--o{ device_tokens : "owns"

    classes ||--o{ enrollments : "has"
    classes ||--o{ attendance : "tracks"
    classes ||--o{ assignments : "assigned to"
    classes ||--o{ exams : "scheduled for"
    classes ||--o{ concept_releases : "releases to"

    subjects ||--o{ textbooks : "categorized as"
    subjects ||--o{ assignments : "for"
    subjects ||--o{ exams : "for"

    textbooks ||--o{ chapters : "contains"
    textbooks ||--o{ raw_pages : "has"
    textbooks ||--o{ processing_jobs : "tracks"

    chapters ||--o{ concepts : "contains"

    concepts ||--o{ concept_notes : "has"
    concepts ||--o{ concept_questions : "has"
    concepts ||--o{ concept_videos : "has"
    concepts ||--o{ concept_resources : "has"
    concepts ||--o{ concept_progress : "tracked by"
    concepts ||--o{ concept_releases : "released"

    assignments ||--o{ submissions : "receives"
    exams ||--o{ corrections : "graded by"
    quizzes ||--o{ quiz_attempts : "attempted"

    fee_structures ||--o{ fee_payments : "paid for"
    transport_routes ||--o{ transport_stops : "has"
    transport_routes ||--o{ transport_assignments : "assigned"

    inventory_items ||--o{ inventory_transactions : "recorded"
    employees ||--o{ payroll : "receives"
    employees ||--o{ leave_requests : "requests"

    schools {
        uuid id PK
        text name
        text subdomain UK
        text plan
        timestamp created_at
    }

    users {
        uuid id PK
        text email
        text role "student|teacher|admin|parent"
        text display_name
        uuid school_id FK
        uuid class_id FK
        text student_id
        boolean is_active
        timestamp deleted_at "soft delete"
    }

    textbooks {
        uuid id PK
        text title
        uuid subject_id FK
        uuid class_id FK
        uuid teacher_id FK
        text storage_path
        text pdf_url
        text status "processing|ready|failed"
        int chapter_count
        int total_concepts
        int completed_concepts
        text failure_reason
        jsonb logs
    }

    chapters {
        uuid id PK
        uuid textbook_id FK "CASCADE"
        text title
        int order
        text summary
    }

    concepts {
        uuid id PK
        uuid chapter_id FK "CASCADE"
        uuid textbook_id FK "CASCADE"
        text title
        int order
        jsonb video_links
    }

    concept_questions {
        uuid id PK
        uuid concept_id FK "SET NULL"
        uuid textbook_id FK "CASCADE"
        uuid chapter_id FK
        text question
        text type "mcq|true_false|fill_blank|matching|numerical|descriptive|short_answer"
        text difficulty "easy|medium|hard"
        jsonb options
        text answer
        text explanation
        text bloom_level "Remember|Understand|Apply|Analyze|Evaluate|Create"
        boolean hots
        text topic
        text source "AI Textbook Upload"
    }

    concept_notes {
        uuid id PK
        uuid concept_id FK "SET NULL"
        uuid textbook_id FK "CASCADE"
        text summary
        text notes
        text key_points
        text formulas
        vector embedding "384-dim"
    }

    concept_releases {
        uuid id PK
        uuid class_id FK "CASCADE"
        uuid textbook_id FK "CASCADE"
        uuid chapter_id FK "CASCADE"
        uuid concept_id FK "CASCADE"
        uuid teacher_id FK "CASCADE"
        boolean question_bank_released
        boolean assignments_released
        boolean mind_map_released
        boolean completed
    }

    processing_jobs {
        uuid id PK
        uuid textbook_id FK "CASCADE"
        text status
        int progress
        text current_step
        text error
    }
```

## 5. Infrastructure and Deployment

```mermaid
graph TB
    subgraph GitHub
        REPO[school-lms Repo]
        ACTIONS[GitHub Actions]
        SECRETS[Secrets and Env Vars]
    end

    subgraph "Hosting"
        subgraph Vercel
            VITE[Vite Build]
            SPA["React SPA school-lms-nine-phi.vercel.app"]
            REWRITE["/api/* points to Render"]
        end

        subgraph Render
            EXPRESS["Express API school-lms-api-b8cn.onrender.com"]
            INNGEST_SVC[Inngest Server]
        end

        subgraph "Docker (Self-Hosted)"
            DC[docker-compose.yml]
            BE_DOCKER["Backend port 4000"]
            FE_DOCKER["Frontend Nginx port 80"]
            PGB["PgBouncer port 6432"]
            PG["PostgreSQL port 5432"]
        end
    end

    subgraph "External Dependencies"
        SUPABASE["Supabase PostgreSQL + Auth jfqpukpzgmzwzzjrcxra"]
        GEMINI["Gemini API / OpenRouter"]
        CLOUDINARY["Cloudinary Image/File Storage"]
        SENTRY_IO["Sentry Error Tracking"]
        INNGEST_CLOUD["Inngest Cloud Job Queue"]
    end

    ACTIONS --> DEPLOY_BACKEND[Deploy Backend]
    ACTIONS --> DEPLOY_FRONTEND[Deploy Frontend]
    DEPLOY_BACKEND -->|RENDER_DEPLOY_HOOK| EXPRESS
    DEPLOY_FRONTEND -->|Vercel CLI| SPA

    EXPRESS --> SUPABASE
    EXPRESS --> GEMINI
    EXPRESS --> CLOUDINARY
    EXPRESS --> SENTRY_IO
    EXPRESS --> INNGEST_CLOUD

    SPA -->|axios /api/*| EXPRESS

    DC --> BE_DOCKER
    DC --> FE_DOCKER
    BE_DOCKER --> PGB
    PGB --> PG
    BE_DOCKER --> GEMINI
    BE_DOCKER --> CLOUDINARY

    subgraph "Deploy Workflows"
        WF1[".github/workflows/render-deploy.yml curl to Render Deploy Hook"]
    end
    ACTIONS --> WF1
```

## 6. Textbook Processing Pipeline

```mermaid
sequenceDiagram
    participant Teacher
    participant UI as Frontend
    participant API as Backend API
    participant Worker as Pipeline Worker
    participant AI as Gemini AI
    participant DB as Supabase

    Teacher->>UI: Upload PDF
    UI->>API: POST /textbooks (multipart)
    API->>DB: Insert textbook row (status: uploaded)
    API->>DB: Upload PDF to storage
    API->>+Worker: Inngest: textbook/pipeline.start

    Worker->>DB: Download PDF
    Worker->>Worker: PDF Parse (pdf-parse)
    Worker->>DB: Save raw_pages (batched)
    Worker->>DB: Update progress (15%)

    Worker->>AI: chatCompletion (TOC extraction)
    AI-->>Worker: JSON: chapters + concepts
    Worker->>DB: Delete old chapters
    Worker->>DB: Insert chapters + concepts
    Worker->>DB: Update progress (25%)

    loop For each concept
        Worker->>DB: Fetch matching raw_pages
        par Parallel AI tasks
            Worker->>AI: Generate Notes
            Worker->>AI: Generate Questions (mixed diff + HOTS)
            Worker->>Worker: Rank Videos (yt-search)
            Worker->>Worker: Rank Resources
            Worker->>Worker: Generate Embeddings
        end
        Worker->>DB: Insert concept_notes
        Worker->>DB: Insert concept_questions (28 per concept)
        Worker->>DB: Insert concept_videos
        Worker->>DB: Insert concept_resources
        Worker->>DB: Increment completed_concepts
        Worker->>DB: Update progress (25-100%)
    end

    Worker->>DB: Update textbook status: ready
    Worker-->>API: Complete
    API-->>UI: WebSocket / Poll: done
    UI-->>Teacher: Textbook ready
```

## 7. Request Lifecycle (API)

```mermaid
sequenceDiagram
    participant Client
    participant LB as RateLimit
    participant MW as Middleware Stack
    participant CTX as ClassAccess
    participant Router
    participant Controller
    participant Service
    participant DB as Supabase

    Client->>LB: HTTP Request
    LB->>MW: authRateLimit (pass)
    MW->>MW: requestId -> UUID
    MW->>MW: nonce -> CSP nonce
    MW->>MW: securityHeaders
    MW->>MW: cors (origin check)
    MW->>MW: metrics (start timer)
    MW->>MW: timeoutMiddleware (30s)
    MW->>MW: /api prefix strip
    MW->>MW: requestLogger
    MW->>MW: sanitizeInput
    MW->>MW: csrfProtection (state-changing)
    MW->>Router: Route matched

    Router->>Router: auth.middleware: JWT verify
    Router->>Router: role.middleware: role check
    Router->>Router: class-access.middleware
    Router->>CTX: attach req.user
    Router->>Controller: Handler

    Controller->>Service: Business logic
    Service->>DB: Supabase query
    DB-->>Service: Data
    Service-->>Controller: Result
    Controller-->>Router: sendSuccess()
    Router-->>MW: Response
    MW->>MW: metrics (record duration)
    MW-->>Client: JSON Response
```

## 8. AI Service Architecture

```mermaid
graph TB
    subgraph "Entry Points"
        CC[chatCompletion General AI]
        TCC[textbookChatCompletion Textbook AI]
    end

    subgraph Providers
        subgraph "Gemini Provider"
            GEM1[geminiChatCompletion model: gemini-2.0-flash]
            GEM2["Dynamic timeout max(60s, tokens*8)"]
            GEM3["JSON mode responseMimeType"]
            GEM4["Retry: 2 attempts exp backoff"]
            GEM5[Safety filter check]
        end

        subgraph "OpenAI/OpenRouter Provider"
            OAI1[openaiChatCompletion model: gpt-4o-mini]
            OAI2["JSON mode response_format"]
            OAI3["Model fallback to openrouter/free"]
            OAI4["Retry: 2 attempts"]
        end
    end

    subgraph "Circuit Breaker"
        CB[circuitBreaker.middleware]
        CB_STATE["Map name, CircuitState failures, isOpen, halfOpen"]
        CB_THRESHOLD["Threshold: 3 failures"]
        CB_RESET["Reset: 30s cooldown"]
        CB_HALF["Half-open: 5s probe"]
    end

    subgraph "AI Services"
        QGEN["ai-question-generator.service Generate questions via AI"]
        GRAD["ai-grading.service Auto-grade answers"]
        TUTOR["ai-tutor.service Conversational tutor"]
        LEVEL["ai-level.service Difficulty assessment"]
    end

    CC --> GEM1
    CC --> OAI1
    TCC --> GEM1
    TCC --> OAI1

    GEM1 --> CB
    OAI1 --> CB

    CB --> QGEN
    CB --> GRAD
    CB --> TUTOR
    CB --> LEVEL
```
