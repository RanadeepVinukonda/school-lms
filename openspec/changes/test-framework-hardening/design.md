## Context

The test suite in `lms/backend/src/__tests__/` has 27 test files. After the production-hardening change deleted the database adapter layer, 8 test files that mocked `../database/adapter` were commented out (their mocks referenced a deleted module). The remaining test files use inconsistent mocking patterns: some mock before imports, some after; some use `@jest/globals`, some don't; async handling varies; teardown is missing from most suites. The CI runs `npm test -- --forceExit --detectOpenHandles --bail`, which masks underlying issues like dangling handles and unresolved promises.

Current problems:
- No global test setup file — logger, env vars, common mocks are duplicated per file
- Mock ordering is inconsistent — some files import before mocking (breaks with `--detectOpenHandles`)
- Adapter-dependent tests commented out after deletion — need supabase-based mocks
- No shared mock factory — each file reinvents database mock objects
- afterEach cleanup (timers, env vars) missing from 90% of suites
- CI flags mask root causes instead of fixing them

## Goals / Non-Goals

**Goals:**
- All 27 test files pass with `npx jest --forceExit --detectOpenHandles --bail` in CI
- Shared `__tests__/setup.ts` loads before every test file (via jest.config `setupFilesAfterEnv`)
- Adapter-reliant tests rewritten to mock `getSupabaseClient`/`getSupabaseAdmin` from `../services/supabase`
- Every test file follows the template: `@jest/globals` imports, `jest.mock()` first, `jest.clearAllMocks()` in `beforeEach`, proper async await, `afterEach` cleanup
- Database mocks use factory functions (not inline objects) for consistency
- CI test job is the single source of truth for test flags

**Non-Goals:**
- Production code changes (services, routes, controllers remain untouched)
- Adding new test coverage (existing coverage is restored, not expanded)
- Changing the test runner (Jest stays, no migration to vitest or mocha)
- Frontend or mobile tests (scope is `lms/backend` only)

## Decisions

1. **Global setup via `setupFilesAfterEnv` over manual imports**
   - Jest's `setupFilesAfterEnv` runs after the test framework is in place, allowing `jest.mock()` calls. Alternative (`setupFiles`) runs before the framework — can't call `jest.mock()`. Each test file still needs its own `jest.mock()` for module-level mocks, but common mocks (logger) live in setup.ts.
   - *Alternative considered*: Inline logger mock in every file. Rejected — 27 copies to maintain.

2. **`getSupabaseClient`/`getSupabaseAdmin` mock over database adapter mocks**
   - The adapter layer is gone, services now import `getSupabaseClient` from `../services/supabase`. Tests must mock at that level.
   - Mock implementation returns a `{ from: () => ({ select, eq, ... }) }` chain.

3. **Factory functions over inline mock objects**
   - Each test file needs a fresh mock per test. Factory functions (`createMockSupabase()`, `createMockQuery()`) encapsulate the mock structure and can be customized per test via overrides.
   - *Alternative considered*: Top-level mock objects with `mockReturnValue` per test. Rejected — shared mutable state between tests causes flakiness.

4. **Commented-out tests restored, not deleted**
   - The 8 commented-out adapter tests are the only coverage for critical services (user, attendance, assignments, etc.). Restoring them with supabase mocks preserves baseline coverage.

5. **`ts-jest` with `diagnostics: false` stays**
   - Existing config. Avoiding ts strictness issues in tests keeps the migration focused. Diagnostics can be enabled later when the test suite stabilises.

## Risks / Trade-offs

- [Unrestored commented tests] → Some adapter-mocked tests may be too complex to rewrite in one pass. Acceptable to leave commented with `// ponytail: needs supabase mock` — tracked in tasks.
- [Mock surface area] → Services use many supabase query patterns (`.select`, `.eq`, `.in`, `.order`, `.limit`, `.single`). The mock factory must cover all used methods or tests will fail at runtime. Mitigation: read each service file to enumerate used patterns before writing mocks.
- [Global setup vs. file isolation] → Shared mocks in setup.ts reduce duplication but create hidden dependencies. If a test needs a custom logger mock, it must override in its own file. Mitigation: setup.ts mocks are minimal (logger, env vars) — everything else is per-file.

## Migration Plan

1. Create `src/__tests__/setup.ts` with global logger mock and env var defaults
2. Update `jest.config.js` to add `setupFilesAfterEnv`
3. Create mock factory helpers in `src/__tests__/helpers/mock-factory.ts`
4. Rewrite 8 commented-out adapter test files 1 by 1 with supabase mocks
5. Audit remaining 19 test files for template compliance
6. Update CI config test step flags
7. Run full suite and fix failures
8. Lock pass: verify all files match `@jest/globals`, mock ordering, cleanup patterns
