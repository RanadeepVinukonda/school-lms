## ADDED Requirements

### Requirement: Class CRUD operations
The system SHALL allow admins to create, read, update, and delete classes.

#### Scenario: Admin creates a class
- **WHEN** admin submits class creation form with name and details
- **THEN** system creates the class and it appears in the class list

#### Scenario: Admin edits a class
- **WHEN** admin modifies class details
- **THEN** system updates the class information

#### Scenario: Admin deletes a class
- **WHEN** admin confirms class deletion
- **THEN** system removes the class and cascades deletion to all related data

### Requirement: Subject management within classes
The system SHALL allow admins to create, rename, and delete subjects within a class.

#### Scenario: Admin creates a subject in a class
- **WHEN** admin adds a subject to a class
- **THEN** system creates the subject under that class

#### Scenario: Admin renames a subject
- **WHEN** admin edits subject name
- **THEN** system updates the subject name

#### Scenario: Admin deletes a subject
- **WHEN** admin deletes a subject
- **THEN** system removes the subject and cascades deletion to all content (textbooks, chapters, concepts, lectures, notes, mindmaps, question banks, test templates)

### Requirement: Student management within classes
The system SHALL allow admins to create and manage students within a class.

#### Scenario: Admin adds a student to a class
- **WHEN** admin submits student creation form
- **THEN** system creates the student enrolled in that class

#### Scenario: Admin removes a student from a class
- **WHEN** admin deletes a student
- **THEN** system removes the student from the class

### Requirement: Cascading deletion on class removal
Class deletion SHALL cascade to all related data: students, subjects, teacher assignments, subject content, test templates, and question banks.

#### Scenario: Class deletion removes all students
- **WHEN** admin deletes a class with enrolled students
- **THEN** system deletes all student records in that class

#### Scenario: Class deletion removes all subjects and content
- **WHEN** admin deletes a class with subjects
- **THEN** system deletes all subjects and their content (textbooks, chapters, concepts, lectures, notes, mindmaps, question banks, test templates)

#### Scenario: Class deletion removes teacher assignments
- **WHEN** admin deletes a class with assigned teachers
- **THEN** system removes all teacher-class assignment records

### Requirement: Teacher creation restricted to Class Hub
The system SHALL NOT allow teacher registration from the assign teacher flow. Teachers SHALL only be created in Class Hub > Teachers tab.

#### Scenario: Assign teacher flow does not show registration
- **WHEN** admin opens assign teacher dialog for a class
- **THEN** system shows only existing teachers to assign, no option to register new teacher

#### Scenario: Teacher creation available in Class Hub
- **WHEN** admin navigates to Class Hub > Teachers tab
- **THEN** system provides teacher registration form
