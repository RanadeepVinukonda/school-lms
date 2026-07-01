# Multi-Tenant SaaS Architecture

## Purpose
Enable a single deployment of the LMS to serve multiple schools (tenants) with strict data isolation, tenant-specific branding, subscription-based feature gating, and centralized provisioning.

## Requirements

### Requirement: Every entity is scoped to a school
Every database table representing school data SHALL have a `school_id` column. All queries SHALL include a `school_id` filter matching the authenticated user's school. No user SHALL access data from a different school.

#### Scenario: Student cannot access another school's data
- **WHEN** a student from School A queries any endpoint
- **THEN** all results SHALL contain only data with `school_id` matching School A
- **THEN** data from School B SHALL never appear in the response

#### Scenario: RLS policy enforces isolation
- **WHEN** a direct database query is made without application filtering
- **THEN** PostgreSQL RLS policies SHALL prevent cross-school data access
- **THEN** only rows matching the session's `school_id` claim SHALL be returned

### Requirement: Tenant-aware authentication
The authentication system SHALL embed `school_id` in the JWT token. All API middleware SHALL extract and validate `school_id` from the token before processing requests.

#### Scenario: Token contains school context
- **WHEN** a user logs in
- **THEN** the returned JWT SHALL include `school_id` in its claims
- **THEN** the token SHALL be rejected if `school_id` is missing or invalid

### Requirement: School provisioning by platform admin
New schools SHALL be provisioned by a platform super-admin. Self-registration SHALL NOT be available. Each school gets a unique `school_id`, subdomain, and initial admin account.

#### Scenario: Admin provisions a new school
- **WHEN** the platform admin creates a new school with name, subdomain, and admin email
- **THEN** a new school record SHALL be created in the `schools` table
- **THEN** an initial admin user SHALL be created with the school's `school_id`
- **THEN** the admin SHALL receive a welcome email with login credentials

### Requirement: Tenant-specific branding
Each school SHALL be able to configure its logo, primary color, and school name displayed in the UI.

#### Scenario: School branding is applied
- **WHEN** a user from School A logs in
- **THEN** the UI SHALL display School A's logo and primary color
- **THEN** the school name SHALL appear in the header and page title

### Requirement: Subscription and billing
Each school SHALL have a subscription plan (Free, Starter, Professional, Enterprise) with defined feature limits. Billing events SHALL be logged for revenue tracking.

#### Scenario: Feature gate enforces plan limits
- **WHEN** a school on the Free plan attempts to use an Enterprise-only feature
- **THEN** the system SHALL return a 402 Payment Required response
- **THEN** the response SHALL include a message directing to the upgrade page
