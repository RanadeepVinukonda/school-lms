## ADDED Requirements

### Requirement: Lighthouse CI in GitHub Actions
The CI pipeline SHALL run Lighthouse audits on every pull request and enforce performance budgets.

#### Scenario: PR triggers Lighthouse audit
- WHEN a pull request is opened against main
- THEN the Lighthouse CI action runs on the deployed preview or build output
- WHEN any metric exceeds the budget
- THEN the PR check fails with a report comment

### Requirement: Performance budgets
The system SHALL enforce the following budgets:
- LCP (Largest Contentful Paint) ≤ 2.5s
- CLS (Cumulative Layout Shift) ≤ 0.1
- TBT (Total Blocking Time) ≤ 200ms
- SI (Speed Index) ≤ 3.0s

#### Scenario: Budgets are verified
- WHEN the Lighthouse CI runs
- THEN each metric is compared against its budget
- WHEN a metric exceeds the budget
- THEN the failing value and diff are reported in the CI output

### Requirement: Performance dashboard
The system SHALL store Lighthouse reports for trend analysis.

#### Scenario: Performance report storage
- WHEN a Lighthouse CI run completes
- THEN the JSON report is stored as a CI artifact
- WHEN the main branch is audited
- THEN the score history is saved for trend tracking
