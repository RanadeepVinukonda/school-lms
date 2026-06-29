## ADDED Requirements

### Requirement: Concept completion tracking
The system SHALL provide a Completed button per concept for teachers to mark teaching progress.

#### Scenario: Teacher marks concept as completed
- **WHEN** teacher clicks Completed button on a concept
- **THEN** system sets concept's completed field to true for that teacher-class combination

#### Scenario: Teacher unmarks concept completion
- **WHEN** teacher clicks Completed button again on a completed concept
- **THEN** system sets concept's completed field to false

### Requirement: Teacher progress visibility
Teachers SHALL see completion status across all concepts in a subject.

#### Scenario: Teacher views subject progress
- **WHEN** teacher navigates to a subject's concepts list
- **THEN** system shows completion status (completed/pending) for each concept

#### Scenario: Progress aggregated per subject
- **WHEN** teacher views subject overview
- **THEN** system displays overall teaching progress as completed concepts / total concepts

### Requirement: Student progress visibility
Students SHALL see teaching progress for concepts without accessing non-pushed content.

#### Scenario: Student sees concept progress
- **WHEN** student navigates to a subject
- **THEN** system shows which concepts have been taught (completed) vs pending

#### Scenario: Student progress does not reveal content
- **WHEN** concept is completed by teacher but not pushed
- **THEN** student sees progress indicator but cannot access concept content (notes, mindmaps, tests)

### Requirement: Progress per teacher-class combination
Completion tracking SHALL be scoped to teacher-class combination, allowing different teachers to have different progress in the same class.

#### Scenario: Teacher A marks concept complete
- **WHEN** Teacher A marks a concept completed in Class X
- **THEN** only Teacher A sees that concept as completed; Teacher B teaching same class does not see it as completed

#### Scenario: Progress independent across classes
- **WHEN** teacher is assigned to multiple classes
- **THEN** completion in one class does not affect progress in other classes
