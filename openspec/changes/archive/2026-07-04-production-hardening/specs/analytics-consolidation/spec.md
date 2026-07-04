## ADDED Requirements

### Requirement: Single analytics service
The system SHALL have one analytics service instead of two (`analytics.service.ts` and `analytics-v2.service.ts`). The consolidated service SHALL use weighted averages (not avg-of-averages) for all aggregate calculations. The v1 service SHALL be deleted after all callers are migrated to the v2 endpoints.

#### Scenario: Overall average uses weighted calculation
- **WHEN** computing overall class average across multiple assessments
- **THEN** the result is `totalScore / totalMaxScore` (weighted), not `avg(avg(exam1), avg(exam2))`

### Requirement: NaN/Infinity guards in all percentage calculations
All percentage calculations SHALL use `Number.isFinite()` guard. If the divisor is zero or the result is non-finite, the percentage SHALL return 0. This replaces scattered individual guards with a single `safePct()` utility.

#### Scenario: Zero-division is handled
- **WHEN** calculating percentage with zero max score
- **THEN** result is 0, not NaN or Infinity

### Requirement: Teacher comparison prevents double-counting
The teacher comparison report SHALL deduplicate students enrolled in multiple classes with the same teacher. Each student SHALL be counted once per teacher regardless of class enrollment count.

#### Scenario: Student in multiple classes with same teacher
- **WHEN** building per-teacher comparison report
- **THEN** student appears once per teacher, not once per class

### Requirement: Trend bucketing uses exam date
Analytics trend bucketing SHALL use `examDate` field (not `createdAt`) for grouping exam results into time periods (weekly, monthly, term).

#### Scenario: Trend grouped by exam date
- **WHEN** generating monthly trend data
- **THEN** exam results are grouped by `examDate` month, not `createdAt` month
