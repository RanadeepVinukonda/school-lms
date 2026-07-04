## ADDED Requirements

### Requirement: School analytics average performance shows correct percentage
The school analytics page SHALL display the correct average performance percentage instead of showing "undefined%".

#### Scenario: Average performance is calculated correctly
- **WHEN** an admin views the school analytics page
- **THEN** the average performance percentage SHALL be calculated from actual exam/assessment data
- **THEN** "undefined%" SHALL never appear

### Requirement: Analytics trends tab loads data successfully
The "Trends" tab in school analytics SHALL load and display trend data without errors.

#### Scenario: Trends tab data loads
- **WHEN** an admin clicks the "Trends" tab
- **THEN** the system SHALL fetch and display trend data
- **THEN** no loading errors or empty states caused by data fetching failures SHALL occur
