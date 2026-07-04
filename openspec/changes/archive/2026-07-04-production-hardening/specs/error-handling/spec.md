## MODIFIED Requirements

### Requirement: Standardized error response format across all endpoints
**Source:** `specs/error-handling-audit/spec.md`

All API responses SHALL follow the format `{ success: boolean, data?: T, error?: { code: string, message: string, details?: unknown } }`. The `error.middleware.ts` SHALL be the single handler that converts all errors to this format. Route handlers SHALL NOT construct error responses manually — they SHALL throw typed errors (AppError subclasses).

#### Scenario: Success response
- **WHEN** a request succeeds
- **THEN** response body is `{ success: true, data: <response data> }`

#### Scenario: Known error response
- **WHEN** a service throws `NotFoundError`
- **THEN** response body is `{ success: false, error: { code: 'NOT_FOUND', message: '...' } }`

#### Scenario: Unexpected error response
- **WHEN** an unhandled exception occurs
- **THEN** response body is `{ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }` and the full error is logged

### Requirement: All error codes are documented
The `errors.ts` file SHALL export an enum of all error codes used in the system. Each error code SHALL map to an HTTP status code and human-readable message.

#### Scenario: Error codes defined centrally
- **WHEN** a new error type is needed
- **THEN** a new error code is added to the central enum
