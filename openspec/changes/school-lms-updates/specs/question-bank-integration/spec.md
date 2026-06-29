## ADDED Requirements

### Requirement: Backend-only question bank linked to concepts
The system SHALL store manual and AI-generated questions in a backend question bank linked directly to concepts, without exposing a dedicated question bank page in the UI.

#### Scenario: Retrieving questions for a test
- **WHEN** Teacher opens a test template for a concept
- **THEN** The system loads questions associated with that concept from the backend question bank
