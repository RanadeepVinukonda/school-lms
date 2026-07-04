## ADDED Requirements

### Requirement: Admin class hub shows class-section distinct names
The admin class hub page SHALL display class names with their section suffix (e.g., "Class 1-A", "Class 1-B") instead of showing the same class name for different sections.

#### Scenario: Same class, different sections
- **WHEN** an admin views the class hub page with Class 1 having sections A and B
- **THEN** the page SHALL show "Class 1-A" and "Class 1-B" as distinct entries
- **THEN** clicking each entry SHALL show the correct section's students

### Requirement: Students categorized by class in admin view
The admin students page SHALL group students by their class-section assignment. A class filter SHALL be available to view students in a specific class.

#### Scenario: Admin filters students by class
- **WHEN** an admin selects "Class 5-A" from the class filter
- **THEN** only students enrolled in Class 5-A SHALL be displayed
- **THEN** the student count for the selected class SHALL be shown
