## ADDED Requirements

### Requirement: Google Classroom roster sync
The system SHALL sync course rosters from Google Classroom using the Google Classroom API with a service account.

#### Scenario: Admin connects Google Classroom
- WHEN an admin enters a Google service account key in settings
- THEN the system fetches courses and enrollments from the connected Google Classroom domain

#### Scenario: Roster is imported
- WHEN the sync runs
- THEN students and teachers from Google Classroom courses are created or matched in the platform
- WHEN a student is removed from a Google Classroom course
- THEN they are deactivated in the platform on the next sync

### Requirement: Moodle LTI 1.3 integration
The system SHALL act as an LTI 1.3 Advantage tool provider for Moodle, supporting course launch and grade passback.

#### Scenario: Teacher launches Genesis from Moodle
- WHEN a teacher clicks the Genesis LTI link in Moodle
- THEN they are authenticated via LTI 1.3 and redirected to their dashboard
- WHEN a student submits a graded assignment
- THEN the grade is passed back to the Moodle gradebook via the LTI 1.3 Assignment and Grade Service

### Requirement: Grade passback
The system SHALL push assignment and quiz grades back to the connected LMS.

#### Scenario: Grade is synced
- WHEN a teacher grades a student's assignment
- THEN the grade is sent to both Google Classroom (if connected) and Moodle (if launched via LTI)
