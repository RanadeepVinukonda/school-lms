## ADDED Requirements

### Requirement: Synchronized Language Selection
The language switcher SHALL update both the local application store state and the logged-in user profile, persisting the preference to the database immediately to ensure consistent translation across all pages.

#### Scenario: Language change updates user state and DB
- **WHEN** a logged-in user selects a new language in the switcher
- **THEN** the language store SHALL be updated with the new language code
- **THEN** the auth store user profile language property SHALL be updated with the new language code
- **THEN** the database profile language for the user SHALL be updated via supabase update API
