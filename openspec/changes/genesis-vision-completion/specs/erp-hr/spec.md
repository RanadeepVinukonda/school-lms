## ADDED Requirements

### Requirement: Staff record management
The system SHALL maintain staff records including personal details, qualifications, and contracts.

#### Scenario: Admin adds a staff record
- WHEN an admin enters staff name, role (teacher/non-teaching), department, and joining date
- THEN the record is saved and visible in the HR dashboard

### Requirement: Staff attendance tracking
The system SHALL track daily staff attendance separately from student attendance.

#### Scenario: Staff marks their attendance
- WHEN a staff member opens the attendance screen
- THEN they can mark themselves present/absent/leave
- WHEN an admin views staff attendance reports
- THEN they see monthly attendance summaries

### Requirement: Leave management
The system SHALL allow staff to request leave and admins to approve/reject.

#### Scenario: Staff requests leave
- WHEN a staff member submits a leave request with dates and reason
- THEN the request appears in the admin approval queue
- WHEN the admin approves
- THEN the leave is recorded and days are deducted from the staff's leave balance

### Requirement: Salary/payroll management
The system SHALL track salary records and generate payslips.

#### Scenario: Admin configures salary
- WHEN an admin sets a staff member's base salary and allowances
- THEN payroll calculations use these values
- WHEN an admin generates monthly payroll
- THEN a PDF payslip is generated for each staff member
