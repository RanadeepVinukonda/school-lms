## ADDED Requirements

### Requirement: Every backend service has a test file
Each service in `lms/backend/src/services/` SHALL have a corresponding test file in `lms/backend/src/__tests__/`.

#### Scenario: Service test exists
- **WHEN** a service file `services/*.service.ts` exists
- **THEN** a corresponding `__tests__/*.service.test.ts` SHALL exist
- **THEN** the test SHALL cover the service's public API (list, get, create, update, delete)

### Requirement: Tests cover happy path and error states
Each test file SHALL include positive cases (successful operations) and negative cases (not found, validation errors, unauthorized access).

#### Scenario: Happy path returns expected data
- **WHEN** a service create operation succeeds
- **THEN** the test SHALL verify the returned data matches input
- **THEN** the test SHALL verify the created document exists in the database

#### Scenario: Error path returns appropriate error
- **WHEN** a service get operation is called with a non-existent ID
- **THEN** the test SHALL verify the service throws `AppError` with status code 404
- **THEN** the test SHALL verify the error message is descriptive

### Requirement: Tests use a test database or mocked adapter
Tests SHALL NOT hit a production database. They SHALL use either a dedicated test Supabase instance or a mocked adapter.

#### Scenario: Test isolation
- **WHEN** tests run in parallel
- **THEN** no test SHALL affect another test's data
- **THEN** each test SHALL clean up created resources

### Requirement: Coverage target is 70%+ for services
The aggregate line coverage for `lms/backend/src/services/` SHALL be at least 70%.

#### Scenario: Coverage check passes
- **WHEN** running `npx jest --coverage`
- **THEN** the services directory SHALL show >= 70% line coverage
