## ADDED Requirements

### Requirement: Cascade delete classes
When a class is deleted, the system SHALL perform a complete cascade delete of students, subjects, textbooks, chapters, concepts, lecture data, notes, resources, mindmaps, question banks, tests, templates, and teacher assignments for that class.

#### Scenario: Successful class deletion
- **WHEN** Admin deletes a class
- **THEN** The system deletes the class and all its students, subjects, textbooks, and all child data recursively, while preserving teacher accounts
