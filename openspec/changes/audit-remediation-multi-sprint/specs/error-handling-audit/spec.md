## ADDED Requirements

### Requirement: Missing route validators added
Every POST/PUT/PATCH route SHALL have a Zod validator. Routes identified as missing validators in the audit SHALL be corrected.

#### Scenario: Route without validator gets one
- **WHEN** a POST route without a validator is called with invalid data
- **THEN** the Zod validation middleware SHALL reject it with a 422 response

### Requirement: NaN-safe arithmetic in all services
All services performing division SHALL guard against zero divisors. All services computing percentages SHALL guard against NaN results.

#### Scenario: Division by zero produces 0, not NaN
- **WHEN** a service divides by a value that could be zero
- **THEN** the result SHALL be 0 or null, not NaN

### Requirement: All unhandled promise rejections caught
Every async function SHALL have error handling. No `Promise` SHALL be fired without a `.catch()` or `await` in a try/catch.

#### Scenario: Async function error is handled
- **WHEN** an async service function throws an error
- **THEN** it SHALL be caught by try/catch or error middleware
- **THEN** the error SHALL be logged with context

## MODIFIED Requirements

### Requirement: No silently swallowed errors in controllers or services
Every `.catch()` handler SHALL either re-throw the error, log it with sufficient context, or handle it explicitly. Silent `catch(() => {})` patterns SHALL be eliminated.

#### Scenario: Auth middleware error is propagated
- **WHEN** `auth.middleware.ts` catches a token verification error
- **THEN** the error SHALL be passed to `next(error)`, not swallowed

### Requirement: Error propagation follows consistent pattern
All services SHALL use a consistent error type (`AppError`) with status code, message, and optional details. This SHALL be enforced across all 49+ services.

#### Scenario: Service throws typed error
- **WHEN** a service encounters a not-found condition
- **THEN** it SHALL throw `AppError('not-found', 'User not found')`
- **THEN** the error middleware SHALL catch it and return a structured JSON response
