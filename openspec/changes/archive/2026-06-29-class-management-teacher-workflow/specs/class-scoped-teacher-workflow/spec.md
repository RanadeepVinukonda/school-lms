## ADDED Requirements

### Requirement: Class selection gateway after teacher login
The system SHALL display a class selection screen after teacher login, listing all classes assigned to that teacher.

#### Scenario: Teacher sees class selection
- **WHEN** teacher logs in successfully
- **THEN** system displays a list of classes the teacher is assigned to teach

#### Scenario: Teacher selects a class
- **WHEN** teacher clicks on a class from the selection list
- **THEN** system loads that class context and navigates to teacher dashboard

### Requirement: Class-scoped data access
All teacher pages SHALL display only data relevant to the selected class.

#### Scenario: Teacher views subjects for selected class
- **WHEN** teacher navigates to teaching pages
- **THEN** system shows only subjects assigned to the selected class

#### Scenario: Teacher views students for selected class
- **WHEN** teacher navigates to student-related pages
- **THEN** system shows only students enrolled in the selected class

### Requirement: Class switching during session
The system SHALL allow teachers to switch between assigned classes without re-logging in.

#### Scenario: Teacher switches class
- **WHEN** teacher selects a different class from the class switcher
- **THEN** system updates all pages to show data for the newly selected class

#### Scenario: Class selection persists across page reload
- **WHEN** teacher refreshes the page
- **THEN** system remembers the last selected class and loads its context

### Requirement: Class selection storage
The selected class SHALL be stored in React context and localStorage for session persistence.

#### Scenario: Class context available across components
- **WHEN** teacher navigates between pages
- **THEN** selected class ID is available via context provider without re-fetching

#### Scenario: Class persists on browser refresh
- **WHEN** teacher refreshes browser
- **THEN** selected class is restored from localStorage
