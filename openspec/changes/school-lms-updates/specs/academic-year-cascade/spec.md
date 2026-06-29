## ADDED Requirements

### Requirement: Cascade delete academic years
When an Academic Year is deleted, the system SHALL cascade delete all classes belonging to that Academic Year and all related data.

#### Scenario: Successful academic year deletion
- **WHEN** Admin deletes an Academic Year
- **THEN** The system deletes the academic year, all its child classes, and all data recursively nested under those classes
