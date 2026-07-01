# School ERP

## Purpose
Provide essential school administration modules: fee management with payment tracking, timetable scheduling with conflict detection, attendance integration, and notice board for announcements.

## Requirements

### Requirement: Fee management
The system SHALL support fee schedule creation, student fee assignment, payment recording, and outstanding balance reporting. Fee data SHALL be school-scoped.

#### Scenario: Admin records a fee payment
- **WHEN** an admin records a payment of ₹5,000 for a student
- **THEN** the student's outstanding balance SHALL decrease by ₹5,000
- **THEN** a payment receipt SHALL be available for download as PDF

### Requirement: Timetable management
Teachers and admins SHALL be able to create and manage weekly class timetables. Timetable conflicts (same teacher in two classes at the same time) SHALL be automatically detected.

#### Scenario: Conflict detection prevents double-booking
- **WHEN** an admin schedules Teacher A for Period 3 on Monday in two different classes
- **THEN** the system SHALL reject the second entry with a conflict error
- **THEN** the error SHALL identify the conflicting timetable entry

### Requirement: Attendance integration with ERP
Student attendance records SHALL be accessible from the ERP module for generating attendance-based reports and fee concession calculations.

#### Scenario: Attendance report is generated
- **WHEN** an admin requests an attendance report for Class 8A for January 2026
- **THEN** the report SHALL show each student's present/absent/late count for the month
- **THEN** students with attendance below 75% SHALL be highlighted

### Requirement: Notice board and announcements
Admins and teachers SHALL be able to post notices visible to all users of a school. Notices SHALL support text, images, and attachments. Each notice SHALL have an expiry date.

#### Scenario: Expired notices are hidden
- **WHEN** a notice's expiry date has passed
- **THEN** it SHALL no longer appear in the notice board for students and parents
- **THEN** it SHALL remain visible to admins in the archived notices section
