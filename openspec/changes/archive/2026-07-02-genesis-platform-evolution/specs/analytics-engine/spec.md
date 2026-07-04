## ADDED Requirements

### Requirement: Student analytics dashboard
Each student SHALL have a personal analytics dashboard showing: overall mastery percentage, time spent per subject, weak concepts, learning trend (improving/stable/declining), and upcoming revision schedule.

#### Scenario: Student views their dashboard
- **WHEN** a student navigates to their analytics dashboard
- **THEN** they SHALL see their top 3 weak concepts by mastery score
- **THEN** they SHALL see a learning trend chart for the past 30 days

### Requirement: Teacher class analytics
Teachers SHALL see class-level analytics: concept mastery heatmap, completion rates per assignment, student engagement scores, and learning gap alerts.

#### Scenario: Teacher sees concept mastery heatmap
- **WHEN** a teacher views class analytics for their subject
- **THEN** a heatmap SHALL show mastery for every concept × student combination
- **THEN** concepts below 50% class average SHALL be highlighted in red

### Requirement: School analytics dashboard for admins
School admins SHALL see a school-wide dashboard: grade-wise performance comparison, teacher performance metrics, enrollment trends, and fee collection status.

#### Scenario: Admin compares grade performance
- **WHEN** an admin views the school dashboard
- **THEN** they SHALL see average mastery scores by grade (Grade 6–12)
- **THEN** grades performing more than 15% below the school average SHALL be flagged

### Requirement: Parent weekly and monthly reports
Parents SHALL receive automated weekly and monthly PDF reports showing their child's: attendance, mastery progress, recent assessments, and teacher recommendations.

#### Scenario: Weekly report is sent automatically
- **WHEN** Sunday 8:00 PM arrives
- **THEN** the system SHALL generate and email a weekly report to all registered parents
- **THEN** the report SHALL be available in the parent app under "Reports"
