## ADDED Requirements

### Requirement: RLS on all school-scoped tables
Every table with a `school_id` column that does not have RLS enabled SHALL have RLS policies added. This covers concept_releases, fee_structures, fee_payments, notice_board, transport_*, inventory_*, staff_*, curriculum_*, concept_mastery, ai_tutor_sessions, virtual_lab_progress, pre_primary_content, coding_challenges, and all junction tables.

#### Scenario: All tables with school_id have RLS
- **WHEN** querying any business table from a different school
- **THEN** RLS SHALL filter results to the current school only
- **THEN** cross-school data SHALL never be visible

### Requirement: School scope enforced in middleware
The auth middleware SHALL extract `school_id` from the JWT and attach it to the request context. All service-layer queries SHALL include `school_id` as a filter.

#### Scenario: API request includes school scope
- **WHEN** a user makes any API request
- **THEN** the middleware SHALL validate school_id from JWT claims
- **THEN** all service queries SHALL filter by the validated school_id

## MODIFIED Requirements

### Requirement: Every entity is scoped to a school
Every database table representing school data SHALL have a `school_id` column. RLS policies SHALL be enabled on ALL such tables (audit identified 20+ tables without RLS). All queries SHALL include a `school_id` filter.

#### Scenario: Student cannot access another school's data
- **WHEN** a student from School A queries any endpoint
- **THEN** all results SHALL contain only data with `school_id` matching School A
- **THEN** data from School B SHALL never appear in the response

#### Scenario: RLS policy enforces isolation on all tables
- **WHEN** a direct database query is made without application filtering
- **THEN** PostgreSQL RLS policies on ALL business tables SHALL prevent cross-school data access
- **THEN** only rows matching the session's `school_id` claim SHALL be returned
