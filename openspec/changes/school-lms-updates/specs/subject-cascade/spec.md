## ADDED Requirements

### Requirement: Cascade delete subjects
Deleting a subject within a class SHALL perform a complete cascade delete of textbooks, chapters, concepts, notes, mindmaps, question banks, tests, and templates associated with that subject.

#### Scenario: Successful subject deletion
- **WHEN** Admin deletes a subject in a class
- **THEN** The system deletes the subject and all related textbooks, concepts, and materials belonging ONLY to that subject
