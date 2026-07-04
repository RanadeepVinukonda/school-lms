## ADDED Requirements

### Requirement: Overall average uses weighted calculation
The analytics engine SHALL compute `overallAvg` as a weighted average (`totalScore / totalStudents`) across all assessments, not the average of assessment-level averages.

#### Scenario: Weighted average computed correctly
- **WHEN** the analytics dashboard calculates the overall average for a class with assessments of different sizes
- **THEN** the result SHALL be weighted by student count, not an average of averages

### Requirement: Analytics never returns NaN
All analytics calculations SHALL guard against division by zero. Missing or zero divisors SHALL produce 0 or null, not NaN or Infinity.

#### Scenario: No assessment data exists
- **WHEN** a class has no graded assessments
- **THEN** the average performance SHALL display "0%" or "No data" instead of NaN or undefined

### Requirement: Teacher comparison does not double-count grades
The teacher comparison function SHALL attribute each grade to the teacher who graded it (via `grade.teacherId` or equivalent), not to all teachers associated with the student.

#### Scenario: Grade attributed correctly
- **WHEN** a student has multiple teachers but only one graded a specific assessment
- **THEN** the grade SHALL only count toward that specific teacher's metrics

### Requirement: Performance trends use dedicated date field
The `getPerformanceTrends` function SHALL use a dedicated `examDate` or `assessmentDate` field for monthly bucketing, not `createdAt` or `updatedAt`.

#### Scenario: Trend data bucketed correctly
- **WHEN** a grade created in January is updated in March
- **THEN** it SHALL be counted in January's trend data (not March's)

## MODIFIED Requirements

### Requirement: School analytics dashboard for admins
School admins SHALL see a school-wide dashboard: grade-wise performance comparison (using weighted averages), teacher performance metrics (no double-counting), enrollment trends, and fee collection status.

#### Scenario: Admin compares grade performance
- **WHEN** an admin views the school dashboard
- **THEN** they SHALL see weighted average mastery scores by grade
- **THEN** grades performing more than 15% below the school average SHALL be flagged

### Requirement: Student analytics dashboard
Each student SHALL have a personal analytics dashboard showing: overall mastery percentage, time spent per subject, weak concepts, learning trend, and upcoming revision schedule. All calculations SHALL be NaN-safe.

#### Scenario: Student views their dashboard
- **WHEN** a student navigates to their analytics dashboard
- **THEN** they SHALL see their top 3 weak concepts by mastery score
- **THEN** they SHALL see a learning trend chart for the past 30 days
- **THEN** no metric SHALL show NaN, undefined, or Infinity

### Requirement: Teacher class analytics
Teachers SHALL see class-level analytics: concept mastery heatmap, completion rates per assignment, student engagement scores, and learning gap alerts.

#### Scenario: Teacher sees concept mastery heatmap
- **WHEN** a teacher views class analytics for their subject
- **THEN** a heatmap SHALL show mastery for every concept x student combination
- **THEN** concepts below 50% class average SHALL be highlighted in red
