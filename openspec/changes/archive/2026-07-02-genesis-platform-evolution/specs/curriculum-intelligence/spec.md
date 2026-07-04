## ADDED Requirements

### Requirement: Multi-board curriculum support
The system SHALL support CBSE, ICSE, State Board (Andhra Pradesh, Telangana), and Cambridge curricula. Each curriculum SHALL have a full hierarchy: Board → Grade → Subject → Chapter → Topic → Concept → Learning Objective.

#### Scenario: CBSE Class 10 Math curriculum is navigable
- **WHEN** a teacher selects Board=CBSE, Grade=10, Subject=Mathematics
- **THEN** all CBSE Class 10 Math chapters SHALL be listed
- **THEN** selecting a chapter SHALL show its topics and concepts

### Requirement: Publisher catalogue integration
The system SHALL support content aligned to NCERT, Oxford, Pearson, Macmillan, and Cambridge publishers. Each concept SHALL be linkable to a specific textbook page range.

#### Scenario: Concept links to NCERT page
- **WHEN** a teacher views a concept in the CBSE curriculum
- **THEN** they SHALL see the corresponding NCERT textbook page reference
- **THEN** clicking the reference SHALL open the textbook viewer at that page

### Requirement: Curriculum planning for teachers
Teachers SHALL be able to create a curriculum plan mapping chapters to calendar weeks. The system SHALL track plan completion progress automatically.

#### Scenario: Teacher creates curriculum plan
- **WHEN** a teacher creates a plan assigning Chapter 3 to Week 5
- **THEN** the system SHALL notify the teacher if they fall behind schedule by more than one week
- **THEN** completed chapters SHALL be automatically marked when all concept assessments show class mastery > 70%
