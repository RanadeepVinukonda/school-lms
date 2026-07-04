## ADDED Requirements

### Requirement: Analytics queries use normalized schema
All analytics queries SHALL reference the new normalized tables (classes, sections, marks, attendance_sessions, student_attendance) instead of JSONB views.

#### Scenario: Average performance is calculated from marks table
- **WHEN** the analytics engine calculates average performance
- **THEN** it SHALL aggregate from the `marks` table with proper joins to `exam_subjects`, `exams`, and `class_students`
- **THEN** the result SHALL never be undefined or null

### Requirement: Analytics undefined values fixed
The analytics engine SHALL handle null/missing data gracefully. No analytics display SHALL show "undefined", "NaN", or "null" values.

#### Scenario: Empty data shows zero or placeholder
- **WHEN** a school has no exam data for the selected period
- **THEN** the analytics page SHALL display "0%" or "No data available" instead of "undefined%"

### Requirement: Trends tab loads from normalized data
The analytics Trends tab SHALL load trend data by querying the normalized schema with proper time-series aggregation.

#### Scenario: Trends tab data loads successfully
- **WHEN** an admin clicks the Trends tab
- **THEN** trend data SHALL be fetched from the marks and exam tables grouped by academic term
- **THEN** the trend chart SHALL render without errors

## MODIFIED Requirements

### Requirement: School analytics dashboard for admins
School admins SHALL see a school-wide dashboard: grade-wise performance comparison from the normalized `marks` table, teacher performance metrics, enrollment trends from `class_students`, and fee collection status from `invoices`/`transactions`.

#### Scenario: Admin compares grade performance
- **WHEN** an admin views the school dashboard
- **THEN** they SHALL see average marks by class-section from the `marks` table
- **THEN** class-sections performing more than 15% below the school average SHALL be flagged

### Requirement: Student analytics dashboard
Each student SHALL have a personal analytics dashboard showing: overall mastery percentage, time spent per subject, weak concepts, learning trend, and upcoming revision schedule. Data SHALL be sourced from normalized tables.

#### Scenario: Student views their dashboard
- **WHEN** a student navigates to their analytics dashboard
- **THEN** they SHALL see their top 3 weak concepts by mastery score
- **THEN** they SHALL see a learning trend chart for the past 30 days

### Requirement: Teacher class analytics
Teachers SHALL see class-level analytics: concept mastery heatmap, completion rates per assignment, student engagement scores, and learning gap alerts.

#### Scenario: Teacher sees concept mastery heatmap
- **WHEN** a teacher views class analytics for their subject
- **THEN** a heatmap SHALL show mastery for every concept x student combination
- **THEN** concepts below 50% class average SHALL be highlighted in red

### Requirement: Parent weekly and monthly reports
Parents SHALL receive automated weekly and monthly PDF reports showing their child's: attendance, mastery progress, recent assessments, and teacher recommendations.

#### Scenario: Weekly report is sent automatically
- **WHEN** Sunday 8:00 PM arrives
- **THEN** the system SHALL generate and email a weekly report to all registered parents
- **THEN** the report SHALL be available in the parent app under "Reports"
