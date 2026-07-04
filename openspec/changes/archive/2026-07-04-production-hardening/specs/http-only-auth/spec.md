## ADDED Requirements

### Requirement: JWT stored in httpOnly cookie
The backend SHALL set the session token as an httpOnly, Secure, SameSite=Strict cookie on login and token refresh. The frontend SHALL NOT store the token in localStorage. The axios interceptor SHALL NOT read token from localStorage; the cookie SHALL be attached automatically by the browser.

#### Scenario: User logs in successfully
- **WHEN** user submits valid credentials to `/api/auth/login`
- **THEN** backend sets httpOnly cookie with session token and returns user profile

#### Scenario: User refreshes page
- **WHEN** user reloads the app
- **THEN** the browser sends the cookie automatically with requests; no localStorage read needed

### Requirement: Frontend auth store reads session from cookie
The zustand auth store SHALL NOT persist the token in localStorage. The `partialize` function in zustand persist SHALL exclude the token. On app initialization, the store SHALL call `/api/auth/session` which reads the cookie server-side.

#### Scenario: App initializes
- **WHEN** `useAuthStore.initialize()` runs
- **THEN** it calls `/api/auth/session` instead of reading `localStorage`

#### Scenario: Token refresh
- **WHEN** the current session token is expired
- **THEN** the backend refresh endpoint sets a new httpOnly cookie; frontend retries original request

### Requirement: Backend sets cookie on login and refresh
The auth controller SHALL set `Set-Cookie` header with `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=<session_duration>` on `/auth/login` and `/auth/refresh` responses. The cookie SHALL contain the Supabase access token.

#### Scenario: Login sets cookie
- **WHEN** auth controller returns successful login
- **THEN** response includes `Set-Cookie` header with token

#### Scenario: Logout clears cookie
- **WHEN** user logs out
- **THEN** backend clears the cookie with `Max-Age=0`
