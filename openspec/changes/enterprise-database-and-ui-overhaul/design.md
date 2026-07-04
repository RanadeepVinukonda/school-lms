## Context

The LMS backend uses a hybrid data model where 11 typed SQL tables coexist with a JSONB document store (`nosql_docs`) that holds 40+ collections. Relationships use `TEXT[]` array columns (e.g., `users.class_ids`), foreign keys are not enforced, and business logic lives entirely in application code. The frontend has accumulated UI inconsistencies — duplicate class names in dropdowns, undefined analytics values, missing back navigation — because the underlying data model lacks proper class + section distinction and referential integrity.

## Goals / Non-Goals

**Goals:**
- Fully normalized relational PostgreSQL schema with proper FKs, constraints, indexes, and RLS
- RBAC with roles, permissions, and multi-role support per user
- Proper `classes` + `sections` tables with unique display naming (e.g., "Class 1-A")
- Students categorized by class:section in admin views
- Fix undefined analytics values and trends tab data loading
- Fix all class-section dropdowns (attendance, fee, timetable, academic year)
- Fix thick placeholder styling, badge display, quick links layout
- Add back navigation from stream projects in coding page
- Display student's class timetable
- All backend controllers, services, and validators updated for new schema

**Non-Goals:**
- No mobile app UI changes (mobile API client updates only for type changes)
- No new features beyond fixing existing broken ones
- No Elasticsearch schema changes (index population may need minor tweaks)
- No Docker/infra changes beyond what migrations require

## Decisions

1. **Full normalization over incremental refactor**: The current hybrid model has too many array columns, missing FKs, and JSONB catch-alls. Incremental fixes would leave the system in a mixed state. A single migration to normalized schema is safer long-term.
2. **Keep `nosql_docs` for truly dynamic content**: Features like gamification achievements and user preferences that have no fixed schema stay in `nosql_docs`. All core entities (classes, sections, students, teachers, attendance, fees, exams, timetable, assignments) become typed tables.
3. **Phase migration with backward-compatible views**: Create PostgreSQL views that mimic the old structure so the frontend can be updated incrementally after the backend migration.
4. **RBAC instead of single role**: The current single `role` column (admin/teacher/student/parent) is replaced with `roles` + `permissions` junction tables, allowing users to hold multiple roles and school-specific permissions.
5. **Class-section naming convention**: `classes` table stores grade/level, `sections` table stores section name. Display name is `CONCAT(classes.name, '-', sections.name)` — e.g., "Class 1-A".

## Risks / Trade-offs

- **Migration complexity**: Moving from JSONB to typed tables is a breaking change. Mitigation: Run migration in a maintenance window, use database views for backward compatibility during transition.
- **Performance**: Additional joins may slow some queries. Mitigation: Comprehensive indexing strategy, materialized views for analytics, query optimization pass.
- **Frontend breakage**: API response shapes change. Mitigation: Update backend responses to maintain backward-compatible shapes where possible, or update frontend queries in the same sprint.
- **Data loss**: Array columns may have orphaned references. Mitigation: Pre-migration audit script to identify and fix orphaned references before the migration.
