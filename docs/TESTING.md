# Testing

How to run and reason about tests across the monorepo.

## Backend (`lms/backend`)

Jest + ts-jest + Supertest. Unit tests and integration tests coexist in
`src/__tests__/`.

```bash
cd lms/backend
npm install
npm test                 # run all tests (--forceExit)
npm run test:watch       # watch mode
npm run test:coverage    # coverage report
npm run lint             # ESLint
npm run build            # TypeScript compile check (no emit)
```

Notes:

- Integration tests expect a Postgres service. Use the Docker test stack:
  `docker-compose -f ../../docker-compose.test.yml up -d` (test-db on 5433,
  test-redis on 6380), or the GitHub Actions service (`postgres:16`, db `lms_test`).
- Tests use the `test` NODE_ENV (Zod allows mock values, CSRF disabled).
- Full test inventory: [`docs/COMPREHENSIVE_TEST_LIST.md`](COMPREHENSIVE_TEST_LIST.md).

## Frontend (`lms/frontend`)

Vitest + @testing-library/react for unit tests; Playwright for E2E.

```bash
cd lms/frontend
npm install
npx vitest run           # unit tests
npx playwright test      # E2E (needs a running backend; see playwright.config.ts)
npm run lint
npm run build            # TS + Vite build check
```

## CI

`.github/workflows/ci.yml` runs lint + typecheck + tests for the backend on
push to `main`/`develop` and PRs to `main` (Postgres 16 service container).

## Load tests

`tests/load/smoke.js` — basic smoke against a deployed instance.

## Writing tests

- Backend: mirror existing suites in `src/__tests__/` (unit/ vs integration/).
- Use Supertest against the exported `app` (not the listening server).
- Never require real Supabase/Cloudinary keys — the `test` env supplies mocks.
- Frontend: prefer testing behavior via `@testing-library/react` (queries by
  role/label), not implementation details.