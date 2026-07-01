## Context

Genesis is a Next.js + Express.js LMS that has migrated from Firebase to Supabase but retains architectural debt: orphaned routes, duplicate data layers, no tenant isolation, and minimal production infrastructure. The codebase has ~55 backend services, ~50 frontend pages, and a Supabase PostgreSQL database. The comprehensive-codebase-audit change cleaned the backend data layer. This change builds the complete product vision on top of that stable foundation.

The platform targets Indian K-12 schools with multilingual support (English + Telugu), rural connectivity constraints, and curriculum alignment to CBSE/ICSE/State boards.

## Goals / Non-Goals

**Goals:**
- Transform Genesis into a production-ready multi-tenant SaaS platform serving thousands of schools
- Complete all 18 phases of the Genesis vision without breaking existing functionality
- Achieve measurable quality targets: Lighthouse >95, test coverage >90% backend, security score >95
- Support offline-capable mobile experience with low-bandwidth optimization
- Deliver adaptive learning, AI tutoring, OCR textbook processing, and curriculum intelligence

**Non-Goals:**
- Rebuilding already-working modules from scratch
- Changing the underlying PostgreSQL database schema beyond additive migrations
- Supporting non-Indian curricula in Phase 1
- Native Android/iOS apps (PWA + React Native are acceptable)

## Decisions

**1. Multi-tenancy via `school_id` column (not separate schemas)**
Add `school_id` (UUID) to every entity table. Row-level security policies enforce isolation at the database level. Application layer adds `school_id` to every query. This avoids schema-per-tenant complexity while providing strong isolation.

**2. Phased delivery — stabilize before expand**
Phase 1 (Arch + Security + Infra) must complete before Phase 4 (Multi-tenant) which must complete before Phase 5+ (Features). Each phase is independently deployable. No phase breaks existing functionality.

**3. Adaptive engine as a standalone service module**
`lms/backend/src/adaptive/` implements mastery tracking, difficulty adjustment, and recommendation. Services call into it rather than embedding adaptive logic in individual feature services. This keeps business logic in one place and makes the engine independently testable.

**4. AI capabilities via Gemini (existing) + OpenAI fallback**
The codebase already uses Gemini API (`GEMINI_API_KEY`). AI tutor and OCR question generation extend this. OpenAI is a secondary fallback. No new AI providers are added unless Gemini capabilities are insufficient.

**5. OCR via Tesseract.js (client-side) + Google Vision API fallback**
Textbook photo processing uses Tesseract.js for privacy-preserving client-side OCR. Google Vision API is the server-side fallback for complex layouts. Results feed into the existing textbook processing pipeline.

**6. Mobile as PWA first, React Native wrapper second**
The existing React frontend will be made PWA-capable (service worker, web manifest, offline cache) as the first mobile delivery. React Native (Expo) wraps the same API for app store distribution. This avoids maintaining two separate codebases.

**7. Tenant onboarding via admin provisioning, not self-service**
Schools are provisioned by the platform admin, not self-registered. This allows human review before granting access — appropriate for the Indian school market. Self-service signup is a Phase 2+ consideration.

**8. ERP as feature modules, not a separate application**
Fee management, timetable, and HR modules live within the Genesis monorepo as additional route groups in the existing Express backend. A separate ERP application would fragment the codebase and increase deployment complexity.

**9. Test strategy: Jest + Supertest (backend), Vitest + Testing Library (frontend), Playwright (E2E)**
Existing Jest setup is extended. Frontend tests use Vitest (already configured in many projects) and React Testing Library. E2E uses Playwright — it works better with Next.js than Cypress for this scale.

**10. Infrastructure: Docker Compose for local, GitHub Actions for CI/CD, deploy to Railway/Render**
Docker Compose provides local parity with production. GitHub Actions runs tests, builds images, and deploys. Railway or Render are cost-effective targets for a school SaaS product vs. AWS/GCP for the initial launch.

## Risks / Trade-offs

- **Risk: `school_id` migration breaks existing single-tenant data** → Mitigation: Add `school_id` as nullable, backfill with a default school ID, then enforce NOT NULL constraint in a follow-up migration
- **Risk: Adaptive engine adds latency to every assessment response** → Mitigation: Update mastery asynchronously via background job; return immediate response, update profile in background
- **Risk: OCR quality varies with handwritten content** → Mitigation: Clearly distinguish typed vs. handwritten input modes; handwritten OCR is a Phase 8+ enhancement
- **Risk: 18 phases is a very large scope with high regression risk** → Mitigation: Feature flags for every new module; trunk-based development with automated test gates; never delete working code
- **Risk: Bilingual AI responses may reduce quality for Telugu** → Mitigation: Default to English; Telugu responses use translation layer on top of English AI output, not native Telugu generation
- **Trade-off: PWA vs. native app** → PWA gives 85% of native capabilities at 30% of the development cost; acceptable for Phase 17 target
- **Trade-off: Monorepo vs. microservices** → Monorepo is correct for this stage; microservices would add deployment and debugging complexity without proportional benefit at current scale

## Migration Plan

1. **Phase 1**: Merge comprehensive-codebase-audit fixes (done). Register orphaned routes. Fix TypeScript strict mode violations. Remove dead code.
2. **Phase 2**: Add security middleware stack. Implement RBAC policy engine. Add audit log table + middleware.
3. **Phase 3**: Dockerize backend and frontend. Add GitHub Actions workflows. Add health check endpoints.
4. **Phase 4**: Add `school_id` column with nullable migration. Implement RLS policies. Update auth to include school context.
5. **Phase 5+**: Feature phases delivered in sprint increments, each with automated tests and feature flags.
6. **Rollback**: Every migration is reversible via Supabase migration rollback. Feature flags allow instant disable of any new module.

## Open Questions

- Which specific State Boards should Phase 7 (Curriculum Intelligence) support in v1?
- Should the AI tutor support real-time voice (WebRTC) or async voice (audio file upload) in Phase 9?
- What is the billing model — per-student, per-school, or flat fee per subscription tier?
- Should parent mobile experience be a separate app or a parent-specific view within the main app?
