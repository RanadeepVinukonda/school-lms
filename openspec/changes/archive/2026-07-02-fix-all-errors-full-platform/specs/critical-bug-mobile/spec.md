## ADDED Requirements

### Requirement: TouchableOpacity uses onPress, not onClick
All `TouchableOpacity` components in all three mobile apps SHALL use the `onPress` prop (React Native) instead of `onClick` (web React).

#### Scenario: Tap handlers are functional
- **WHEN** a user taps any `TouchableOpacity` element
- **THEN** the corresponding handler SHALL execute
- **THEN** all 46 occurrences across teacher, student, and parent apps SHALL be corrected

### Requirement: React Native style properties are valid
All style objects SHALL use valid React Native property names.

#### Scenario: Borders render correctly
- **WHEN** a component uses `borderWidth` in its style
- **THEN** the border SHALL render with the specified width
- **THEN** no style object SHALL use `borderBorderWidth` (invalid)

#### Scenario: Letter spacing uses correct property
- **WHEN** a component specifies letter spacing
- **THEN** it SHALL use `letterSpacing`, not `trackingWith`

#### Scenario: Text transform uses correct property
- **WHEN** a component requires uppercase text
- **THEN** it SHALL use `textTransform: 'uppercase'`, not `uppercase: true`

### Requirement: All HTML elements are replaced with React Native equivalents
No HTML-specific elements (`<label>`, `<div>`, etc.) SHALL be used in React Native `render` functions.

#### Scenario: Labels render as Text components
- **WHEN** a form needs a label
- **THEN** it SHALL use `<Text>` with appropriate styling
- **THEN** no `<label>` elements SHALL appear in any screen file

### Requirement: Missing asset files are created
Each mobile app SHALL have the required asset files referenced in its `app.json`.

#### Scenario: Expo build finds assets
- **WHEN** Expo loads the app
- **THEN** `./assets/icon.png`, `./assets/splash.png`, `./assets/adaptive-icon.png`, and `./assets/favicon.png` SHALL exist
- **THEN** the app SHALL build without asset-related warnings

### Requirement: app.json has required platform configuration
Each mobile app's `app.json` SHALL include `android.package`, `ios.bundleIdentifier`, and required Expo plugins.

#### Scenario: Platform builds succeed
- **WHEN** building for Android
- **THEN** `android.package` SHALL be defined
- **WHEN** building for iOS
- **THEN** `ios.bundleIdentifier` SHALL be defined

### Requirement: react-native-gesture-handler is installed
All three mobile apps SHALL include `react-native-gesture-handler` as a dependency for stack navigation.

#### Scenario: Stack gestures work
- **WHEN** a user navigates between screens using swipe gestures
- **THEN** the gesture animation SHALL play correctly
- **THEN** no missing module errors SHALL occur
