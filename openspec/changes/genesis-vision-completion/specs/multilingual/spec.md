## ADDED Requirements

### Requirement: Hindi, Tamil, Kannada AI Tutor support
The system SHALL support Hindi, Tamil, and Kannada in the AI Tutor chat, extending the existing English/Telugu support.

#### Scenario: Student selects Hindi in AI Tutor
- WHEN a student selects "Hindi" in the AI Tutor language dropdown
- THEN the system prompt appends "Respond in Hindi" to the AI request
- WHEN the AI responds
- THEN the response is displayed in Hindi Devanagari script

#### Scenario: Student speaks in Hindi
- WHEN a student uses voice input in Hindi
- THEN the Web Speech API recognizes Hindi speech and sends it as the query
- WHEN the AI responds in Hindi
- THEN speech synthesis reads the response in Hindi

### Requirement: UI i18n for Hindi, Tamil, Kannada
The frontend SHALL switch UI labels to the selected language.

#### Scenario: Parent switches UI to Tamil
- WHEN a parent selects "தமிழ்" in the language settings
- THEN all navigation labels, buttons, and static text display in Tamil
- WHEN they log out and back in
- THEN the language preference persists

### Requirement: Translation management
The system SHALL maintain a translations file for each language.

#### Scenario: Translation key is missing
- WHEN a UI string has no translation for the selected language
- THEN the English fallback is displayed
