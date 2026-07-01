## Why

The current LMS has fragmented class and teacher management: teachers can be registered from the assignment flow (should be Class Hub only), deleting a class doesn't cascade properly, and teachers lack a focused class-based workflow after login. Students currently see everything regardless of teacher push state. This change unifies admin class management, cleans up cascading deletes, and gives teachers a class-scoped workspace with controlled content delivery to students.

## What Changes

- **Admin**: Academic year CRUD already exists - no change. Add full class CRUD with cascading deletion (students, subjects, teacher assignments, subject data).
- **Admin**: Subject management within classes - create, rename, delete subjects. Delete cascades to all content (textbooks, chapters, concepts, lectures, notes, mindmaps).
- **Admin**: Student creation within classes. Remove "register new teacher" from assign teacher flow - teachers only created in Class Hub > Teachers tab.
- **Admin**: Class deletion cascades to all related data: students, subjects, teacher-class assignments, subject content, test templates, question banks.
- **Teacher**: After login, show class selection gateway. Teacher selects a class, then all pages are scoped to that class. One-time switch that affects entire session until they switch again.
- **Teacher**: Teaching pages show subjects for selected class. Upload/delete textbooks. Textbooks show chapters > concepts > lecture pages, notes & resources, mindmaps.
- **Teacher**: Remove question bank page and visibility/push settings from concept pages. Remove push settings entirely.
- **Teacher**: Mindmaps tab gets a "Push" button. Students only see progress until teacher pushes content.
- **Teacher**: Completed button per concept to track teaching progress.
- **Teacher**: Push test button per concept - creates template with live preview. "Fill with AI" button generates questions. Templates and question bank stored per concept.
- **Student**: See only teaching progress. Notes, mindmaps, tests visible only after teacher pushes them.

## Capabilities

### New Capabilities
- `class-scoped-teacher-workflow`: Teacher login gateway, class selection, class-scoped pages, class switching
- `admin-class-management`: Class CRUD with full cascading deletion, subject management within classes
- `teacher-content-push`: Push mechanism for mindmaps and tests, student visibility gating, AI test generation
- `concept-progress-tracking`: Completed button per concept, progress tracking for teachers and students

### Modified Capabilities
<!-- No existing specs to modify - this is a new spec set -->

## Impact

- **Backend**: Firestore rules and security rules need updates for class-scoped data access. New cloud functions for cascading deletion and AI question generation.
- **Frontend**: Teacher dashboard restructured with class selection gateway. All teacher pages wrapped in class scope. Admin class management UI updates. Student views gated by push state.
- **Database**: New fields/indexes for class-scoped queries. Cascading delete logic for class, subject, and teacher data.
- **Auth**: Teacher login flow modification to include class selection step.
- **API**: New endpoints for class-scoped data fetching, content push operations, AI test generation.
