## ADDED Requirements

### Requirement: Text-based AI tutoring
Students SHALL be able to ask questions to the AI tutor via text chat. The tutor SHALL provide step-by-step explanations, hints on demand, and follow-up questions to check understanding.

#### Scenario: Student asks a math question
- **WHEN** a student types "How do I solve quadratic equations?" in the AI tutor chat
- **THEN** the tutor SHALL respond with a step-by-step explanation within 3 seconds
- **THEN** the tutor SHALL offer "Would you like a practice problem?" at the end

### Requirement: Bilingual responses (English and Telugu)
The AI tutor SHALL respond in the student's preferred language. English and Telugu SHALL both be supported. The student SHALL be able to switch languages mid-conversation.

#### Scenario: Telugu language response
- **WHEN** a student's language preference is set to Telugu
- **THEN** all AI tutor responses SHALL be in Telugu
- **THEN** mathematical notation and formulas SHALL remain in standard notation

### Requirement: Concept-contextual tutoring
When a student opens the AI tutor from within a concept page, the tutor SHALL automatically have context about the current concept and SHALL answer questions in the context of that concept.

#### Scenario: Contextual tutor knows the topic
- **WHEN** a student opens the AI tutor while studying "Photosynthesis"
- **THEN** the tutor's first message SHALL acknowledge the current concept
- **THEN** generic questions like "what is this?" SHALL be answered in the context of Photosynthesis

### Requirement: Voice chat support
Students SHALL be able to interact with the AI tutor using voice input. The tutor SHALL respond with synthesized speech. Voice interaction SHALL work on both web and mobile.

#### Scenario: Voice question is answered
- **WHEN** a student speaks a question into the voice interface
- **THEN** the system SHALL transcribe the speech within 2 seconds
- **THEN** the AI tutor SHALL respond with both text and audio output
