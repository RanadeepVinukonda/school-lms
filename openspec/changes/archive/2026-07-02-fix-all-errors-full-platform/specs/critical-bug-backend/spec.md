## ADDED Requirements

### Requirement: PDF processing uses correct API
The system SHALL use the correct `pdf-parse` API when extracting text from PDF files.

#### Scenario: PDF text extraction succeeds
- **WHEN** a textbook PDF is uploaded
- **THEN** the system calls `pdfParse(buffer)` (not `new PDFParse({data})`)
- **THEN** extracted text SHALL be available for AI enrichment

### Requirement: pipeline.service.ts exists and is importable
The system SHALL have a valid `pipeline.service.ts` module at the expected path.

#### Scenario: AI enrichment runs after PDF upload
- **WHEN** a textbook is created with a PDF URL
- **THEN** `require('./pipeline.service')` SHALL resolve without MODULE_NOT_FOUND
- **THEN** AI enrichment SHALL process the textbook content

### Requirement: resetPassword uses correct user UID
The `firebaseUpdateUser` call in `resetPassword` SHALL use the authenticated user's UID, not the Firestore token document ID.

#### Scenario: Password reset updates correct user
- **WHEN** a user resets their password
- **THEN** the password SHALL be updated for the user identified by the reset token
- **THEN** the user SHALL be able to log in with the new password

### Requirement: increment_completed_concepts RPC exists
A PostgreSQL function `increment_completed_concepts` SHALL be defined in a migration and callable via `supabase.rpc()`.

#### Scenario: Concept progress is tracked
- **WHEN** a student completes a concept
- **THEN** `supabase.rpc('increment_completed_concepts', { t_id })` SHALL succeed
- **THEN** the textbook's completed concept count SHALL increment

### Requirement: FieldValue.increment is atomic
Multi-write operations using `FieldValue.increment()` SHALL be atomic — concurrent requests SHALL NOT lose increments.

#### Scenario: Concurrent enrollment counts are correct
- **WHEN** two students enroll in the same course simultaneously
- **THEN** the final enrollment count SHALL reflect both enrollments

### Requirement: WriteBatch and PseudoTx support rollback
The `WriteBatch` and `PseudoTx` classes SHALL support atomic commit with rollback on failure.

#### Scenario: Multi-write batch rolls back on error
- **WHEN** a `WriteBatch.commit()` encounters an error on the third operation
- **THEN** the first two operations SHALL be rolled back
- **THEN** the database state SHALL be unchanged from before the commit

### Requirement: getUserByEmail uses indexed lookup
The `getUserByEmail` function SHALL query the database by email rather than scanning all users in memory.

#### Scenario: Email lookup scales
- **WHEN** the system has 10,000 users
- **THEN** `getUserByEmail('user@school.com')` SHALL return the matching user in under 100ms

### Requirement: Graceful shutdown closes connections
The SIGTERM/SIGINT handlers SHALL close the HTTP server, Supabase client, and pg-boss connections before exiting.

#### Scenario: Server restart does not leak connections
- **WHEN** the server receives SIGTERM
- **THEN** the HTTP server SHALL stop accepting new requests
- **THEN** active connections SHALL drain within a timeout
- **THEN** all database connections SHALL be released

### Requirement: List queries have pagination
All list endpoints (textbooks, overdue tests) SHALL enforce a maximum page size and support cursor or offset pagination.

#### Scenario: Large result sets are paginated
- **WHEN** querying all textbooks for a school with 5,000 textbooks
- **THEN** the response SHALL return at most 100 items
- **THEN** a pagination token or page number SHALL be provided to fetch the next page
