## 1. Class Scoped Teacher Workflow - Backend

- [x] 1.1 Create ClassScope context provider with selectedClass state and localStorage persistence
- [x] 1.2 Create class selection gateway page for teacher login flow
- [x] 1.3 Create class selection API endpoint to fetch teacher's assigned classes
- [x] 1.4 Add class switcher component to teacher dashboard header
- [x] 1.5 Wrap teacher routes in ClassScope provider

## 2. Admin Class Management - Backend

- [x] 2.1 Create class CRUD API endpoints (create, read, update, delete)
- [x] 2.2 Create subject CRUD API endpoints scoped to class (create, rename, delete)
- [x] 2.3 Create student management API endpoints scoped to class (create, delete)
- [x] 2.4 Implement cascading delete for class (students, subjects, teacher assignments)
- [x] 2.5 Implement cascading delete for subject (textbooks, chapters, concepts, lectures, notes, mindmaps, question banks, test templates)
- [x] 2.6 Remove teacher registration from assign teacher flow - show only existing teachers
- [x] 2.7 Add Firestore indexes for class-scoped queries

## 3. Admin Class Management - Frontend

- [x] 3.1 Build class CRUD UI with create/edit/delete functionality
- [x] 3.2 Build subject management UI within class detail view
- [x] 3.3 Build student management UI within class detail view
- [x] 3.4 Update assign teacher dialog to show only existing teachers (remove registration)
- [x] 3.5 Add confirmation dialogs for cascade deletes

## 4. Teacher Content Push - Backend

- [x] 4.1 Add pushed boolean field to mindmap documents
- [x] 4.2 Create mindmap push API endpoint (toggle pushed field)
- [x] 4.3 Add pushed boolean field to test template documents
- [x] 4.4 Create test template CRUD API endpoints with push capability
- [x] 4.5 Create AI question generation cloud function using Gemini API
- [x] 4.6 Create question bank API endpoints per concept (create, read, delete)
- [x] 4.7 Add student-facing query filters for pushed content only
- [x] 4.8 Remove question bank page endpoint and push settings endpoints

## 5. Teacher Content Push - Frontend

- [x] 5.1 Add Push button to mindmaps tab in concept view
- [x] 5.2 Build test template creation form with live preview
- [x] 5.3 Add "Fill with AI" button in test template creation
- [x] 5.4 Build question bank management within concept context
- [x] 5.5 Remove standalone question bank page from navigation
- [x] 5.6 Remove visibility/push settings page from concept pages
- [x] 5.7 Add push state indicators on content items for teacher view

## 6. Concept Progress Tracking - Backend

- [x] 6.1 Add completed boolean field to concept documents per teacher-class
- [x] 6.2 Create concept completion API endpoint (toggle completed)
- [x] 6.3 Create progress aggregation API for teacher (completed/total per subject)
- [x] 6.4 Create student-facing progress API (shows progress without content)

## 7. Concept Progress Tracking - Frontend

- [x] 7.1 Add Completed button to concept pages for teachers
- [x] 7.2 Build progress indicators in subject concept list view
- [x] 7.3 Build student progress view showing completion status only
- [x] 7.4 Ensure student view hides non-pushed content but shows progress

## 8. Integration & Testing

- [x] 8.1 Test class creation and cascading deletion
- [x] 8.2 Test teacher class selection and switching
- [x] 8.3 Test content push flow (mindmap, test template)
- [x] 8.4 Test AI question generation and storage
- [x] 8.5 Test student visibility gating
- [x] 8.6 Test concept progress tracking across teacher-class combinations
- [x] 8.7 Test edge cases (empty classes, single teacher, multiple classes)
