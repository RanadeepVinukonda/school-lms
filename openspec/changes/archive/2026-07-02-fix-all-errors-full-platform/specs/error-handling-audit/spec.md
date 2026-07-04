## ADDED Requirements

### Requirement: Graceful shutdown closes all connections
The server SHALL close HTTP server, Supabase client, and pg-boss connections on SIGTERM/SIGINT.

#### Scenario: No connection leak on restart
- **WHEN** the server receives SIGTERM
- **THEN** the HTTP server SHALL stop accepting new connections
- **THEN** active requests SHALL complete within a timeout
- **THEN** Supabase and pg-boss connections SHALL be closed
- **THEN** `process.exit(0)` SHALL only run after cleanup completes

### Requirement: Unhandled promise rejections in middleware are caught
All async middleware operations SHALL handle promise rejections.

#### Scenario: Auth middleware error is caught
- **WHEN** `auth.middleware.ts` async `.then()` callback throws
- **THEN** the error SHALL be caught and passed to `next(error)`
- **THEN** no unhandled promise rejection SHALL occur
