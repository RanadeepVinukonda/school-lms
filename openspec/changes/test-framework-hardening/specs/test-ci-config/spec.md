## ADDED Requirements

### Requirement: CI test step uses consistent flags
The GitHub Actions workflow file SHALL use `npm test -- --forceExit --detectOpenHandles --bail` as the test command.

#### Scenario: CI runs with hang prevention
- **WHEN** the CI workflow runs tests
- **THEN** the test command SHALL include `--forceExit` flag
- **THEN** the test command SHALL include `--detectOpenHandles` flag
- **THEN** the test command SHALL include `--bail` flag

### Requirement: npm test script exists in package.json
The `lms/backend/package.json` SHALL have a `test` script that runs Jest.

#### Scenario: npm test command
- **WHEN** `npm test` is run
- **THEN** it SHALL execute `jest` (or `npx jest`)
- **THEN** it SHALL accept additional CLI flags passed via `--`
