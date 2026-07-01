# Notification System

## Purpose
Deliver timely push and in-app notifications to users across all platforms, with per-category preference controls and reliable delivery.

## Requirements

### Requirement: Push notification delivery via FCM and APNs
The system SHALL deliver push notifications to Android devices via Firebase Cloud Messaging (FCM) and to iOS devices via Apple Push Notification Service (APNs). In-app notifications SHALL remain the fallback when push is unavailable.

#### Scenario: Push notification is delivered to Android
- **WHEN** a new assignment is published
- **THEN** enrolled students with FCM tokens SHALL receive a push notification within 60 seconds
- **THEN** students without FCM tokens SHALL see the notification only in the in-app notification center

### Requirement: User notification preferences
Users SHALL be able to toggle push notifications on/off per category: assignments, grades, attendance, AI tutor replies, challenges, announcements. Preferences SHALL be persisted per device.

#### Scenario: Disabled category is not sent
- **WHEN** a student disables "assignment" push notifications
- **THEN** no push notifications for new assignments SHALL be sent to their device
- **THEN** in-app notifications for assignments SHALL continue to appear
