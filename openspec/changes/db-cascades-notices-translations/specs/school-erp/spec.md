## MODIFIED Requirements

### Requirement: Notice board and announcements
Admins and teachers SHALL be able to post notices visible to all users of a school. Notices SHALL support text, images, and attachments. Each notice SHALL have an expiry date. The notice board selection UI SHALL show and distinguish classes by their specific sections.

#### Scenario: Expired notices are hidden
- **WHEN** a notice's expiry date has passed
- **THEN** it SHALL no longer appear in the notice board for students and parents
- **THEN** it SHALL remain visible to admins in the archived notices section

#### Scenario: Class dropdown shows sections
- **WHEN** an admin views the Target Class dropdown on the notice board creation page
- **THEN** classes with sections SHALL be displayed with their section identifier (e.g. "Grade 10 - Section A")
