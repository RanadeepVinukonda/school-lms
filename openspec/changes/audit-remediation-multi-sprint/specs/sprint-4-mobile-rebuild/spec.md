## ADDED Requirements

### Requirement: All React Native API errors fixed
Every screen SHALL use correct React Native APIs: `onPress` instead of `onClick`, `borderWidth` instead of `borderBorderWidth`, `Alert.alert()` instead of `alert()`, `letterSpacing` instead of `trackingWith`, `<Text>` instead of `<label>`, `textTransform: 'uppercase'` instead of `uppercase: true`.

#### Scenario: Touch interactions work
- **WHEN** a user taps any touchable element across all 3 apps
- **THEN** the `onPress` handler SHALL fire (46 instances across 24 screens)

### Requirement: Auth gating implemented
All three apps SHALL check authentication state at the navigator level. Unauthenticated users SHALL be redirected to a login screen.

#### Scenario: Unauthenticated user sees login
- **WHEN** an unauthenticated user opens the app
- **THEN** they SHALL see a login screen, not a dashboard with empty data

### Requirement: All 24 screens integrated with real API
Every screen across student, teacher, and parent apps SHALL use the shared `api` axios client from `@genesis-lms/shared` to fetch real data. No hardcoded mock data SHALL remain.

#### Scenario: Teacher dashboard loads real data
- **WHEN** a teacher opens the classes screen
- **THEN** it SHALL fetch the class list from `GET /api/classes`
- **THEN** it SHALL display loading state while fetching
- **THEN** it SHALL handle API errors gracefully

### Requirement: Loading, error, and empty states on every screen
Every screen SHALL handle three data states: loading (spinner/skeleton), error (retry option), and empty (helpful message).

#### Scenario: API fails on student dashboard
- **WHEN** the API returns a 500 error on the student dashboard
- **THEN** the screen SHALL display an error message with a retry button
- **THEN** the app SHALL NOT crash or show a blank screen

### Requirement: Offline cache persists
The offline cache SHALL use `@react-native-async-storage/async-storage` for persistence across app restarts, replacing the current in-memory Map stub.

#### Scenario: App restarts with cached data
- **WHEN** a user closes and reopens the app while offline
- **THEN** previously cached data SHALL be available from AsyncStorage
