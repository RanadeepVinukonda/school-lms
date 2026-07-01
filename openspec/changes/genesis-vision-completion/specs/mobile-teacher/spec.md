## ADDED Requirements

### Requirement: Teacher mobile app with class management
The system SHALL provide a React Native (Expo) mobile app for teachers covering classroom management, assessment, and content creation.

#### Scenario: Teacher views dashboard
- WHEN a teacher logs in
- THEN they see class performance summary, pending grading count, and recent student activity

#### Scenario: Teacher marks attendance
- WHEN a teacher opens a class and taps "Attendance"
- THEN they see the class roster with checkboxes for each student
- WHEN they mark students and submit
- THEN attendance is recorded via the existing attendance API

#### Scenario: Teacher creates assessment
- WHEN a teacher taps "Create Assessment"
- THEN they select class/subject and configure question types and difficulty
- WHEN they submit
- THEN the assessment is created via the existing unified test engine API

#### Scenario: Teacher grades submissions
- WHEN a teacher opens pending submissions
- THEN they see student answers with AI grading suggestions
- WHEN they review and confirm
- THEN grades are saved and published

#### Scenario: Teacher scans textbook page (OCR)
- WHEN a teacher uses the camera to capture a textbook page
- THEN the image is sent to the OCR API and extracted text is returned
- WHEN the teacher taps "Generate Questions"
- THEN AI generates questions from the extracted text
