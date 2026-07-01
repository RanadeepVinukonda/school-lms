# Security Hardening

## Purpose
Protect the application against common web vulnerabilities through role-based access control, input validation, rate limiting, security headers, audit logging, and token management.

## Requirements

### Requirement: Role-based access control on all routes
Every API route SHALL declare the minimum role required to access it. Requests with insufficient role SHALL receive a 403 Forbidden response. Roles: `super_admin`, `school_admin`, `teacher`, `student`, `parent`.

#### Scenario: Student cannot access teacher-only endpoint
- **WHEN** a student sends a request to `POST /api/assignments` (teacher-only)
- **THEN** the server SHALL return 403 Forbidden
- **THEN** an audit log entry SHALL be created for the access attempt

### Requirement: All routes have input validation
Every API endpoint SHALL validate request body, query params, and path params using a schema validation library (Zod). Invalid inputs SHALL return 400 with structured error details.

#### Scenario: Invalid input is rejected
- **WHEN** a request contains a field that fails schema validation
- **THEN** the server SHALL return 400 Bad Request
- **THEN** the response SHALL include the field name and validation error message

### Requirement: Rate limiting on authentication endpoints
Authentication endpoints (`/auth/login`, `/auth/register`, `/auth/forgot-password`) SHALL be rate-limited to 10 requests per minute per IP. Exceeding the limit SHALL return 429 Too Many Requests.

#### Scenario: Brute force is prevented
- **WHEN** an IP makes 11 login attempts within 60 seconds
- **THEN** the 11th request SHALL return 429 Too Many Requests
- **THEN** the IP SHALL be blocked for 5 minutes after 3 consecutive rate limit events

### Requirement: Security headers on all responses
All HTTP responses SHALL include: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy: no-referrer`.

#### Scenario: Security headers are present
- **WHEN** any API response is returned
- **THEN** the response SHALL include all five security headers
- **THEN** the CSP header SHALL not allow `unsafe-inline` scripts

### Requirement: Audit log for sensitive operations
All create, update, delete operations on sensitive entities (users, grades, fees, roles) SHALL create an audit log entry recording: actor, action, entity type, entity ID, old value, new value, timestamp, IP address.

#### Scenario: Grade change is audited
- **WHEN** a teacher updates a student's grade
- **THEN** an audit log entry SHALL be created with the teacher's ID, old grade, new grade, and timestamp
- **THEN** the audit log SHALL be immutable (no updates or deletes allowed)

### Requirement: JWT rotation and session revocation
JWT access tokens SHALL expire after 15 minutes. Refresh tokens SHALL expire after 7 days. Users SHALL be able to revoke all active sessions. Revoked tokens SHALL be rejected immediately.

#### Scenario: Token revocation is enforced
- **WHEN** a user revokes all sessions
- **THEN** all existing JWT tokens for that user SHALL be invalidated
- **THEN** subsequent requests with revoked tokens SHALL return 401 Unauthorized
