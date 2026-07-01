## Context

The web frontend at `lms/frontend/` is complete (90+ pages). An Expo skeleton exists at `lms/mobile/` with only 4 screens. Backend has no search, no LMS integration, and only fee ERP. Languages are English + Telugu only. No performance CI.

## Goals / Non-Goals

**Goals:**
- Port all core student/teacher/parent pages to React Native (Expo) in three separate app projects
- Add Elasticsearch-powered search across curriculum, textbooks, concepts, and learning content
- Support Google Classroom roster sync (via Google Classroom API) and Moodle LTI 1.3 launch + grade passback
- Add Transport, Inventory, and HR ERP modules with CRUD APIs and admin UI pages
- Extend AI Tutor and UI labels to Hindi, Tamil, Kannada
- Add Lighthouse CI with perf budgets to the deployment pipeline

**Non-Goals:**
- Full offline mode for mobile (single sync)
- Native push notifications for mobile (uses FCM from web PWA already)
- Real-time vehicle tracking for transport (manual route/stop management only)

## Decisions

1. **Separate Expo apps per role** rather than a single multi-tab app — keeps bundles small and role-specific, avoids excessive runtime role checks. Each shares a common `shared/` package for types and API client.
2. **Elasticsearch as a sidecar** — a new Node.js `search` service with its own Docker container, indexed via CDC-like triggers from Supabase. Avoids coupling the main backend to ES.
3. **LTI 1.3 over Basic LTI** — Moodle requires LTI 1.3 Advantage for grade passback. Uses the `lti-1-3` npm package. Google Classroom uses the official `googleapis` package with service account auth.
4. **ERP modules follow existing fee module pattern** — Supabase tables + service files + Zod-validated routes + admin UI pages, consistent with the current codebase style.
5. **AI Tutor language prompts** — extends existing `language` column in `ai_tutor_sessions`, with a new `i18n/` translations map at `lms/frontend/src/i18n/` for UI labels.
6. **Lighthouse CI** uses `@lhci/cli` GitHub Action with budgets for LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms.

## Risks / Trade-offs

- [Expo build pipeline] → Requires EAS credentials and `eas build` setup; slow first build. Mitigation: document setup steps.
- [Elasticsearch memory] → ES JVM heap can be heavy. Mitigation: use Elasticsearch Docker with 512MB limit, run on demand.
- [Mobile porting effort] → 90+ web pages → React Native is the bulk of this change. Mitigation: prioritize student app first, then teacher, then parent.
- [LTI 1.3 key management] → Requires platform registration with Moodle instances. Mitigation: document registration steps; make LTI optional via env var.
