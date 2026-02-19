#!/bin/bash

# ==============================================================================
# NewsPortal — Database Backup Script
# ==============================================================================
# Creates timestamped backups of PostgreSQL and MongoDB databases.
#
# Usage:
#   ./script/backup.sh                     # Backup using defaults
#   ./script/backup.sh /path/to/backups    # Backup to custom directory
#
# Retention: Keeps last 7 daily + 4 weekly backups.
#
# Cron example (daily at 2:00 AM):
#   0 2 * * * /home/ubuntu/newsportal/script/backup.sh >> /home/ubuntu/newsportal/logs/backup.log 2>&1
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Configuration
BACKUP_DIR="${1:-${ROOT_DIR}/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAILY_RETENTION=7
WEEKLY_RETENTION=4

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"; }
print_ok()    { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}[ERROR]${NC} $1"; }
print_warn()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}[WARN]${NC} $1"; }

# Load environment variables
if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    source "${ROOT_DIR}/.env"
    set +a
else
    print_error ".env file not found at ${ROOT_DIR}/.env"
    exit 1
fi

# Defaults from .env
PG_USER="${POSTGRES_USER:-newsadmin}"
PG_DB="${POSTGRES_DB:-newsportal}"
MG_USER="${MONGO_USER:-mongouser}"
MG_PASS="${MONGO_PASSWORD}"

# Create backup directories
mkdir -p "${BACKUP_DIR}/daily/postgres"
mkdir -p "${BACKUP_DIR}/daily/mongodb"
mkdir -p "${BACKUP_DIR}/weekly/postgres"
mkdir -p "${BACKUP_DIR}/weekly/mongodb"

print_info "========================================"
print_info "NewsPortal Database Backup — ${DATE}"
print_info "========================================"

# ---------- PostgreSQL Backup ----------
print_info "Backing up PostgreSQL..."
PG_FILE="${BACKUP_DIR}/daily/postgres/pg_${PG_DB}_${DATE}.sql.gz"

if docker exec newsportal-db pg_dump -U "${PG_USER}" "${PG_DB}" | gzip > "${PG_FILE}"; then
    PG_SIZE=$(du -h "${PG_FILE}" | cut -f1)
    print_ok "PostgreSQL backup complete: ${PG_FILE} (${PG_SIZE})"
else
    print_error "PostgreSQL backup failed!"
    rm -f "${PG_FILE}"
fi

# ---------- MongoDB Backup ----------
print_info "Backing up MongoDB..."
MG_FILE="${BACKUP_DIR}/daily/mongodb/mongo_${DATE}"

if docker exec newsportal-mongodb mongodump \
    --username "${MG_USER}" \
    --password "${MG_PASS}" \
    --authenticationDatabase admin \
    --db newsportal \
    --archive --gzip > "${MG_FILE}.archive.gz"; then
    MG_SIZE=$(du -h "${MG_FILE}.archive.gz" | cut -f1)
    print_ok "MongoDB backup complete: ${MG_FILE}.archive.gz (${MG_SIZE})"
else
    print_error "MongoDB backup failed!"
    rm -f "${MG_FILE}.archive.gz"
fi

# ---------- Weekly Copy (every Sunday) ----------
if [ "${DAY_OF_WEEK}" -eq 7 ]; then
    print_info "Sunday — creating weekly backup copies..."
    [ -f "${PG_FILE}" ] && cp "${PG_FILE}" "${BACKUP_DIR}/weekly/postgres/"
    [ -f "${MG_FILE}.archive.gz" ] && cp "${MG_FILE}.archive.gz" "${BACKUP_DIR}/weekly/mongodb/"
    print_ok "Weekly backups created."
fi

# ---------- Retention Cleanup ----------
print_info "Applying retention policy..."

# Daily: keep last N days
find "${BACKUP_DIR}/daily/postgres" -name "pg_*.sql.gz" -mtime +"${DAILY_RETENTION}" -delete 2>/dev/null && \
    print_info "Cleaned daily PostgreSQL backups older than ${DAILY_RETENTION} days."
find "${BACKUP_DIR}/daily/mongodb" -name "mongo_*.archive.gz" -mtime +"${DAILY_RETENTION}" -delete 2>/dev/null && \
    print_info "Cleaned daily MongoDB backups older than ${DAILY_RETENTION} days."

# Weekly: keep last N weeks (N * 7 days)
WEEKLY_DAYS=$((WEEKLY_RETENTION * 7))
find "${BACKUP_DIR}/weekly/postgres" -name "pg_*.sql.gz" -mtime +"${WEEKLY_DAYS}" -delete 2>/dev/null && \
    print_info "Cleaned weekly PostgreSQL backups older than ${WEEKLY_DAYS} days."
find "${BACKUP_DIR}/weekly/mongodb" -name "mongo_*.archive.gz" -mtime +"${WEEKLY_DAYS}" -delete 2>/dev/null && \
    print_info "Cleaned weekly MongoDB backups older than ${WEEKLY_DAYS} days."

# ---------- Summary ----------
print_info "========================================"
print_info "Backup Summary"
print_info "========================================"
echo "  Daily PostgreSQL : $(find "${BACKUP_DIR}/daily/postgres" -name '*.sql.gz' | wc -l) files"
echo "  Daily MongoDB    : $(find "${BACKUP_DIR}/daily/mongodb" -name '*.archive.gz' | wc -l) files"
echo "  Weekly PostgreSQL: $(find "${BACKUP_DIR}/weekly/postgres" -name '*.sql.gz' | wc -l) files"
echo "  Weekly MongoDB   : $(find "${BACKUP_DIR}/weekly/mongodb" -name '*.archive.gz' | wc -l) files"
print_ok "Backup completed successfully."
