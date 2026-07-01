# Adaptive Learning Engine

## Purpose
Automatically adapt learning content difficulty, pace, and recommendations based on each student's demonstrated mastery, learning velocity, and performance trends.

## Requirements

### Requirement: Mastery score is computed per concept per student
The system SHALL compute a mastery score (0–100) for each student-concept pair based on: accuracy (weighted 40%), recency (weighted 30%), and attempt count (weighted 30%). Mastery above 80 is "mastered"; below 50 is "needs practice"; between 50–80 is "developing".

#### Scenario: Mastery is computed after assessment
- **WHEN** a student completes a quiz or assignment for a concept
- **THEN** the mastery score for that concept SHALL be recalculated within 5 seconds
- **THEN** the student's concept status SHALL update to reflect the new mastery level

### Requirement: Difficulty auto-adjusts based on performance
When a student's mastery for a concept is below 50%, the next assessment for that concept SHALL use easy-level questions. When mastery is above 80%, the system SHALL progress to the next concept or increase difficulty to hard.

#### Scenario: Low-performing student receives easier content
- **WHEN** a student scores below 50% on a concept quiz
- **THEN** the next recommended quiz for that concept SHALL use only easy and medium questions
- **THEN** the student SHALL NOT see advanced-level questions until mastery exceeds 60%

### Requirement: Content recommendations based on mastery
The system SHALL recommend the next learning activity (lesson, video, quiz, or worksheet) based on the student's weakest concepts and learning velocity.

#### Scenario: Recommendation targets weakest concept
- **WHEN** a student opens their dashboard
- **THEN** the top 3 recommended activities SHALL target concepts with mastery below 60%
- **THEN** each recommendation SHALL include the activity type, concept name, and estimated duration

### Requirement: Revision scheduling using spaced repetition
Concepts that have not been reviewed in 7+ days SHALL be automatically scheduled for revision. The system SHALL send a notification to the student 24 hours before a scheduled revision.

#### Scenario: Overdue concept triggers revision notification
- **WHEN** a concept was last reviewed 8 days ago
- **THEN** the system SHALL add it to the student's revision queue
- **THEN** a push notification SHALL be sent: "Time to review [concept name]!"

### Requirement: Learning velocity tracking
The system SHALL track the average time a student takes to reach mastery on a concept. Velocity trends SHALL be surfaced in the teacher's class analytics dashboard.

#### Scenario: Teacher sees class velocity
- **WHEN** a teacher views class analytics
- **THEN** they SHALL see average mastery acquisition time per concept
- **THEN** concepts where the class average is more than 2x the expected duration SHALL be highlighted as gaps
