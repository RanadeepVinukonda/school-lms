## ADDED Requirements

### Requirement: No silently swallowed errors in controllers or services
Every `.catch()` handler SHALL either re-throw the error, log it with sufficient context, or handle it explicitly. Silent `catch(() => {})` patterns SHALL be eliminated.

#### Scenario: File cleanup failure is logged
- **WHEN** `coding.service.ts` attempts to `unlink` a temp file and fails
- **THEN** the error SHALL be logged with file path context
- **THEN** execution SHALL continue (non-critical failure, but logged)

#### Scenario: Auth middleware error is propagated
- **WHEN** `auth.middleware.ts` catches a token verification error
- **THEN** the error SHALL be passed to `next(error)`, not swallowed

#### Scenario: Student mapping failure preserves error info
- **WHEN** `attendance.service.ts` maps students and one lookup fails
- **THEN** the error SHALL NOT silently return `null` — it SHALL either throw or log with context

### Requirement: Error propagation follows consistent pattern
All services SHALL use a consistent error type (`AppError`) with status code, message, and optional details.

#### Scenario: Service throws typed error
- **WHEN** a service encounters a not-found condition
- **THEN** it SHALL throw `AppError('not-found', 'User not found')`
- **THEN** the error middleware SHALL catch it and return a structured JSON response
