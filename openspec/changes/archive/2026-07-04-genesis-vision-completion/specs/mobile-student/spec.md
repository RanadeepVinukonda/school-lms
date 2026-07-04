## ADDED Requirements

### Requirement: Student mobile app with all core screens
The system SHALL provide a React Native (Expo) mobile app for students that includes all core learning features.

#### Scenario: Student logs in and sees dashboard
- WHEN a student opens the app and logs in
- THEN they see their dashboard with mastery score, pending tasks, upcoming exams, and recent activity

#### Scenario: Student browses subjects and lessons
- WHEN a student taps a subject
- THEN they see the list of chapters and lessons with progress indicators
- WHEN they tap a lesson
- THEN the lesson content is displayed with text, images, and embedded video

#### Scenario: Student takes an adaptive quiz
- WHEN a student starts a quiz from the lessons screen
- THEN questions are served one at a time with MCQ/text input
- WHEN they submit an answer
- THEN the next question adapts based on their response

#### Scenario: Student uses AI Tutor
- WHEN a student opens AI Tutor
- THEN they can type or speak a question and receive an AI-generated explanation

#### Scenario: Student accesses virtual labs
- WHEN a student opens a virtual lab
- THEN they see an interactive simulation (physics/chemistry/biology)

#### Scenario: Student views leaderboard
- WHEN a student opens the gamification tab
- THEN they see daily challenges, XP, badges, and class leaderboard

### Requirement: Student app offline support
The mobile app SHALL cache learning content for offline access.

#### Scenario: Student downloads content for offline
- WHEN a student marks a chapter for offline
- THEN the app downloads lesson content, images, and quiz data
- WHEN the student opens the app offline
- THEN cached content is displayed without network errors
