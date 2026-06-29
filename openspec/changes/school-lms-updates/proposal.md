## Why

To enhance the School LMS with full cascade deletion for academic years, classes, and subjects; streamline teacher creation and class-based workflow segregation; simplify the textbook/concept structure; restrict student visibility to explicitly published content; and improve the test creation process with integrated AI generation.

## What Changes

- **BREAKING**: Deleting an Academic Year, Class, or Subject will cascade delete all related database records (except teacher accounts themselves).
- **BREAKING**: Teacher creation is restricted to the Class Hub's Teachers Tab; the "Assign Teacher" page is updated to select from existing teachers only.
- **BREAKING**: Teacher login flow is modified to require selecting a class first, which switches the application context and auto-filters all subsequent pages and data by the selected class and teacher assignments.
- **BREAKING**: Removed dedicated Question Bank page, visibility settings page, visibility push settings, and visibility configuration controls from the UI.
- Support uploading multiple textbooks per subject, retaining simplified sections (Lecture, Notes & Resources, Mindmap).
- Introduced "Push to Students" for mindmaps, notes, resources, and tests, restricting student visibility to pushed content only.
- Added a "Mark as Completed" status button for concepts to track progress.
- Revamped test template creation with live preview, manual question input, and AI-generated question insertion.

## Capabilities

### New Capabilities
- `academic-year-cascade`: Cascade deletes all classes and child records when an academic year is deleted.
- `class-cascade`: Cascade deletes students, subjects, textbooks, mindmaps, tests, question banks, and assignments when a class is deleted.
- `subject-cascade`: Cascade deletes textbooks, chapters, concepts, notes, mindmaps, question banks, and tests for that subject when a subject is deleted.
- `teacher-management-flow`: Restricts teacher creation to the Teachers Tab, updating "Assign Teacher" to selection-only.
- `teacher-class-select`: Post-login class selection screen and context switcher to filter app data by class and assigned subjects.
- `textbook-management`: Multi-textbook support per subject showing existing textbooks when opened.
- `textbook-structure`: Simplified concept layout containing only Lecture, Notes & Resources, and Mindmap.
- `mindmap-publishing`: Explicit student visibility control for mindmaps via a "Push to Students" action.
- `student-visibility-rules`: Restricts student views of lectures, notes, resources, mindmaps, and tests to pushed content only.
- `concept-progress-tracking`: "Mark as Completed" tracking for concepts.
- `test-creation-ai`: Test template editor with live preview, manual editing, and AI question generation.
- `question-bank-integration`: Backend-only question bank linked to concepts for saving manually created and AI-generated questions.
- `remove-visibility-system`: Clean up global visibility settings and unused menu options.

### Modified Capabilities

## Impact

- **Database**: Schema updates to support cascade deletes, multiple textbooks, progress tracking, and backend question bank storage.
- **Backend API**: Endpoints for cascade deletes, progress marking, multiple textbooks, test generation, and teacher class filtering.
- **Frontend Pages**: Class Hub, Teachers page, Teacher dashboard (class selection landing, class switcher, filtered views), Textbook/Concept viewer, Test Template editor.
