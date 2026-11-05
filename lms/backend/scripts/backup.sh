#!/usr/bin/env bash
# Automated PostgreSQL backup — logical dump + PITR info
# Usage: DATABASE_URL=postgres://... ./scripts/backup.sh
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)
fi

DB_URL="${DATABASE_URL:-postgres://lms:changeme@localhost:5432/school_lms}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

DUMP_FILE="$BACKUP_DIR/school_lms_$TIMESTAMP.dump"
pg_dump "$DB_URL" --no-owner --no-acl -F custom -f "$DUMP_FILE"
echo "Backup: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

SQL_FILE="$BACKUP_DIR/school_lms_$TIMESTAMP.sql.gz"
pg_dump "$DB_URL" --no-owner --no-acl --compress=9 -f "$SQL_FILE"
echo "SQL dump: $SQL_FILE ($(du -h "$SQL_FILE" | cut -f1))"

find "$BACKUP_DIR" -name "school_lms_*.dump" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "school_lms_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo ""
echo "=== PITR Setup (Point-in-Time Recovery) ==="
echo "pg_dump is a logical backup — good for schema/data restore."
echo "For PITR (restore to any point in time), enable WAL archiving:"
echo ""
echo "  wal_level = replica"
echo "  archive_mode = on"
echo "  archive_command = 'cp %p /backups/wal/%f'"
echo "  restore_command = 'cp /backups/wal/%f %p'"
echo ""
echo "Backup complete."
