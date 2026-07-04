# Database Architecture Improvement Specification

## Objective

Transform the current school LMS database into an enterprise-grade,
multi-tenant architecture comparable to modern LMS, ERP, and EdTech
platforms.

## Core Principles

-   Fully normalized relational design.
-   Remove redundant arrays and duplicated relationships.
-   Enforce strict referential integrity.
-   Design for horizontal scaling and multi-tenancy.
-   Support auditability and compliance requirements.
-   Support analytics and AI workloads.
-   Ensure all business rules are enforceable at database level where
    possible.

## Required Improvements

### Identity and Access

-   Replace single role field with RBAC:
    -   roles
    -   permissions
    -   role_permissions
    -   user_roles
-   Support multiple roles per user.
-   Support school-specific permissions.

### Multi-Tenant Architecture

-   Every business table must include school_id.
-   Implement Row Level Security policies.
-   Prevent cross-school data access.

### Normalization

-   Remove array fields storing relationships.
-   Replace with junction tables.

Examples: - parent_student_relationships - teacher_class_assignments -
teacher_subject_assignments - class_students

### Missing Core Entities

Create: - classes - sections - grades - subjects - academic_years -
terms/semesters

### Business Logic Rules

Examples: - One active enrollment per student per academic year. - One
primary class teacher per class. - Student roll numbers unique within
class and academic year. - Fee payments cannot exceed due amount. -
Payroll cannot run twice for same employee and month. - Transport
attendance limited to one record per route, date and direction.

### Constraints

Add: - unique constraints - check constraints - foreign keys - exclusion
constraints where useful

### Indexing Strategy

Create indexes for: - all foreign keys - school_id - status -
created_at - updated_at - search columns

### Auditing

Create: - audit_logs - activity_logs - login_history

### Attendance

Create: - student_attendance - attendance_sessions -
attendance_exceptions

### Examination Module

Create: - exams - exam_subjects - marks - report_cards - grading_rules

### Assignment Module

Create: - assignments - submissions - grades - rubrics

### Fee Management

Create: - fee_categories - invoices - invoice_items - discounts -
scholarships - transactions

### AI Architecture

Create: - embeddings table - vector indexes - chunk metadata - tutor
messages table - retrieval logs

### Performance

Target: - support 10,000+ schools - support millions of students -
support analytics workloads

## Deliverables Expected From AI

1.  Produce an ER diagram.
2.  Produce migration plan.
3.  Identify denormalization opportunities for analytics.
4.  Add all missing constraints and indexes.
5.  Generate RLS policies.
6.  Generate seed data strategy.
7.  Review every table for business-rule correctness.
8.  Suggest partitioning strategy for large tables.
9.  Suggest caching strategy.
10. Produce production readiness checklist.

## Goal

The final architecture should match or exceed industry practices used by
modern LMS, ERP and EdTech platforms.
