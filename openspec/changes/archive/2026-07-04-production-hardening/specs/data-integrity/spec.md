## MODIFIED Requirements

### Requirement: WriteBatch uses real ACID transactions
**Source:** `specs/acid-transactions/spec.md`

WriteBatch (`WB` class) SHALL be removed. All batched write operations SHALL use `TransactionManager.runTransaction()` which executes within a PostgreSQL `BEGIN/COMMIT/ROLLBACK` block using the pg pool client. If `DATABASE_URL` is not configured, the system SHALL throw an error (no silent fallback to non-ACID sequential writes).

#### Scenario: Batch write succeeds atomically
- **WHEN** a batch of writes is committed
- **THEN** all writes succeed within a single PostgreSQL transaction

#### Scenario: Batch write fails and rolls back
- **WHEN** any write in the batch fails
- **THEN** all prior writes in the batch SHALL be rolled back

#### Scenario: No DATABASE_URL configured
- **WHEN** `DATABASE_URL` env var is not set and a transaction is attempted
- **THEN** the system SHALL throw an error: `DATABASE_URL not configured, cannot run ACID transaction`

## ADDED Requirements

### Requirement: Transaction isolation for financial reports
The outstanding fee report (`getOutstandingReport`) SHALL always use the pg pool-based transaction, never the fallback parallel-read path. The report SHALL read fee structures, payments, and student data within a single `SERIALIZABLE` transaction to guarantee consistency.

#### Scenario: Report reads consistent snapshot
- **WHEN** `getOutstandingReport` executes
- **THEN** all three reads (structures, payments, students) reflect the same database state
