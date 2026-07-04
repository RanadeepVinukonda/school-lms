## Why

Genesis is a functional but incomplete LMS — many features exist as stubs, are disconnected from the frontend, or lack the production-grade quality needed to serve thousands of schools. Transforming it into a multi-tenant, AI-powered adaptive learning ecosystem requires closing these gaps across security, infrastructure, educational features, and mobile delivery before it can scale commercially.

## What Changes

1. **Architectural stabilization** — register all orphaned routes/pages, fix v1/v2 API mismatches, eliminate duplicate storage patterns, enable TypeScript strict mode
2. **Security hardening** — add RLS, tenant isolation, RBAC/ABAC, JWT rotation, MFA, full audit logging, security headers, rate limiting, and input validation on every route
3. **Production readiness** — Docker, Docker Compose, CI/CD, health checks, structured logging, distributed tracing, error tracking, monitoring dashboards, disaster recovery
4. **Multi-tenant SaaS architecture** — `tenant_id` on all entities, per-school isolation, tenant-aware auth/authz/analytics, branding, onboarding, billing, and subscription plans
5. **Adaptive learning engine** — track accuracy/speed/confidence/retention/mastery, auto-adjust difficulty, recommend content, schedule revision, detect mastery
6. **Curriculum intelligence** — CBSE/ICSE/State/Cambridge board support, publisher catalogues (NCERT, Oxford, Pearson), Board→Grade→Subject→Chapter→Concept hierarchy
7. **OCR and textbook AI** — photo→OCR→concept detection→question generation (MCQ, HOTS, fill-in, match, viva, worksheet, olympiad) at multiple difficulty levels
8. **AI tutor** — text and voice chat, step-by-step explanations, personalized hints, bilingual (English/Telugu) responses
9. **Analytics engine** — student mastery/time/weakness analytics, teacher class gap analytics, school benchmarking and grade comparison
10. **Pre-primary learning** — rhymes, stories, tracing, phonics, numeracy for Nursery/LKG/UKG
11. **STREAM education** — science/tech/engineering/art/math projects, simulations, and assessments
12. **Skill development** — coding, robotics, electronics, circuits, biology/mechanical labs
13. **Gamification** — XP, coins, badges, levels, daily/weekly/monthly challenges, leaderboards
14. **Virtual labs** — physics, chemistry, biology simulations and interactive experiments
15. **School ERP** — fees, transport, HR, payroll, inventory, library, timetable, events, notices
16. **Mobile experience** — Android/iOS production apps with offline mode, push notifications, background sync, low-bandwidth optimization
17. **Quality engineering** — unit/integration/E2E/load/security tests; backend >90%, frontend >85%, E2E >80% coverage
18. **Complete student/teacher/parent/admin feature sets** — adaptive quizzes, personalized learning paths, AI lesson planner, parent reports, school analytics

## Capabilities

### New Capabilities

- `multi-tenant-saas`: Per-school tenant isolation — `tenant_id` on all entities, tenant-aware auth, analytics, branding, onboarding, billing, subscription plans, provisioning
- `security-hardening`: RLS, RBAC/ABAC, JWT rotation, MFA, audit logging, CSP, CSRF, XSS, SQL injection protection, rate limiting, secrets management
- `production-infra`: Docker, Docker Compose, CI/CD pipelines, health/readiness/liveness probes, structured logging, distributed tracing, error tracking, monitoring, backups, disaster recovery
- `adaptive-learning-engine`: Mastery tracking (accuracy, speed, confidence, retention), difficulty auto-adjustment, content recommendation, revision scheduling, mastery detection
- `curriculum-intelligence`: Multi-board support (CBSE/ICSE/State/Cambridge), publisher catalogues, Board→Concept hierarchy, curriculum planning
- `ocr-textbook-ai`: Photo→OCR→concept detection→question generation pipeline at all difficulty levels
- `ai-tutor`: Text/voice chat AI tutor with step-by-step explanations, personalized hints, bilingual (English/Telugu) support
- `analytics-engine`: Student, teacher, and school-level analytics dashboards with mastery scores, gap detection, benchmarking
- `pre-primary-learning`: Interactive learning for Nursery/LKG/UKG — rhymes, stories, tracing, phonics, numeracy
- `stream-education`: STREAM project-based learning with simulations and assessments
- `skill-development`: Coding, robotics, electronics, circuits, biology/mechanical lab modules
- `virtual-labs`: Physics, chemistry, biology simulations and interactive experiments
- `school-erp`: Fees, transport, HR, payroll, inventory, library, timetable, events, calendar, notices
- `mobile-experience`: Production Android/iOS apps with offline mode, push notifications, background sync, Lighthouse >95
- `quality-engineering`: Comprehensive test suites achieving backend >90%, frontend >85%, E2E >80% coverage

### Modified Capabilities

- `gamification`: Extend existing gamification (XP/coins/badges/levels) with daily/weekly/monthly challenges and leaderboards
- `notification-system`: Add push notification delivery (FCM/APNs) to the existing in-app notification system
- `assignment-system`: Complete v2 assignment engine with adaptive question generation, AI grading, and rubric support

## Impact

- **Backend**: All `lms/backend/src/` services, controllers, middlewares — new modules added, existing refactored for multi-tenancy
- **Frontend**: All `lms/frontend/src/` pages — register orphaned routes, complete feature pages, add mobile-responsive layouts
- **Database**: Schema additions for `tenant_id`, new tables for adaptive engine, curriculum, ERP, virtual labs
- **Infrastructure**: New `docker/`, `ci/`, `.github/workflows/` directories; environment configuration for all environments
- **Mobile**: New `lms/mobile/` directory for React Native or PWA implementation
- **Dependencies**: New packages for AI (OpenAI/Gemini SDK), OCR (Tesseract.js), push notifications (FCM), mobile (React Native or Capacitor), monitoring (OpenTelemetry, Sentry)
