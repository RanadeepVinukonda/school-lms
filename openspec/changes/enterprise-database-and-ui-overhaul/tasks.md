## 1. Database Schema - Core Normalization

- [ ] 1.1 Create new SQL migration with `classes` and `sections` tables (with FK to schools)
- [ ] 1.2 Create `subjects`, `grades`, `academic_years`, `terms` tables
- [ ] 1.3 Create `roles`, `permissions`, `role_permissions`, `user_roles` tables (RBAC)
- [ ] 1.4 Create junction tables: `parent_student_relationships`, `teacher_class_assignments`, `teacher_subject_assignments`, `class_students`
- [ ] 1.5 Add `school_id` FK column to all existing typed tables that lack it
- [ ] 1.6 Add unique, check, and FK constraints across all tables (business rules)
- [ ] 1.7 Create comprehensive indexes (all FKs, school_id, status, created_at, search columns, composite indexes)

## 2. Database Schema - Module Tables

- [ ] 2.1 Create attendance module tables: `attendance_sessions`, `student_attendance`, `attendance_exceptions`
- [ ] 2.2 Create examination module tables: `exams`, `exam_subjects`, `marks`, `report_cards`, `grading_rules`
- [ ] 2.3 Create fee management tables: `fee_categories`, `invoices`, `invoice_items`, `discounts`, `scholarships`, `transactions`
- [ ] 2.4 Create assignment module tables: `assignments`, `submissions`, `grades`, `rubrics`
- [ ] 2.5 Create AI/embedding tables: `embeddings`, `tutor_messages`, `retrieval_logs`
- [ ] 2.6 Create audit tables: `audit_logs`, `activity_logs`, `login_history`

## 3. Database - RLS, Partitioning, Indexing

- [ ] 3.1 Enable RLS on all business tables and create school_id isolation policies
- [ ] 3.2 Add partitioning strategy for large tables (student_attendance, audit_logs, marks, transactions) by academic_year_id
- [ ] 3.3 Create PostgreSQL views for backward compatibility with old query patterns
- [ ] 3.4 Write data migration script to move existing data from JSONB/array columns to new tables

## 4. Backend - Adapter & Types

- [ ] 4.1 Update `TYPED_TABLES` and `TABLE_NAME_MAP` in database adapter to include all new tables
- [ ] 4.2 Update backend TypeScript types/interfaces for new schema (classes, sections, subjects, etc.)
- [ ] 4.3 Remove old array column references from all services and controllers
- [ ] 4.4 Update Zod validators to match new schema shapes
- [ ] 4.5 Update route handlers that reference old JSONB document paths

## 5. Backend - Services & Controllers

- [ ] 5.1 Rewrite class/section management services and controllers
- [ ] 5.2 Rewrite student management services (categorized by class-section)
- [ ] 5.3 Rewrite attendance services to use new `attendance_sessions`/`student_attendance` tables
- [ ] 5.4 Rewrite fee management services to use new `invoices`/`transactions` tables
- [ ] 5.5 Rewrite timetable services to reference sections properly
- [ ] 5.6 Rewrite analytics services to query normalized schema (fix undefined% and trends)
- [ ] 5.7 Rewrite examination services to use new `marks`/`exam_subjects` tables
- [ ] 5.8 Implement RBAC middleware and permission-checking utilities

## 6. Frontend - Dropdown & Class-Section Fixes

- [ ] 6.1 Create reusable `ClassSectionDropdown` component that displays "Class X-Y" format (reference notice board dropdown pattern)
- [ ] 6.2 Fix attendance page class dropdown to use `ClassSectionDropdown`
- [ ] 6.3 Fix fee management page class dropdown to use `ClassSectionDropdown`
- [ ] 6.4 Fix timetable page class dropdown to use `ClassSectionDropdown`
- [ ] 6.5 Fix admin class hub page to display distinct class-section entries
- [ ] 6.6 Convert academic year text input to dropdown component

## 7. Frontend - Analytics Fixes

- [ ] 7.1 Fix school analytics average performance calculation to handle null/undefined values
- [ ] 7.2 Fix analytics Trends tab data loading to use correct API endpoints
- [ ] 7.3 Add graceful empty/error states for analytics widgets

## 8. Frontend - UI Polish

- [ ] 8.1 Categorize students by class-section in admin students page with filter
- [ ] 8.2 Fix thick/bold placeholder text styling across all input fields
- [ ] 8.3 Display quick links in a neat organized grid on EPR dashboard
- [ ] 8.4 Display badges in a clean grid layout on student rewards page
- [ ] 8.5 Add back navigation button from stream projects view in coding page
- [ ] 8.6 Display student's own class timetable on timetable page (auto-load for logged-in student)

## 9. Testing & Verification

- [ ] 9.1 Run all backend tests and fix failures caused by schema changes
- [ ] 9.2 Run all frontend tests and fix failures
- [ ] 9.3 Run TypeScript type checking on backend and frontend
- [ ] 9.4 Manually verify all dropdowns display correct class-section names
- [ ] 9.5 Manually verify analytics page shows correct values
- [ ] 9.6 Manually verify student categorization and timetable display
