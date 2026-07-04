## ADDED Requirements

### Requirement: All endpoints have Zod request validation
Every route handler SHALL use a Zod schema to validate request body, query parameters, and path params before passing to business logic. Validation errors SHALL return a standardized format with field-level details.

#### Scenario: Valid request passes through
- **WHEN** a client sends a request with valid body matching the Zod schema
- **THEN** the request proceeds to the route handler with typed, sanitized data

#### Scenario: Invalid request is rejected
- **WHEN** a client sends a request with missing required fields
- **THEN** the response is `400` with `{ success: false, error: { code: 'VALIDATION_ERROR', message: '...', details: [{ field: 'email', message: 'Required' }] } }`

### Requirement: Standardized error response format
All error responses SHALL follow the shape `{ success: false, error: { code: string, message: string, details?: unknown } }`. Success responses SHALL follow `{ success: true, data: T }`. The `error.middleware.ts` SHALL enforce this format for all unhandled errors.

#### Scenario: Business logic throws AppError
- **WHEN** a service throws `NotFoundError('User not found')`
- **THEN** response is `404` with `{ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }`

#### Scenario: Unexpected error is handled
- **WHEN** an unhandled error is thrown
- **THEN** response is `500` with `{ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }` and details logged server-side

### Requirement: Zod schemas defined per-route
Each route file SHALL define its Zod schemas inline or in a co-located `*.schema.ts` file. Shared schemas (pagination, IDs) SHALL live in a `shared.schema.ts` file.

#### Scenario: Route has validation
- **WHEN** a route is defined with `router.post('/attendance', validate(attendanceSchema), handler)`
- **THEN** the `validate` middleware runs `attendanceSchema.parse(req.body)` before `handler`
