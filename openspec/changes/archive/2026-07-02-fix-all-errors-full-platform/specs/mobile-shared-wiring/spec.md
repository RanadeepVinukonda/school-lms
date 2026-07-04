## ADDED Requirements

### Requirement: Mobile apps import from @genesis-lms/shared
All three mobile apps (teacher, student, parent) SHALL import auth, API, and state management services from `@genesis-lms/shared`.

#### Scenario: Auth service is used
- **WHEN** the mobile app starts
- **THEN** it SHALL use `useAuthStore` from `@genesis-lms/shared`
- **THEN** the auth state SHALL be shared across all apps via the shared library

### Requirement: Mobile apps call real backend APIs
All mobile screens SHALL replace hardcoded mock data with API calls through the shared library's axios instance.

#### Scenario: Dashboard loads real data
- **WHEN** a teacher opens the dashboard
- **THEN** the app SHALL call `GET /api/dashboard/teacher` with auth headers
- **THEN** the dashboard SHALL display data from the backend

### Requirement: API base URL matches backend
The mobile apps' API base URL SHALL match the actual backend port and path prefix.

#### Scenario: API calls reach the backend
- **WHEN** a mobile app makes an API call
- **THEN** the request SHALL go to the correct URL (matching backend.env.PORT and /api prefix)
- **THEN** the backend SHALL respond with valid data

### Requirement: Login flow exists in mobile apps
Each mobile app SHALL have a login screen that authenticates via `@genesis-lms/shared` auth service.

#### Scenario: User can log in
- **WHEN** a user enters credentials on the login screen
- **THEN** the app SHALL call the backend auth endpoint
- **THEN** on success, the app SHALL store the token and navigate to the main dashboard
- **THEN** on failure, the app SHALL display an error message
