# Mobile Experience (PWA)

## Purpose
Deliver a reliable, fast, and installable mobile experience through Progressive Web App technologies with offline support, push notifications, and low-bandwidth optimisation.

## Requirements

### Requirement: Progressive Web App with offline support
The application SHALL be installable as a PWA on Android and iOS. Core learning content (current lesson, pending assignments, downloaded quizzes) SHALL be accessible offline. Changes made offline SHALL sync when connectivity is restored.

#### Scenario: Student studies offline
- **WHEN** a student downloads a lesson while online and then loses connectivity
- **THEN** they SHALL be able to view the lesson content without internet access
- **THEN** quiz answers saved offline SHALL sync automatically when connectivity returns

### Requirement: Lighthouse scores above 95
The application SHALL achieve Lighthouse scores of: Performance ≥95, Accessibility ≥95, Best Practices ≥95, SEO ≥95 on mobile simulated network (3G slow).

#### Scenario: Performance budget is met
- **WHEN** a Lighthouse audit is run on the student dashboard page
- **THEN** all four scores SHALL be 95 or higher
- **THEN** Time to Interactive SHALL be under 3.5 seconds on simulated 3G

### Requirement: Push notifications
The system SHALL send push notifications to students and parents for: new assignments, grade updates, attendance alerts, AI tutor replies, and daily challenge reminders. Users SHALL be able to configure notification preferences.

#### Scenario: Assignment notification is delivered
- **WHEN** a teacher publishes a new assignment
- **THEN** all enrolled students SHALL receive a push notification within 60 seconds
- **THEN** students who have disabled assignment notifications SHALL NOT receive it

### Requirement: Low-bandwidth optimization
The application SHALL function on 2G/3G connections. Images SHALL be lazy-loaded and served in WebP format. API responses SHALL be compressed with gzip. Total page weight SHALL not exceed 200KB on first load.

#### Scenario: Page loads on slow connection
- **WHEN** a student on a 2G connection opens the dashboard
- **THEN** the page SHALL display meaningful content within 5 seconds
- **THEN** images SHALL load progressively without blocking the main content
