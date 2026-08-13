# POSTMORTEM Template

## Incident Summary

| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD |
| **Duration** | HH:MM — HH:MM UTC |
| **Severity** | SEV-1 / SEV-2 / SEV-3 / SEV-4 |
| **Reported by** | Name |
| **Affected components** | List of affected services |

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert triggered |
| HH:MM | Engineer acknowledged |
| HH:MM | Diagnosis started |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |
| HH:MM | Monitoring confirmed healthy |

## Root Cause

[Describe what went wrong at the system level, not who made a mistake.]

## Impact

- **Users affected**: [approximate count]
- **Features degraded/offline**: [list]
- **Data loss**: [yes/no — describe extent]
- **Financial impact**: [if applicable]

## Detection

- [ ] Automated alert (Prometheus/PagerDuty)
- [ ] User report
- [ ] Internal monitoring
- [ ] During normal work

## Response

### What Went Well
- [List]
- [List]

### What Went Wrong
- [List]
- [List]

## Action Items

| # | Action | Owner | Target Date | Status |
|---|--------|-------|------------|--------|
| 1 | | | | [ ] |
| 2 | | | | [ ] |
| 3 | | | | [ ] |

## Follow-Up

- [ ] Action items tracked in project board
- [ ] Runbook updated (if applicable)
- [ ] Monitoring alert thresholds reviewed
- [ ] Stakeholders notified

---

*Blameless post-mortem: Focus on the system and process, not individuals.*
