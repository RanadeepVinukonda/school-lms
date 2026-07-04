## MODIFIED Requirements

### Requirement: Auth-specific rate limiting
**Source:** `specs/security-hardening/spec.md` (rate limiting section), `specs/production-infra/spec.md` (infrastructure)

The auth endpoint SHALL have a stricter rate limit (5 requests per 15 minutes per IP) separate from the global API limit (100 requests per minute). Auth routes SHALL apply `authRateLimit` middleware. The global `apiRateLimit` SHALL NOT apply to auth routes (they have their own).

#### Scenario: Auth rate limit exceeded
- **WHEN** IP exceeds 5 login attempts in 15 minutes
- **THEN** response is `429` with `Too many authentication attempts. Please try again later.`

#### Scenario: Auth rate limit resets
- **WHEN** 15 minutes have passed since the first failed attempt
- **THEN** the counter resets and attempts are allowed again

## ADDED Requirements

### Requirement: Rate limit config driven by environment
Rate limit windows and max values SHALL be configurable via environment variables: `AUTH_RATE_LIMIT_MAX` (default 5), `AUTH_RATE_LIMIT_WINDOW_MS` (default 900000), `API_RATE_LIMIT_MAX` (default 100), `API_RATE_LIMIT_WINDOW_MS` (default 60000).

#### Scenario: Environment override
- **WHEN** `AUTH_RATE_LIMIT_MAX=10` is set in env
- **THEN** auth rate limit allows 10 attempts per window
