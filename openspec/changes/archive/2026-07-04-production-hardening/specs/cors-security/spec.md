## MODIFIED Requirements

### Requirement: CORS restricts origins by explicit allowlist only
**Source:** `specs/security-hardening/spec.md` (paragraph on CORS restrictions)

The CORS configuration SHALL NOT allow all origins in any environment — including development and Vercel deployments. The allowlist SHALL contain only explicitly listed origins. Adding a new environment SHALL require a code/config change.

#### Scenario: Request from allowed origin
- **WHEN** request comes with `Origin: https://app.example.com`
- **THEN** response includes `Access-Control-Allow-Origin: https://app.example.com`

#### Scenario: Request from unknown origin
- **WHEN** request comes with `Origin: https://evil-site.com`
- **THEN** response does NOT include `Access-Control-Allow-Origin` header

#### Scenario: Development environment
- **WHEN** `NODE_ENV=development`
- **THEN** CORS still enforces the allowlist; `http://localhost:5173` must be in allowlist

#### Scenario: Vercel preview deployment
- **WHEN** `process.env.VERCEL_ENV` is set
- **THEN** CORS still enforces the allowlist; preview URLs must be added explicitly or via `*.vercel.app` wildcard

## ADDED Requirements

### Requirement: CORS network error returns clear message
When CORS rejects a request, the error message SHALL indicate which origin was rejected to aid debugging.

#### Scenario: Rejected origin logged
- **WHEN** CORS rejects an origin
- **THEN** server logs `CORS blocked origin: <origin>` at warn level
