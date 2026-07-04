## ADDED Requirements

### Requirement: LTI launch endpoint requires authentication
The `POST /lti/launch` endpoint SHALL require a valid authentication token via middleware.

#### Scenario: Unauthenticated LTI launch is rejected
- **WHEN** a request with no auth token hits `POST /lti/launch`
- **THEN** the server SHALL return 401 Unauthorized
- **THEN** the LTI launch SHALL NOT be processed

### Requirement: Password reset token is not leaked in API response
The `forgotPassword` endpoint SHALL NOT return the reset token in the response body. It SHALL only return a generic success message.

#### Scenario: Reset token is server-only
- **WHEN** a user requests a password reset
- **THEN** the API response SHALL NOT contain the `resetToken` field
- **THEN** the reset token SHALL only be sent via email

### Requirement: CORS respects production restrictions
On Vercel (production), CORS SHALL only allow the configured `allowedOrigins`, not all origins.

#### Scenario: Cross-origin requests are restricted
- **WHEN** a request comes from an unlisted origin on Vercel
- **THEN** the server SHALL NOT include `Access-Control-Allow-Origin: *`
- **THEN** the server SHALL return a CORS error

### Requirement: Zod schemas do not use passthrough()
No Zod validation schema SHALL use `.passthrough()`. All allowed fields SHALL be explicitly declared.

#### Scenario: Extra fields are rejected
- **WHEN** a request includes a field not declared in the schema
- **THEN** the server SHALL return 400 Bad Request
- **THEN** the response SHALL indicate the unexpected field

### Requirement: File upload validates content magic bytes
File uploads SHALL validate content by checking magic bytes, not just the MIME type header.

#### Scenario: Spoofed MIME type is rejected
- **WHEN** a user uploads an `.exe` file with `Content-Type: image/jpeg`
- **THEN** the server SHALL detect the mismatch via magic bytes
- **THEN** the server SHALL reject the upload

### Requirement: exec_sql RPC is secured or removed
The `exec_sql` SECURITY DEFINER function SHALL be secured with proper access controls or removed if unused.

#### Scenario: Arbitrary SQL execution is prevented
- **WHEN** a request attempts to call `exec_sql` without proper authorization
- **THEN** the call SHALL be rejected
- **THEN** no regular API user SHALL be able to execute arbitrary SQL

### Requirement: Rate limiting uses x-forwarded-for headers
Rate limiters SHALL respect the `x-forwarded-for` header to correctly identify client IPs behind proxies.

#### Scenario: Rate limit works behind Vercel proxy
- **WHEN** multiple requests come from different client IPs through the same Vercel edge
- **THEN** each client IP SHALL have its own rate limit counter
