## ADDED Requirements

### Requirement: React Native apps use correct RN APIs
All three mobile apps (student, teacher, parent) SHALL use correct React Native APIs. `onClick` SHALL be replaced with `onPress`. `borderBorderWidth` SHALL be replaced with `borderWidth`. `alert()` SHALL be replaced with `Alert.alert()`. HTML elements SHALL be replaced with RN equivalents.

#### Scenario: Touch interactions function
- **WHEN** a user taps any touchable element
- **THEN** the `onPress` handler SHALL fire (no `onClick` handlers)
- **THEN** all style properties SHALL be valid RN properties

### Requirement: Mobile apps integrate with real API
All 24 screens across 3 apps SHALL use the shared `api` axios client from `@genesis-lms/shared` to fetch data. No hardcoded mock data SHALL remain in any screen.

#### Scenario: Teacher classes screen loads real data
- **WHEN** a teacher opens the classes screen
- **THEN** it SHALL fetch data from `GET /api/classes`
- **THEN** loading, error, and empty states SHALL be handled

### Requirement: Auth gating at navigator level
All three apps SHALL check auth state at the navigator level. Unauthenticated users SHALL be redirected to a login screen.

#### Scenario: Unauthenticated user redirected
- **WHEN** an unauthenticated user opens any app
- **THEN** they SHALL see a login screen, not a protected screen

### Requirement: Loading, error, empty states on all screens
Every screen SHALL handle three states: loading (spinner/skeleton), error (retry), and empty (helpful message).

#### Scenario: API failure shows error state
- **WHEN** the API returns an error on any screen
- **THEN** the screen SHALL display an error message with a retry option
- **THEN** the app SHALL NOT crash

## MODIFIED Requirements

### Requirement: Progressive Web App with offline support
The PWA app SHALL support offline access. Additionally, the React Native mobile apps SHALL support offline caching via `@react-native-async-storage/async-storage`.

#### Scenario: React Native app caches offline
- **WHEN** a student views content while online
- **THEN** it SHALL be cached via AsyncStorage
- **WHEN** the student opens the app offline
- **THEN** cached content SHALL be available
