## ADDED Requirements

### Requirement: Placeholder text styling is consistent
Thick/bold placeholder text in input fields across all pages SHALL use consistent, readable font weight matching the design system.

#### Scenario: Input placeholder renders correctly
- **WHEN** a user views an input field with placeholder text
- **THEN** the placeholder SHALL use the design system's standard font weight and color
- **THEN** thick or bold placeholders SHALL be normalized

### Requirement: EPR dashboard displays quick links neatly
The EPR (Examination Performance Report) dashboard SHALL display quick links in a clean, organized grid or list layout.

#### Scenario: Quick links render properly
- **WHEN** an admin or teacher views the EPR dashboard
- **THEN** quick links SHALL be displayed in a neatly organized layout (grid or list)
- **THEN** each link SHALL have clear labeling and proper spacing

### Requirement: Student rewards page shows badges neatly
The student rewards page SHALL display badges in a clean grid layout with proper spacing, sizing, and visual presentation.

#### Scenario: Rewards page renders badges
- **WHEN** a student views the rewards page
- **THEN** badges SHALL be displayed in a neat grid layout
- **THEN** each badge SHALL show its icon, name, and unlock date

### Requirement: Back navigation from stream projects in coding page
The coding page's stream projects view SHALL include a back navigation button to return to the previous view.

#### Scenario: Student navigates back from stream projects
- **WHEN** a student is viewing stream projects in the coding page
- **THEN** a back button or link SHALL be visible
- **THEN** clicking it SHALL return the student to the previous view

### Requirement: Timetable page shows the student's class timetable
The timetable page for students SHALL display the timetable for the student's own class-section.

#### Scenario: Student views timetable
- **WHEN** a logged-in student visits the timetable page
- **THEN** the timetable SHALL auto-load for the student's enrolled class-section
- **THEN** the class name SHALL be displayed as a header (e.g., "Class 5-A Timetable")
