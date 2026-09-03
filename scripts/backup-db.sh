#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/erp-sales"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="erp_sales_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$FILENAME"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME"
