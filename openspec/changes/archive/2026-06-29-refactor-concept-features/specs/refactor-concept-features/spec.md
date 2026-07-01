## ADDED Requirements

### Requirement: Single Button Concept Release Control
The system SHALL replace the "Student Release & Push Settings" card on the teacher concept view page with a single "Push Concept to Students" button. The system SHALL restrict student access to all concept materials (notes, mind maps, resources) until the teacher has pushed/released the concept using this button.

#### Scenario: Verify student release settings card is replaced on teacher view
- **WHEN** a teacher navigates to a concept detail page
- **THEN** they see a single "Push Concept to Students" (or "Concept Pushed") button instead of multiple release toggle switches

#### Scenario: Verify student cannot access unreleased concept notes and mind maps
- **WHEN** a student navigates to a concept page that has not been pushed/released by the teacher
- **THEN** the entire page content is locked behind a "locked" overlay displaying a message that the concept is pending release

### Requirement: Rename Notes Tab and Consolidate Study Materials
The system SHALL rename the "Notes" tab to "Study Material" on both the teacher and student concept view pages. Under this tab, the system SHALL display the following sections in order:
1. Learning Objectives
2. Summary
3. Study Notes
4. Key Points
5. Formulas
6. Examples

#### Scenario: Verify Study Material tab renaming
- **WHEN** a teacher or student views a concept page
- **THEN** they see the tab labeled "Study Material" instead of "Notes"

#### Scenario: Verify study content layout order
- **WHEN** a user selects the "Study Material" tab
- **THEN** the system displays Learning Objectives, Summary, Study Notes, Key Points, Formulas, and Examples in that exact sequence

### Requirement: Remove Questions and Practice Tabs from Concept Pages
The system SHALL NOT display the "Questions" tab on the teacher concept view page and SHALL NOT display the "Practice" tab on the student concept view page. Live questions SHALL only be previewed within the "Publish Test" modal for teachers.

#### Scenario: Verify Questions tab is removed for teachers
- **WHEN** a teacher views a concept page
- **THEN** they do not see a "Questions" tab

#### Scenario: Verify Practice tab is removed for students
- **WHEN** a student views a concept page
- **THEN** they do not see a "Practice" tab

#### Scenario: Verify questions are visible during test publishing
- **WHEN** a teacher opens the "Publish Test" modal
- **THEN** they see the real-time live preview of questions matching the selected modularity criteria

### Requirement: Restrict AI Question Generation Types
The system SHALL prompt the AI to generate only the six question types defined in the template list: multiple choice (mcq), true/false, fill in the blank, matching, numerical, and descriptive. This constraint SHALL be enforced during textbook processing (backend worker) and client-side extraction.

#### Scenario: Verify question generation types in backend worker
- **WHEN** the backend worker runs AI question generation for a concept
- **THEN** the prompt requests only mcq, true_false, fill_blank, matching, numerical, and descriptive questions

#### Scenario: Verify question generation types in client-side extraction
- **WHEN** client-side AI question generation is triggered
- **THEN** the prompt restricts types to mcq, true_false, fill_blank, matching, numerical, and descriptive

### Requirement: Remove Unused Difficulty Circle Badge
The system SHALL NOT render the empty oval/circle outline difficulty badge beside the video count pill. It SHALL only render the difficulty badge if the concept difficulty value is defined.

#### Scenario: Verify difficulty badge is not empty
- **WHEN** a concept has no difficulty specified
- **THEN** no empty badge or circle outline is displayed next to the video pill
