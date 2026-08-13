# Data Retention & Deletion Policy

## Retention Schedule

| Data Category | Retention Period | Cleanup Action | Config Env Var |
|--------------|-----------------|----------------|----------------|
| Audit logs | 12 months | Hard delete | `AUDIT_LOG_RETENTION_DAYS=365` |
| User sessions | 30 days | Hard delete | `SESSION_RETENTION_DAYS=30` |
| Temp uploads | 7 days | Hard delete | `TEMP_UPLOAD_RETENTION_DAYS=7` |
| Password reset tokens | 1 hour | Hard delete | Hardcoded |
| Soft-deleted records | 90 days | Hard delete | `SOFT_DELETE_RETENTION_DAYS=90` |
| Fee payment records | 7 years (statute) | Retain (anonymized) | Hardcoded |
| Grade/attendance records | 7 years | Retain (anonymized) | Hardcoded |
| User accounts (deleted) | 30 days (grace) | Cascade delete/anonymize | Hardcoded |

## Automated Cleanup

Runbook: Database cleanup runs nightly via cron job.

```bash
# Dry run (reports what would be deleted)
npm run cleanup:dry

# Actual cleanup
npm run cleanup
```

### Cleanup Script

```ts
// Scheduled job: cleanupExpired.job.ts
async function cleanupExpiredData() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(env.AUDIT_LOG_RETENTION_DAYS));

  // Delete old audit logs
  await supabase.from('audit_logs')
    .delete()
    .lt('created_at', cutoff.toISOString());

  // Delete old sessions
  const sessionCutoff = new Date();
  sessionCutoff.setDate(sessionCutoff.getDate() - parseInt(env.SESSION_RETENTION_DAYS));
  await supabase.from('sessions')
    .delete()
    .lt('created_at', sessionCutoff.toISOString());

  // Clean up temp uploads
  const tempCutoff = new Date();
  tempCutoff.setDate(tempCutoff.getDate() - parseInt(env.TEMP_UPLOAD_RETENTION_DAYS));
  await supabase.from('temp_uploads')
    .delete()
    .lt('created_at', tempCutoff.toISOString());
}
```

## GDPR Deletion Cascade

When a user initiates account deletion:

1. **Day 0**: Account marked `deleted_at = now + 30 days`, `is_active = false`
2. **Grace period** (Day 0–30): Admin can restore account
3. **Day 30**: Cascade deletion:
   - Profile PII: nullified (name → "Deleted User", email → null)
   - Grades: student_id anonymized, scores retained
   - Attendance: student_id anonymized, records retained
   - Messages: content deleted, metadata retained
   - Sessions: revoked
   - Auth account: deleted from Supabase Auth

## Compliance Notes

- Fee records retained for audit purposes (7 years minimum)
- Backups deleted on their lifecycle schedule (not individually purged)
- Deletion logs retained for 12 months for compliance audit

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture
- [RUNBOOKS.md](./RUNBOOKS.md) — Database restore procedure
- [ZERO_DOWNTIME_MIGRATIONS.md](./ZERO_DOWNTIME_MIGRATIONS.md) — Migration strategies
