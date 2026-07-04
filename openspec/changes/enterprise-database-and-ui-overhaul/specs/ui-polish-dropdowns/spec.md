## ADDED Requirements

### Requirement: Attendance page class dropdown shows class-section format
The attendance page class dropdown SHALL display options as "Class X-Y" (e.g., "Class 1-A", "Class 1-B") instead of showing the same class name for different sections.

#### Scenario: Teacher selects attendance class
- **WHEN** a teacher opens the attendance dropdown
- **THEN** each option SHALL display as "Class {number}-{section}"
- **THEN** selecting a section-specific class SHALL load the correct student list for that section

### Requirement: Fee management class dropdown shows class-section format
The fee management page class dropdown SHALL display options in "Class X-Y" format.

#### Scenario: Admin selects fee class
- **WHEN** an admin opens the fee management class dropdown
- **THEN** each option SHALL display as "Class {number}-{section}"
- **THEN** selecting a section SHALL show fees for that specific section

### Requirement: Academic year input is a dropdown
The academic year input field SHALL be a dropdown select (not a text input) populated with available academic years from the database.

#### Scenario: Admin selects academic year
- **WHEN** an admin clicks the academic year field
- **THEN** a dropdown SHALL appear with available academic years (e.g., "2024-2025", "2025-2026")
- **THEN** selecting an academic year SHALL filter the page data to that year

### Requirement: Timetable page class dropdown shows class-section format
The timetable page class dropdown SHALL display options in "Class X-Y" format, referencing the same dropdown component pattern used in the notice board.

#### Scenario: Teacher views timetable
- **WHEN** a teacher selects a class from the timetable dropdown
- **THEN** each option SHALL display as "Class {number}-{section}"
- **THEN** the timetable SHALL display the schedule for the selected class-section
