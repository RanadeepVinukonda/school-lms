## ADDED Requirements

### Requirement: Global test setup file
The system SHALL include a `src/__tests__/setup.ts` file that runs before every test suite via `setupFilesAfterEnv` in jest.config.

#### Scenario: Setup file exists and is loaded
- **WHEN** any test file runs
- **THEN** setup.ts SHALL execute before the test file's code
- **THEN** the logger utility SHALL be mocked globally (`jest.mock('../utils/logger')`) before any import resolves

#### Scenario: Environment variables set
- **WHEN** the setup file executes
- **THEN** `process.env.NODE_ENV` SHALL be set to `'test'`
- **THEN** `process.env.SUPABASE_URL` SHALL be set to a test value
- **THEN** `process.env.SUPABASE_ANON_KEY` SHALL be set to a test value

#### Scenario: Teardown hooks
- **WHEN** all tests in a file complete
- **THEN** environment variables SHALL be restored to original values

### Requirement: jest.config references setup file
The jest.config.js file SHALL include `setupFilesAfterEnv` pointing to the setup file.

#### Scenario: jest.config update
- **WHEN** Jest starts
- **THEN** it SHALL load `src/__tests__/setup.ts` via `setupFilesAfterEnv` before any test file
- **THEN** the test environment SHALL use `node` (not jsdom)
