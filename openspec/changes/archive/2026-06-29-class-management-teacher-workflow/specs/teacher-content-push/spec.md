## ADDED Requirements

### Requirement: Mindmap push mechanism
The system SHALL allow teachers to push mindmaps to students via a Push button in the mindmaps tab.

#### Scenario: Teacher pushes a mindmap
- **WHEN** teacher clicks Push button on a mindmap
- **THEN** system sets the mindmap's pushed field to true and it becomes visible to students

#### Scenario: Student sees mindmap only after push
- **WHEN** mindmap is not pushed (pushed = false)
- **THEN** student cannot see the mindmap content, only teaching progress

#### Scenario: Student sees pushed mindmap
- **WHEN** mindmap is pushed (pushed = true)
- **THEN** student can view the mindmap content

### Requirement: Test template creation and push
The system SHALL allow teachers to create test templates from concept pages and push them to students.

#### Scenario: Teacher creates test template from concept
- **WHEN** teacher clicks Push Test button on a concept
- **THEN** system opens template creation form with live preview

#### Scenario: Teacher pushes test template
- **WHEN** teacher saves and pushes a test template
- **THEN** system sets template's pushed field to true and it becomes visible to students

#### Scenario: Student sees test only after push
- **WHEN** test template is not pushed
- **THEN** student cannot see the test

#### Scenario: Student sees pushed test
- **WHEN** test template is pushed
- **THEN** student can access and take the test

### Requirement: AI question generation
The system SHALL provide a "Fill with AI" button in test template creation to generate questions.

#### Scenario: Teacher uses AI to generate questions
- **WHEN** teacher clicks "Fill with AI" button
- **THEN** system calls AI service to generate questions based on concept context and populates the template

#### Scenario: Generated questions stored in question bank
- **WHEN** AI generates questions
- **THEN** system stores them in the concept's question bank subcollection

### Requirement: Question bank persistence
Generated and manual questions SHALL be stored in the concept's question bank for reuse across templates.

#### Scenario: Teacher reuses questions from bank
- **WHEN** teacher creates a new test template
- **THEN** system allows selecting existing questions from the concept's question bank

#### Scenario: Teacher deletes question from bank
- **WHEN** teacher removes a question from the question bank
- **THEN** system deletes the question and it is no longer available for templates

### Requirement: Student visibility gating
Students SHALL only see content that has been pushed by the teacher. Non-pushed content SHALL be hidden.

#### Scenario: Student view filters pushed content
- **WHEN** student navigates to a concept
- **THEN** system shows only notes, mindmaps, and tests where pushed = true

#### Scenario: Student sees teaching progress for non-pushed content
- **WHEN** content is not pushed
- **THEN** student can see that teaching is in progress but cannot access the content

### Requirement: Remove question bank page and push settings
The system SHALL remove the question bank page and visibility/push settings from concept pages as separate UI elements. Push actions SHALL be integrated into content-specific locations.

#### Scenario: No dedicated question bank page
- **WHEN** teacher navigates the system
- **THEN** there is no standalone question bank page; questions are managed within concept context

#### Scenario: No visibility/push settings page
- **WHEN** teacher manages content
- **THEN** there is no separate visibility settings page; push is done via inline buttons on content items
