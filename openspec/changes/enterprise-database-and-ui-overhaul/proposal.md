## Why

The current LMS database uses a hybrid SQL/JSONB model with array columns for relationships, no proper RBAC, no normalization, and no referential integrity. This causes bugs across the UI (duplicate class names, undefined analytics values, broken dropdowns, missing data) and cannot scale to support 10,000+ schools. A complete database architecture overhaul is needed — modeled after enterprise-grade EdTech platforms — with corresponding backend API changes and frontend fixes to restore and improve all functionality.

## What Changes

- **BREAKING**: Replace the hybrid SQL/JSONB model with a fully normalized relational PostgreSQL schema
- **BREAKING**: Replace single `role` field with proper RBAC (roles, permissions, user_roles, role_permissions tables)
- **BREAKING**: Add proper `classes` + `sections` tables with unique `class-section` naming
- **BREAKING**: Remove all `TEXT[]` array columns, replace with junction tables (teacher_class_assignments, class_students, etc.)
- Add missing core entities: `academic_years`, `terms`, `subjects`, `grades`, `sections`
- Add business logic constraints, unique constraints, check constraints, foreign keys
- Add comprehensive indexing strategy and partitioning for large tables
- Add auditing tables: `audit_logs`, `activity_logs`, `login_history`
- Add attendance module tables: `student_attendance`, `attendance_sessions`
- Add examination module tables: `exams`, `exam_subjects`, `marks`, `report_cards`
- Add fee management tables: `fee_categories`, `invoices`, `transactions`
- Add AI/embedding tables: `embeddings`, `tutor_messages`, `retrieval_logs`
- Backend: Rewrite all database queries, controllers, services, and validators to use new schema
- Frontend: Fix class-section dropdowns across attendance, fee, timetable pages
- Frontend: Categorize students by class in admin students page
- Frontend: Fix school analytics (undefined% avg performance, trends tab data loading)
- Frontend: Fix thick placeholder text styling across pages
- Frontend: Display quick links neatly on EPR dashboard
- Frontend: Display badges neatly on student rewards page
- Frontend: Add back navigation from stream projects in coding page
- Frontend: Display student's class timetable on timetable page
- Frontend: Convert academic year text input to dropdown with selection

## Capabilities

### New Capabilities
- `enterprise-database`: Fully normalized relational schema with RBAC, constraints, indexes, RLS policies, partitioning, auditing, and support for 10K+ schools
- `class-section-management`: Proper classes + sections tables with unique class-section display naming
- `analytics-fix`: Fix school analytics undefined values and trends tab data loading
- `ui-polish-dropdowns`: Fix class-section dropdown display across attendance, fee, timetable, and academic year inputs
- `ui-polish-general`: Fix thick placeholders, badge display, quick links layout, back navigation, and timetable display

### Modified Capabilities
- `database-consolidation`: Requirements need updating — the consolidation is now a full normalization, not just adapter unification
- `multi-tenant-saas`: Requirements need updating — add RBAC, proper school_id on all tables, RLS policies
- `school-erp`: Requirements need updating — fee, timetable, attendance tables are now typed SQL tables, not JSONB views
- `analytics-engine`: Requirements need updating — analytics queries must reference new normalized schema

## Impact

- **Database**: Full migration from hybrid model to normalized schema — all migration files rewritten, all views rebuilt, new RLS policies
- **Backend** (`lms/backend/`): Every controller, service, route, validator, and test referencing database tables affected
- **Frontend** (`lms/frontend/`): Attendance, fee, timetable, analytics, students, rewards, coding, dashboard pages affected
- **Mobile** (`lms/mobile/`): Minor — shared types and API client updates
- **Search** (`lms/search/`): Index population queries may need updating
- **Infrastructure**: New indexes will require migration planning for zero-downtime deployment
