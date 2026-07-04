## ADDED Requirements

### Requirement: Backend unit test coverage ≥ 90%
All backend services in `lms/backend/src/services/` SHALL have unit test coverage of at least 90% line coverage measured by Jest.

#### Scenario: Coverage gate enforces threshold
- **WHEN** the CI pipeline runs `npx jest --coverage`
- **THEN** the coverage report SHALL show ≥90% line coverage for all service files
- **THEN** the pipeline SHALL fail if any service file drops below 80% line coverage

### Requirement: Frontend component test coverage ≥ 85%
All frontend React components SHALL have tests using Vitest and React Testing Library covering at least 85% of component branches.

#### Scenario: Component renders in all states
- **WHEN** a component has loading, success, and error states
- **THEN** tests SHALL exist for all three states
- **THEN** user interactions (clicks, form submissions) SHALL be tested

### Requirement: E2E test coverage for critical user journeys
Playwright E2E tests SHALL cover: student login → assignment submission, teacher login → grade assignment, admin login → user creation, parent login → view report. All critical journeys SHALL pass in CI.

#### Scenario: Assignment submission E2E test passes
- **WHEN** the E2E test for assignment submission runs
- **THEN** a student SHALL be able to log in, find an assignment, submit an answer, and see a confirmation
- **THEN** the test SHALL run in under 30 seconds

### Requirement: API contract tests for all endpoints
Every API endpoint SHALL have a Supertest integration test verifying: success response shape, authentication requirement, authorization (role checks), and at least one error case.

#### Scenario: API test verifies auth requirement
- **WHEN** an API endpoint test runs without a valid token
- **THEN** the test SHALL assert that the response is 401 Unauthorized
- **THEN** the response body SHALL match the expected error schema
