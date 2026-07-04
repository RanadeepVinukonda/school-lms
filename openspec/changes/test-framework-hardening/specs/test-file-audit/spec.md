## ADDED Requirements

### Requirement: All test files follow the best-practices template
Every test file in `src/__tests__/*.test.ts` SHALL conform to the template structure:

1. `import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'`
2. Mock object declarations (typed per test)
3. All `jest.mock()` calls BEFORE any `import` statement for the module under test
4. Import the module under test
5. `describe` blocks with `beforeEach` containing `jest.clearAllMocks()`
6. `afterEach` cleanup for timers and env vars where applicable
7. Proper `async`/`await` on all async operations
8. Explicit `await` on Express request handlers that return promises

#### Scenario: jest.mock before imports
- **WHEN** a test file mocks a module
- **THEN** all `jest.mock()` calls SHALL appear before any static `import` statement for non-test utilities
- **THEN** the TypeScript compiler SHALL not produce `TS2307` errors about mocked modules

#### Scenario: beforeEach resets mocks
- **WHEN** each `describe` block runs
- **THEN** `jest.clearAllMocks()` SHALL be called in `beforeEach`
- **THEN** mock state SHALL NOT leak between tests

#### Scenario: afterEach cleans up
- **WHEN** each `it()` block completes
- **THEN** the test SHALL not leave open handles (timers, subscriptions, connections)
- **THEN** environment variables modified during the test SHALL be restored

### Requirement: Commented-out adapter tests restored using supabase mocks
The 8 test files that were commented out after adapter deletion SHALL be rewritten to mock `getSupabaseClient`/`getSupabaseAdmin` from `../services/supabase` instead of mocking `../database/adapter`.

#### Scenario: Adapter-mocked tests use supabase mocks
- **WHEN** a previously commented-out test executes
- **THEN** it SHALL use `jest.mock('../services/supabase', () => ({ ... }))` instead of `jest.mock('../database/adapter', ...)`
- **THEN** the mock SHALL use the factory function from `mock-factory.ts`
- **THEN** the test SHALL compile and pass without TS2307 errors

### Requirement: Active (non-commented) test files audited for compliance
Every test file that was NOT commented out SHALL be inspected and fixed to match the template.

#### Scenario: Active files conform
- **WHEN** an active test file runs
- **THEN** its `jest.mock()` calls SHALL precede its imports
- **THEN** it SHALL use `@jest/globals` imports (not global jest)
- **THEN** it SHALL have `beforeEach` with `jest.clearAllMocks()`
- **THEN** it SHALL properly await async operations
