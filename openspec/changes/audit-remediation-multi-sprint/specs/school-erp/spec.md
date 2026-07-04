## ADDED Requirements

### Requirement: Attendance prevents duplicate records
The attendance module SHALL check for existing `(studentId, date, classId)` records before inserting. Duplicate records SHALL update the existing entry, not create a new one.

#### Scenario: Duplicate attendance prevented
- **WHEN** a teacher marks attendance for a student who already has a record for today
- **THEN** the existing record SHALL be updated instead of duplicated

### Requirement: Timetable entries are atomic
The timetable `saveTimetableDay` operation SHALL wrap DELETE + INSERT in a single database transaction. Partial failures SHALL roll back the DELETE.

#### Scenario: Partial insert is rolled back
- **WHEN** one of multiple timetable rows fails to insert
- **THEN** the entire operation SHALL be rolled back
- **THEN** the original timetable SHALL remain unchanged

### Requirement: Fee payments validated against schedule
The fee payment endpoint SHALL validate that the payment amount does not exceed the fee schedule's remaining balance before recording.

#### Scenario: Overpayment rejected
- **WHEN** a payment exceeds the remaining balance on a fee schedule
- **THEN** the system SHALL reject it with a clear error message

### Requirement: Attendance has school isolation
The attendance routes SHALL include school-scope checks to prevent cross-school data access.

#### Scenario: Teacher cannot view another school's attendance
- **WHEN** a teacher queries attendance for a class in a different school
- **THEN** the request SHALL be denied with 403 Forbidden

## MODIFIED Requirements

### Requirement: Fee management
The system SHALL support fee schedule creation, student fee assignment, payment recording (with overpayment protection), and outstanding balance reporting. Fee data SHALL be school-scoped.

#### Scenario: Admin records a fee payment
- **WHEN** an admin records a payment of ₹5,000 for a student with a ₹5,000 fee
- **THEN** the student's outstanding balance SHALL decrease by ₹5,000
- **THEN** any attempt to pay more than ₹5,000 SHALL be rejected

### Requirement: Timetable management
Teachers and admins SHALL be able to create and manage weekly class timetables. Timetable conflicts (same teacher in two classes at same day+period) SHALL be detected at the database level via unique constraint or application-level check. Timetable saves SHALL be atomic transactions.

#### Scenario: Conflict detection prevents double-booking
- **WHEN** an admin schedules Teacher A for Period 3 on Monday in two different classes
- **THEN** the system SHALL reject the second entry with a conflict error
- **THEN** the error SHALL identify the conflicting timetable entry

### Requirement: Attendance integration with ERP
Student attendance records SHALL be accessible from the ERP module for generating attendance-based reports and fee concession calculations. Records SHALL be deduplicated.

#### Scenario: Attendance report is generated
- **WHEN** an admin requests an attendance report for Class 8A for January 2026
- **THEN** the report SHALL show each student's present/absent/late count for the month (no duplicates)
- **THEN** students with attendance below 75% SHALL be highlighted

### Requirement: Notice board and announcements
Admins and teachers SHALL be able to post notices visible to all users of a school. Notices SHALL support text, images, and attachments. Each notice SHALL have an expiry date. Expired notices SHALL be filtered out in the query (not in application code).

#### Scenario: Expired notices are hidden
- **WHEN** a notice's expiry date has passed
- **THEN** it SHALL no longer appear in queries for students and parents
- **THEN** it SHALL remain visible to admins in the archived notices section
