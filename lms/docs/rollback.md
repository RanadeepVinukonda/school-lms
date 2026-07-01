# Rollback Procedure

## Backend

```bash
# 1. Revert to previous Docker image
docker pull ghcr.io/org/lms-backend:previous
docker stop lms-backend
docker run --rm -d --name lms-backend -p 4000:4000 ghcr.io/org/lms-backend:previous

# 2. Or git revert
git revert HEAD
git push origin main
```

## Database

```bash
# Restore from last backup
pg_restore --no-owner --no-acl -d school_lms backups/school_lms_20260101_120000.dump
```

## Frontend

```bash
# Revert to previous nginx image
docker pull ghcr.io/org/lms-frontend:previous
docker stop lms-frontend
docker run --rm -d --name lms-frontend -p 80:80 ghcr.io/org/lms-frontend:previous
```
