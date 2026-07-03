#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
DB_PATH="${ENAUNITY_DB_PATH:-$APP_DIR/prisma/prod.db}"
BACKUP_DIR="${ENAUNITY_BACKUP_DIR:-/opt/backups/enaunity-db}"
RETENTION_DAYS="${ENAUNITY_BACKUP_RETENTION_DAYS:-21}"
STAMP="$(date +%F_%H-%M-%S)"
TMP_DIR="$(mktemp -d "${BACKUP_DIR%/}/.tmp-backup-${STAMP}-XXXXXX")"
BASE_NAME="prod-${STAMP}"
RAW_COPY="${TMP_DIR}/${BASE_NAME}.db"
ARCHIVE_PATH="${BACKUP_DIR}/${BASE_NAME}.db.gz"
WAL_COPY="${TMP_DIR}/${BASE_NAME}.db-wal"
SHM_COPY="${TMP_DIR}/${BASE_NAME}.db-shm"
MANIFEST_PATH="${BACKUP_DIR}/${BASE_NAME}.manifest.txt"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Backup FAIL: db bulunamadi -> $DB_PATH" >&2
  exit 1
fi

cp "$DB_PATH" "$RAW_COPY"

if [[ -f "${DB_PATH}-wal" ]]; then
  cp "${DB_PATH}-wal" "$WAL_COPY"
fi

if [[ -f "${DB_PATH}-shm" ]]; then
  cp "${DB_PATH}-shm" "$SHM_COPY"
fi

gzip -c "$RAW_COPY" > "$ARCHIVE_PATH"
gzip -t "$ARCHIVE_PATH"

{
  echo "timestamp=${STAMP}"
  echo "db_path=${DB_PATH}"
  echo "archive=${ARCHIVE_PATH}"
  echo "raw_size=$(stat -f%z "$RAW_COPY" 2>/dev/null || stat -c%s "$RAW_COPY")"
  echo "archive_size=$(stat -f%z "$ARCHIVE_PATH" 2>/dev/null || stat -c%s "$ARCHIVE_PATH")"
  echo "sha256_archive=$(shasum -a 256 "$ARCHIVE_PATH" | awk '{print $1}')"
  if [[ -f "$WAL_COPY" ]]; then
    echo "wal_size=$(stat -f%z "$WAL_COPY" 2>/dev/null || stat -c%s "$WAL_COPY")"
  fi
  if [[ -f "$SHM_COPY" ]]; then
    echo "shm_size=$(stat -f%z "$SHM_COPY" 2>/dev/null || stat -c%s "$SHM_COPY")"
  fi
} > "$MANIFEST_PATH"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'prod-*.db.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'prod-*.manifest.txt' -mtime +"$RETENTION_DAYS" -delete

echo "Backup OK: $ARCHIVE_PATH"
