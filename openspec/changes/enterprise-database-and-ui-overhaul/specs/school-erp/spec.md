## ADDED Requirements

### Requirement: Fee management uses typed tables
Fee management SHALL use dedicated typed SQL tables (`fee_categories`, `invoices`, `invoice_items`, `discounts`, `scholarships`, `transactions`) instead of JSONB views.

#### Scenario: Fee invoice has line items
- **WHEN** an admin creates a fee invoice for a student
- **THEN** the invoice SHALL be stored in `invoices` table with line items in `invoice_items`
- **THEN** each item SHALL reference a `fee_categories` entry

### Requirement: Timetable uses typed table with section support
Timetable entries SHALL reference specific `sections` (not just classes), enabling distinct timetables per class-section.

#### Scenario: Different sections have different timetables
- **WHEN** an admin creates timetables for Class 5-A and Class 5-B
- **THEN** each SHALL store independent schedule entries referencing their respective section_id

### Requirement: Attendance uses typed tables with session tracking
Attendance SHALL be stored in dedicated `attendance_sessions` and `student_attendance` tables. Each attendance session SHALL reference a specific class-section.

#### Scenario: Attendance is recorded per session
- **WHEN** a teacher marks attendance for Class 5-A on a specific date
- **THEN** a session record SHALL be created in `attendance_sessions`
- **THEN** each student's status SHALL be recorded in `student_attendance`

## MODIFIED Requirements

### Requirement: Fee management
The system SHALL support fee schedule creation, student fee assignment, payment recording, and outstanding balance reporting. Fee data SHALL use typed SQL tables with referential integrity.

#### Scenario: Admin records a fee payment
- **WHEN** an admin records a payment of ₹5,000 for a student against an invoice
- **THEN** a transaction SHALL be recorded in the `transactions` table
- **THEN** the invoice's paid amount SHALL be updated
- **THEN** a payment receipt SHALL be available for download as PDF

### Requirement: Timetable management
Teachers and admins SHALL be able to create and manage weekly class timetables per class-section. Timetable conflicts SHALL be automatically detected using database-level exclusion constraints.

#### Scenario: Conflict detection prevents double-booking
- **WHEN** an admin schedules Teacher A for Period 3 on Monday in Class 5-A and Class 5-B
- **THEN** the system SHALL reject the second entry with a conflict error
- **THEN** the error SHALL identify the conflicting timetable entry

### Requirement: Attendance integration with ERP
Student attendance records SHALL be accessible from the ERP module for generating attendance-based reports and fee concession calculations. Attendance data SHALL come from the typed `student_attendance` table.

#### Scenario: Attendance report is generated
- **WHEN** an admin requests an attendance report for Class 5-A for January 2026
- **THEN** the report SHALL show each student's present/absent/late count for the month
- **THEN** students with attendance below 75% SHALL be highlighted

### Requirement: Notice board and announcements
Admins and teachers SHALL be able to post notices visible to all users of a school. Notices SHALL support text, images, and attachments. Each notice SHALL have an expiry date.

#### Scenario: Expired notices are hidden
- **WHEN** a notice's expiry date has passed
- **THEN** it SHALL no longer appear in the notice board for students and parents
- **THEN** it SHALL remain visible to admins in the archived notices section
