## ADDED Requirements

### Requirement: Multi-write operations use PostgreSQL transactions
The system SHALL use PostgreSQL `BEGIN`/`COMMIT`/`ROLLBACK` semantics for all multi-document write operations. If any write in a transaction fails, all prior writes in that transaction SHALL be rolled back.

#### Scenario: Successful transaction commits all writes
- **WHEN** a transaction writes to documents A, B, and C
- **THEN** all three writes SHALL be persisted atomically
- **THEN** a concurrent reader SHALL see either all three writes or none

#### Scenario: Failed transaction rolls back all writes
- **WHEN** a transaction writes to documents A and B, but write to C fails
- **THEN** writes to A and B SHALL be rolled back
- **THEN** the database state SHALL be identical to before the transaction started

### Requirement: The Tx class uses real database transactions
The existing `Tx` class (or its replacement) SHALL NOT execute writes in a loop without rollback protection. It SHALL wrap all writes in a single database transaction.

#### Scenario: Transaction boundary is explicit
- **WHEN** `runTransaction()` is called
- **THEN** a PostgreSQL transaction SHALL be opened
- **THEN** all writes within the callback SHALL execute within that transaction
- **THEN** the transaction SHALL commit on success or roll back on error
