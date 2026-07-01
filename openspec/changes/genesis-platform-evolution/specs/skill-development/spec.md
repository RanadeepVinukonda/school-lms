## ADDED Requirements

### Requirement: Coding module with in-browser execution
The system SHALL provide a coding environment supporting Python, JavaScript, and HTML. Students SHALL be able to write and execute code in the browser. Execution SHALL be sandboxed with a 10-second timeout.

#### Scenario: Python code executes safely
- **WHEN** a student submits Python code for execution
- **THEN** the code SHALL run in an isolated sandbox
- **THEN** output SHALL be returned within 10 seconds
- **THEN** code that attempts file system access or network calls SHALL be blocked

### Requirement: STREAM project workspace
Students SHALL be able to create collaborative STREAM projects (Science, Technology, Reading, Engineering, Arts, Mathematics). Projects SHALL have steps, materials, and assessment criteria.

#### Scenario: Student creates a STREAM project
- **WHEN** a student creates a new project with title, subject tags, and difficulty level
- **THEN** the project SHALL appear in the class STREAM board
- **THEN** other students SHALL be able to join as collaborators

### Requirement: Skill badges for completion
Completing skill modules (coding, robotics, electronics) SHALL earn the student a skill badge displayed on their profile. Each skill has 3 levels: Beginner, Intermediate, Advanced.

#### Scenario: Coding badge is awarded
- **WHEN** a student completes all Beginner Python coding challenges
- **THEN** the "Python Beginner" badge SHALL be added to their profile
- **THEN** the badge SHALL be visible to their teacher and parents
