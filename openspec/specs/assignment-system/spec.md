# Assignment System

## Purpose
Manage creation, submission, and grading of assignments, with AI-assisted question generation and grading capabilities.

## Requirements

### Requirement: AI-assisted question generation for assignments
Teachers SHALL be able to auto-generate assignment questions from a concept or chapter using the AI question generator. Generated questions SHALL be editable before publishing.

#### Scenario: Teacher generates questions from concept
- **WHEN** a teacher selects a concept and clicks "Generate Questions"
- **THEN** the system SHALL return 5–10 questions within 10 seconds
- **THEN** each question SHALL have a type, difficulty level, and correct answer

### Requirement: AI-assisted grading for written responses
Written assignment submissions SHALL support AI-assisted grading against a teacher-provided rubric. AI grades SHALL be presented as suggestions; the teacher SHALL have final authority.

#### Scenario: AI suggests grade with rubric
- **WHEN** a teacher opens a written submission and an AI grade suggestion is available
- **THEN** the teacher SHALL see the suggested score, rubric criterion breakdown, and AI reasoning
- **THEN** the teacher SHALL be able to accept, modify, or reject the AI suggestion

### Requirement: Assignment listing uses database-level pagination
Assignment listing queries SHALL use database-level `ORDER BY`, `LIMIT`, and `OFFSET` clauses. No service SHALL load all assignments and paginate in JavaScript memory.

#### Scenario: Large assignment list is paginated at DB level
- **WHEN** a course has 500 assignments and the client requests page 3 with limit 20
- **THEN** the database query SHALL use `OFFSET 40 LIMIT 20`
- **THEN** only 20 rows SHALL be transferred from the database to the application
