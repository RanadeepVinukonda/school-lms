## 1. Database Migrations

- [x] 1.1 Create migration files for new database schema updates including cascade configuration options
- [x] 1.2 Run supabase migrations to update postgres DB schemas locally

## 2. Cascade Deletions Implementations

- [x] 2.1 Implement cascade delete for academic years recursively deleting child classes and associated records
- [x] 2.2 Implement cascade delete for classes deleting students, assignments, timetable, attendance, subjects, and textbooks
- [x] 2.3 Implement cascade delete for subjects deleting textbooks, chapters, concepts, mindmaps, quizzes, and tests

## 3. Teacher Management & Login Flow

- [x] 3.1 Restrict teacher account creation to Class Hub Teachers Tab and remove registration from Assign page
- [x] 3.2 Implement Select Class landing page post-login redirecting teachers who haven't selected a class context
- [x] 3.3 Add global Class Switcher component in header/sidebar updating active context globally
- [x] 3.4 Filter subjects, textbooks, lectures, and tests views based on selected class and assigned teacher context

## 4. Textbook & Concept Simplify

- [x] 4.1 Support multiple textbooks per subject displaying previously uploaded textbooks on subject open
- [x] 4.2 Restructure concept layout keeping only Lecture Page, Notes & Resources, and Mindmap tabs in UI
- [x] 4.3 Remove visibility configuration settings, menus, and visibilities management pages completely

## 5. Explicit Publishing & Visibility Rules

- [x] 5.1 Add "Push to Students" action buttons for mindmaps, notes, resources, and tests
- [x] 5.2 Restrict student dashboards to display only explicitly pushed contents and concept progress tracking
- [x] 5.3 Implement "Mark as Completed" button on concept pages updating teaching progress and syllabus completion metrics

## 6. Test Creation & Question Bank

- [ ] 6.1 Revamp test creation editor supporting manual questions input and real-time live preview update
- [ ] 6.2 Implement "Generate Questions with AI" using Gemini integration saving outputs directly into backend-only question bank
