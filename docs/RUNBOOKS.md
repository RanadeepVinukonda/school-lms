# Runbooks — Incident Response & Common Procedures

## Table of Contents

1. [Database Restore](#1-database-restore)
2. [Deployment Rollback](#2-deployment-rollback)
3. [AI Provider Failover](#3-ai-provider-failover)
4. [Cache Invalidation](#4-cache-invalidation)
5. [SSL Certificate Renewal](#5-ssl-certificate-renewal)
6. [Secrets Rotation](#6-secrets-rotation)
7. [Database Migration Rollback](#7-database-migration-rollback)
8. [On-Call Contact Flow](#8-on-call-contact-flow)

---

## 1. Database Restore

**Symptoms:** Data corruption, accidental deletion, query failures
**Impact:** All users affected
**Estimated Time:** 15–30 minutes

### Steps

1. **Identify the correct backup**
   ```bash
   # List available backups
   aws s3 ls s3://school-lms-backups/database/ --human-readable
   ```

2. **Download the backup**
   ```bash
   aws s3 cp s3://school-lms-backups/database/school-lms-db-YYYY-MM-DD-HHMM.sql.gz .
   gunzip school-lms-db-YYYY-MM-DD-HHMM.sql.gz
   ```

3. **Verify checksum**
   ```bash
   sha256sum school-lms-db-YYYY-MM-DD-HHMM.sql
   # Compare with checksum stored alongside backup
   ```

4. **Restore to staging first** (verify integrity)
   ```bash
   psql -h staging-db-host -U admin -d school_lms_staging -f school-lms-db-YYYY-MM-DD-HHMM.sql
   ```

5. **Run data integrity queries**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM fee_payments;
   SELECT COUNT(*) FROM textbooks WHERE status = 'ready';
   ```

6. **Restore to production** (if staging verification passes)
   ```bash
   # Drain existing connections
   psql -h prod-db-host -U admin -d school_lms_prod -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'school_lms_prod' AND pid <> pg_backend_pid();"
   
   # Restore
   psql -h prod-db-host -U admin -d school_lms_prod -f school-lms-db-YYYY-MM-DD-HHMM.sql
   ```

7. **Verify production**
   - Check health endpoint: `curl https://api.school-lms.com/health/deep`
   - Verify critical data points (user count, recent activity)
   - Notify team via Slack

---

## 2. Deployment Rollback

**Symptoms:** Performance degradation, errors, broken functionality after deploy
**Impact:** Varies (depends on deployment)
**Estimated Time:** 5–10 minutes

### Prerequisites
- Previous Docker image tag known (deployments tagged by git SHA)
- CI/CD pipeline supports manual trigger with image tag

### Steps

1. **Identify the last known good version**
   ```bash
   git log --oneline -10
   ```

2. **Rollback via CI/CD** (recommended)
   - Go to GitHub Actions → Deploy workflow
   - Click "Run workflow"
   - Set tag to the last known good git SHA
   - Confirm deployment

3. **Manual rollback** (if CI/CD unavailable)
   ```bash
   ssh user@host
   cd /opt/school-lms
   docker compose stop
   # Edit docker-compose.yml to point to previous image tag
   docker compose pull
   docker compose up -d
   ```

4. **Verify rollback**
   - Health check passes: `curl https://api.school-lms.com/health/deep`
   - Error rate returns to baseline (Grafana)
   - Key user journeys work

5. **Post-rollback**
   - Notify team via Slack
   - Create ticket to fix the broken deployment
   - Mark the broken commit

---

## 3. AI Provider Failover

**Symptoms:** AI-related errors (tutor, textbook processing, question generation), timeouts
**Impact:** AI features degraded or unavailable
**Estimated Time:** 2–5 minutes (automatic), 10 minutes (manual)

### Automatic Failover
The AI service automatically falls back to secondary providers after 3 consecutive timeouts:
```
Primary (Gemini) → Secondary (OpenRouter GPT-4o-mini) → Tertiary (OpenRouter Claude)
```

### Manual Steps

1. **Verify provider status**
   ```bash
   curl https://api.school-lms.com/health/deep
   # Check ai_provider.status
   ```

2. **Force failover via env var**
   ```bash
   # Set AI_BASE_URL to secondary provider
   # Set AI_API_KEY for secondary provider
   docker compose restart backend
   ```

3. **Test failover**
   ```bash
   # Send test query
   curl -X POST https://api.school-lms.com/api/tutor/query \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "What is 2+2?"}'
   ```

4. **Notify users**
   - Update status page: `status.school-lms.com`
   - Post in-app notification about degraded AI performance

---

## 4. Cache Invalidation

**Symptoms:** Stale data displayed, incorrect references
**Impact:** Users see outdated information
**Estimated Time:** 1–5 minutes

### Redis Cache

```bash
# Flush all cache (production — use with caution)
redis-cli FLUSHALL

# Flush specific key pattern
redis-cli KEYS "cache:class:*" | xargs redis-cli DEL

# Check cache hit ratio
redis-cli INFO stats | grep hits
```

### Selective Invalidation

| Cache Key | When to Invalidate | Impact if Stale |
|-----------|-------------------|-----------------|
| `cache:class:{id}` | Class updated/deleted | Old class name or schedule |
| `cache:user:{id}` | User profile updated | Old display name or role |
| `cache:school:{id}` | School config updated | Old branding or settings |
| `cache:subject:{id}` | Subject updated | Old subject metadata |

---

## 5. SSL Certificate Renewal

**Symptoms:** Browser security warnings, HTTPS errors
**Impact:** All users unable to access the platform
**Estimated Time:** 15 minutes

### Automated (Certbot/LetsEncrypt)

```bash
# Renew certificates
docker compose run --rm certbot renew

# Reload nginx to pick up new certificates
docker compose exec frontend nginx -s reload
```

### Manual

1. **Generate new certificate**
   ```bash
   certbot certonly --manual -d app.school-lms.com -d api.school-lms.com
   ```

2. **Update nginx configuration**
   ```nginx
   ssl_certificate /etc/letsencrypt/live/app.school-lms.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/app.school-lms.com/privkey.pem;
   ```

3. **Reload nginx**
   ```bash
   nginx -s reload
   ```

4. **Verify**
   ```bash
   curl -I https://app.school-lms.com
   # Check SSL expiry: openssl s_client -connect app.school-lms.com:443 -servername app.school-lms.com </dev/null | openssl x509 -noout -dates
   ```

---

## 6. Secrets Rotation

**Schedule:** Every 90 days or on incident/employee departure

### JWT Secret
```bash
# Generate new secret
openssl rand -base64 64

# Add to GitHub Environments as new secret
# Keep old secret valid during rotation window (dual-key strategy)
```

### Supabase Keys
1. Login to Supabase dashboard
2. Go to Project Settings → API
3. Generate new `anon` and `service_role` keys
4. Update GitHub Environments
5. Restart backend

### AI Provider API Keys
1. Login to provider dashboard (Google AI, OpenRouter)
2. Generate new API key
3. Rotate in GitHub Environments
4. Verify with health check: `curl https://api.school-lms.com/health/deep`

---

## 7. Database Migration Rollback

**Symptoms:** Migration failure, schema mismatch
**Impact:** Deployment blocked, potential data issues
**Estimated Time:** 5–15 minutes

### Expand/Contract Pattern

1. **Expand**: Add new column as nullable (safe, no data loss)
2. **Migrate**: Backfill data in new column
3. **Deploy**: Code reads from new column
4. **Contract**: Drop old column (requires downtime if large table)

### Rollback Steps
```bash
# Rollback last migration
npx drizzle-kit drop
# Or manually:
# ALTER TABLE table_name DROP COLUMN IF EXISTS new_column;
```

### Verification
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'affected_table';
```

---

## 8. On-Call Contact Flow

### Alert Received
1. **Acknowledge** within 5 minutes (Slack/PagerDuty)
2. **Assess** severity and impact
3. **Mitigate** or escalate based on severity

### Escalation Tree
```
On-Call Engineer (Primary)
  └── On-Call Engineer (Secondary) — if no response in 5 min
       └── Engineering Manager — if unresolved in 15 min
            └── VP Engineering — if critical outage > 30 min
```

### Severity Levels

| Severity | Response Time | Examples |
|----------|--------------|----------|
| SEV-1 (Critical) | 15 min | Complete outage, data loss |
| SEV-2 (High) | 1 hour | Feature degraded, partial outage |
| SEV-3 (Medium) | 4 hours | Non-critical bug, performance issue |
| SEV-4 (Low) | 24 hours | Cosmetic, minor enhancement |

### Post-Incident
1. Create post-mortem within 48 hours (use template: `docs/POSTMORTEM_TEMPLATE.md`)
2. Identify action items
3. Schedule follow-up to verify fixes
