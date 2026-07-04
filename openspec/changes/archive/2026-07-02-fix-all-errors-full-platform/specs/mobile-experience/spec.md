## ADDED Requirements

### Requirement: TouchableOpacity uses onPress
All `TouchableOpacity` components SHALL use `onPress` instead of `onClick`.

#### Scenario: User interactions work
- **WHEN** a user taps any touchable element
- **THEN** the tap handler SHALL execute
- **THEN** all 46 occurrences across all mobile apps SHALL use `onPress`

### Requirement: React Native style properties are valid
All styles SHALL use valid React Native property names (`borderWidth`, `letterSpacing`, `maxWidth`, `textTransform`).

#### Scenario: Borders render
- **WHEN** a component specifies border styling
- **THEN** `borderWidth` SHALL be used (not `borderBorderWidth`)

### Requirement: No HTML elements in React Native render
Screen files SHALL NOT use HTML elements like `<label>`.

#### Scenario: Labels use Text component
- **WHEN** a form label is rendered
- **THEN** it SHALL use `<Text>` from React Native
- **THEN** no `<label>` elements SHALL exist in any screen file
