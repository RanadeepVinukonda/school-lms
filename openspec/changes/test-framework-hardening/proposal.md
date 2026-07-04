## Why

Test configuration and mocking patterns are inconsistent across the test suite, causing CI failures from dangling imports, incorrect mock ordering, unhandled async operations, and circular dependencies. The CI pipeline uses `--forceExit --detectOpenHandles --bail` to prevent hangs, but underlying issues remain. Without standardised test practices, every test change risks breakage.

## What Changes

- Update all test files to follow the established best-practices template (jest.mock() before imports, jest.clearAllMocks() in beforeEach, proper async handling)
- Create a global test setup file (`__tests__/setup.ts`) with shared mocks for logger, environment variables, and database adapters
- Add `setupFilesAfterEnv` to jest.config pointing to the setup file
- Rewrite database adapter mocks consistently using the factory pattern from best practices
- Ensure every test file imports from `@jest/globals` explicitly
- Add afterEach cleanup (timers, subscriptions, env vars) to all test suites
- Fix existing test files that mock after imports or lack proper async await
- Create CI job that runs tests with `--forceExit --detectOpenHandles --bail` flags
- Document the patterns in a project-level test contribution guide

## Capabilities

### New Capabilities
- `test-setup-global`: Global test setup file with shared logger mock, env var configuration, and teardown hooks
- `test-mock-consolidation`: Standardised mock factory patterns for database, supabase, and utility modules
- `test-file-audit`: Rewrite all existing test files to match the best-practices template
- `test-ci-config`: CI pipeline test step with proper flags and hang prevention

### Modified Capabilities
*(No existing spec-level requirement changes)*

## Impact

- **All existing test files** (`src/__tests__/*.test.ts`): import order, mock setup, async patterns, cleanup — every file touched
- **jest.config**: new `setupFilesAfterEnv` option pointing to global setup
- **`src/__tests__/setup.ts`**: new file with global mocks (logger, env, db)
- **CI config** (`.github/workflows/*.yml`): test step flags
- **`package.json`** (optional): test scripts if missing
- No production code changes — tests only
