## ADDED Requirements

### Requirement: Parent mobile app with child progress
The system SHALL provide a React Native (Expo) mobile app for parents to monitor their children's learning.

#### Scenario: Parent views child dashboard
- WHEN a parent logs in and selects a child
- THEN they see the child's mastery score, attendance, recent grades, and pending assignments

#### Scenario: Parent receives push notification
- WHEN the child submits an assignment or scores below 40%
- THEN the parent receives a push notification with a summary

#### Scenario: Parent views weekly report
- WHEN a parent taps "Weekly Report"
- THEN they see a PDF report with attendance, performance trends, and AI recommendations
