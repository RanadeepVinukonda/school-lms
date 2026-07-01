## ADDED Requirements

### Requirement: Photo-to-question pipeline
The system SHALL accept a photo or PDF upload of a textbook page and automatically: extract text via OCR, detect the topic/concept, and generate assessment questions.

#### Scenario: Photo generates MCQ questions
- **WHEN** a teacher uploads a photo of a textbook page
- **THEN** the system SHALL extract the text content within 10 seconds
- **THEN** at least 5 MCQ questions SHALL be generated from the content
- **THEN** each question SHALL include 4 options and a correct answer

### Requirement: Multiple question types at all difficulty levels
Generated questions SHALL include: MCQ, HOTS (Higher Order Thinking Skills), Fill-in-the-blanks, Match-the-following, Viva questions, Worksheets, Olympiad-level, NEP-aligned competency questions. Each SHALL be available at Easy, Medium, Hard, and Olympiad difficulty levels.

#### Scenario: HOTS question respects difficulty
- **WHEN** a teacher requests Hard-level HOTS questions
- **THEN** all generated questions SHALL require analysis, evaluation, or creation (Bloom's Level 4–6)
- **THEN** Easy-level questions SHALL not be mixed into the Hard batch

### Requirement: Generated questions are editable before publishing
Teachers SHALL be able to edit any generated question (text, options, correct answer, explanation) before adding it to the question bank.

#### Scenario: Teacher edits generated question
- **WHEN** a teacher edits the correct answer of a generated MCQ
- **THEN** the edited version SHALL be saved to the question bank
- **THEN** the original AI-generated version SHALL be discarded
