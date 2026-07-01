# Gamification

## Purpose
Increase student engagement through daily/weekly/monthly challenges, XP and coin rewards, and class/school leaderboards with real-time updates.

## Requirements

### Requirement: Daily, weekly, and monthly challenges
The system SHALL generate time-limited challenges for each student: 3 daily challenges reset at midnight, 1 weekly challenge reset on Monday, 1 monthly challenge reset on the 1st. Each challenge specifies a goal (e.g., "complete 5 quizzes"), XP reward, and coin reward.

#### Scenario: Daily challenges reset at midnight
- **WHEN** midnight UTC arrives
- **THEN** each student's incomplete daily challenges SHALL be replaced with 3 new ones
- **THEN** completed challenges from the previous day SHALL not carry over

### Requirement: School and class leaderboards
Students SHALL be able to view their XP ranking within their class and within the school. Leaderboards SHALL update in real-time after each assessment.

#### Scenario: Leaderboard updates after assessment
- **WHEN** a student completes a quiz and earns XP
- **THEN** the class leaderboard SHALL reflect the new ranking within 30 seconds
- **THEN** the student's rank change (up/down) SHALL be displayed as a delta

### Requirement: XP and coins are awarded for learning activities
The system SHALL award XP and coins atomically using a real database transaction for: lesson completion, assessment completion, high accuracy (≥90%), perfect scores, daily challenges, and streak bonuses. If any part of the award fails, the entire award SHALL be rolled back.

#### Scenario: XP and coins are awarded together
- **WHEN** a student completes a lesson
- **THEN** XP (25) and coins (5) SHALL both be credited in a single atomic operation
- **THEN** if the database write fails, neither XP nor coins SHALL be credited

#### Scenario: Award failure rolls back completely
- **WHEN** the XP update succeeds but the coins update fails
- **THEN** the XP update SHALL be rolled back
- **THEN** the student's XP balance SHALL be unchanged
