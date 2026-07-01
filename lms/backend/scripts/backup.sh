#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-postgres://lms:changeme@localhost:5432/school_lms}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

pg_dump "$DB_URL" --no-owner --no-acl -F custom -f "$BACKUP_DIR/school_lms_$TIMESTAMP.dump"

find "$BACKUP_DIR" -name "school_lms_*.dump" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: school_lms_$TIMESTAMP.dump"
