## ADDED Requirements

### Requirement: Attendance has duplicate-entry guard
The `markAttendance` function SHALL check for existing records before inserting. Duplicate `(studentId, date, classId)` SHALL update the existing record, not create a new one.

#### Scenario: Same student marked twice same day
- **WHEN** a teacher marks attendance for a student who already has a record for today
- **THEN** the existing record SHALL be updated instead of creating a duplicate

### Requirement: Timetable prevents teacher double-booking
The `createTimetableEntry` function SHALL check for existing entries with the same `teacher_id`, `day`, and `period` before inserting.

#### Scenario: Teacher assigned to two classes same period
- **WHEN** an admin schedules Teacher A for Period 2 in Class 5A and Class 5B on Monday
- **THEN** the second assignment SHALL be rejected with a conflict error

### Requirement: Timetable saves are atomic
The `saveTimetableDay` function SHALL wrap DELETE + INSERT in a single database transaction. If the INSERT fails, the DELETE SHALL be rolled back.

#### Scenario: Partial timetable insert failure
- **WHEN** one of 8 timetable rows fails to insert
- **THEN** all prior deletions SHALL be rolled back
- **THEN** the original timetable SHALL remain intact

### Requirement: Fee payments cannot exceed due amount
The `recordPayment` function SHALL query the fee schedule's amount and sum existing payments before recording a new payment. The payment SHALL be rejected if `totalPaid + newPayment > scheduleAmount`.

#### Scenario: Overpayment attempt rejected
- **WHEN** an admin attempts to record a ₹10,000 payment against a ₹5,000 fee
- **THEN** the system SHALL reject the transaction with an overpayment error

### Requirement: Payroll prevents duplicate month runs
The `runPayroll` function SHALL check `payroll_runs` for existing `(staffId, month)` before creating a new run.

#### Scenario: Duplicate payroll prevented
- **WHEN** payroll is run for a staff member who already has a record for January 2026
- **THEN** the system SHALL reject the duplicate run

### Requirement: Exam percentage handles zero totalPoints
The exam grading function SHALL guard against division by zero when `totalPoints` is 0, returning 0% instead of NaN.

#### Scenario: Exam with zero points graded
- **WHEN** an exam with zero total points is graded
- **THEN** the percentage SHALL be 0%, not NaN

### Requirement: Pipeline concept counter is atomic
The `completed_concepts` increment SHALL use `SELECT ... FOR UPDATE` or an atomic RPC to prevent race conditions.

#### Scenario: Two concepts finish concurrently
- **WHEN** two concepts complete at the same time
- **THEN** both increments SHALL be applied atomically
- **THEN** the textbook SHALL correctly reach COMPLETED status

### Requirement: All Firestore bindings replaced
No backend service, controller, or utility file SHALL import from Firestore. All `batch.write()`, `batch.create()`, `firestore.collection()` SHALL be replaced with Supabase adapter calls.

#### Scenario: No Firestore imports remain
- **WHEN** the backend TypeScript is compiled
- **THEN** no file SHALL import from `firebase/firestore` or use Firestore batch syntax
