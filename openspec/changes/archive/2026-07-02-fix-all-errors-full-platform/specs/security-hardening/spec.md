## ADDED Requirements

### Requirement: LTI launch endpoint requires authentication
The `POST /lti/launch` endpoint SHALL have authentication middleware, preventing anonymous LTI launches.

#### Scenario: Unauthenticated LTI launch is rejected
- **WHEN** an unauthenticated request hits `POST /lti/launch`
- **THEN** the server SHALL return 401 Unauthorized

### Requirement: Password reset token is not exposed in API
The `forgotPassword` endpoint SHALL NOT include the reset token in the response body.

#### Scenario: Token stays server-side
- **WHEN** a user requests a password reset
- **THEN** the response SHALL NOT contain `resetToken`
- **THEN** the message field SHALL be generic ("If the email exists, a reset link has been sent")

### Requirement: CORS respects allowed origins on Vercel
CORS middleware SHALL NOT allow all origins when `process.env.VERCEL_ENV` is set.

#### Scenario: Production CORS is strict
- **WHEN** a cross-origin request originates from an unlisted domain on Vercel
- **THEN** the server SHALL NOT include `Access-Control-Allow-Origin: *`
- **THEN** the request SHALL be blocked by CORS

### Requirement: exec_sql RPC is secured
The `exec_sql` SECURITY DEFINER function SHALL be secured with access controls or removed.

#### Scenario: Arbitrary SQL execution blocked
- **WHEN** an unprivileged caller attempts to invoke `exec_sql`
- **THEN** the call SHALL fail with a permission error
- **THEN** service_role key alone SHALL NOT be sufficient to execute arbitrary SQL via this RPC

### Requirement: Rate limiting respects x-forwarded-for headers
Rate limiters SHALL correctly identify client IPs through `x-forwarded-for` headers in proxy deployments.

#### Scenario: Per-IP limits work behind Vercel proxy
- **WHEN** requests arrive through Vercel's edge network
- **THEN** the rate limiter SHALL use the original client IP from `x-forwarded-for`
- **THEN** each client SHALL have an independent rate limit counter
