## 1. Global Test Setup

- [x] 1.1 Create `src/__tests__/setup.ts` with global logger mock (`jest.mock('../utils/logger')`) and env var defaults (`NODE_ENV=test`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- [x] 1.2 Update `jest.config.js` to add `setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']`

## 2. Mock Factory Helpers

- [x] 2.1 Create `src/__tests__/helpers/mock-factory.ts` with `createMockSupabase()` — returns object with `.from()` method returning query chain supporting `.select()`, `.eq()`, `.in()`, `.order()`, `.limit()`, `.single()`, `.maybeSingle()`, `.insert()`, `.update()`, `.delete()`, `.neq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`, `.contains()`, `.filter()`, `.count()`
- [x] 2.2 Ensure default mock resolves to `{ data: [], error: null }` for list queries and `{ data: null, error: null }` for single queries
- [x] 2.3 Add `createMockLogger()` factory returning `{ info, warn, error, debug }` as jest.fn()

## 3. Restore Commented-Out Adapter Tests (8 files)

- [ ] 3.1 Rewrite `src/__tests__/assignment.service.test.ts` — replace `jest.mock('../database/adapter')` with `jest.mock('../services/supabase')`, uncomment test blocks, use `createMockSupabase()`
- [ ] 3.2 Rewrite `src/__tests__/concept-progress.service.test.ts` — same pattern
- [ ] 3.3 Rewrite `src/__tests__/gamification.service.test.ts` — same pattern
- [ ] 3.4 Rewrite `src/__tests__/grade.service.test.ts` — same pattern
- [ ] 3.5 Rewrite `src/__tests__/notification.service.test.ts` — same pattern
- [ ] 3.6 Rewrite `src/__tests__/remaining-services.test.ts` — same pattern
- [ ] 3.7 Rewrite `src/__tests__/teacher-class-subject.service.test.ts` — same pattern
- [ ] 3.8 Rewrite `src/__tests__/user.service.test.ts` — same pattern

## 4. Audit Active Test Files (19 files)

- [ ] 4.1 Audit `src/__tests__/admin-flow.test.ts` — verify mock ordering, async handling, cleanup
- [ ] 4.2 Audit `src/__tests__/ai-question-generator.test.ts` — same pattern
- [ ] 4.3 Audit `src/__tests__/api-contracts.test.ts` — same pattern
- [ ] 4.4 Audit `src/__tests__/attendance.service.test.ts` — same pattern
- [ ] 4.5 Audit `src/__tests__/auth.middleware.test.ts` — same pattern
- [ ] 4.6 Audit `src/__tests__/class-access.middleware.test.ts` — same pattern
- [ ] 4.7 Audit `src/__tests__/classroom.test.ts` — same pattern
- [ ] 4.8 Audit `src/__tests__/content-publishing.test.ts` — same pattern
- [ ] 4.9 Audit `src/__tests__/edge-cases.test.ts` — same pattern
- [ ] 4.10 Audit `src/__tests__/hr.service.test.ts` — same pattern
- [ ] 4.11 Audit `src/__tests__/inventory.service.test.ts` — same pattern
- [ ] 4.12 Audit `src/__tests__/lsp-contract.test.ts` — same pattern
- [ ] 4.13 Audit `src/__tests__/lti.test.ts` — same pattern
- [ ] 4.14 Audit `src/__tests__/search.test.ts` — same pattern
- [ ] 4.15 Audit `src/__tests__/transaction-manager.test.ts` — same pattern
- [ ] 4.16 Audit `src/__tests__/transformers.service.test.ts` — same pattern
- [ ] 4.17 Audit `src/__tests__/transport.service.test.ts` — same pattern
- [ ] 4.18 Audit `src/__tests__/unified-test-engine.test.ts` — same pattern
- [ ] 4.19 Audit `src/__tests__/vitals.test.ts` — same pattern

## 5. CI Configuration

- [ ] 5.1 Locate CI workflow file in `.github/workflows/` and ensure test step uses `npm test -- --forceExit --detectOpenHandles --bail`
- [ ] 5.2 Verify `package.json` has `"test": "jest"` script (add if missing)

## 6. Verification

- [ ] 6.1 Run `npx jest --forceExit --detectOpenHandles --bail` from `lms/backend/` and confirm zero failures
- [ ] 6.2 Verify no test file produces `TS2307` (cannot find module) errors
- [ ] 6.3 Verify all 27 test files are importable and executable (not commented out in whole)
