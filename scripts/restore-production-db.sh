#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_PATH="${1:-}"
APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
DB_PATH="${ENAUNITY_DB_PATH:-$APP_DIR/prisma/prod.db}"
BACKUP_DIR="${ENAUNITY_BACKUP_DIR:-/opt/backups/enaunity-db/manual}"
CONFIRM_VALUE="${ENAUNITY_RESTORE_CONFIRM:-}"
REQUIRED_CONFIRM="REPLACE_PRODUCTION_DB"
STAMP="$(date +%F_%H-%M-%S)"
TMP_DIR="$(mktemp -d "${BACKUP_DIR%/}/.tmp-restore-${STAMP}-XXXXXX")"
TMP_DB="${TMP_DIR}/restored.db"
PRE_DB="${BACKUP_DIR}/prod.pre-restore.${STAMP}.db"
PRE_WAL="${BACKUP_DIR}/prod.pre-restore.${STAMP}.db-wal"
PRE_SHM="${BACKUP_DIR}/prod.pre-restore.${STAMP}.db-shm"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ -z "$ARCHIVE_PATH" ]]; then
  echo "Kullanim: ENAUNITY_RESTORE_CONFIRM=${REQUIRED_CONFIRM} bash scripts/restore-production-db.sh /opt/backups/enaunity-db/prod-YYYY-MM-DD_HH-MM-SS.db.gz" >&2
  exit 1
fi

if [[ "$CONFIRM_VALUE" != "$REQUIRED_CONFIRM" ]]; then
  echo "Restore iptal: ENAUNITY_RESTORE_CONFIRM=${REQUIRED_CONFIRM} zorunlu." >&2
  exit 1
fi

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "Restore iptal: arsiv bulunamadi -> $ARCHIVE_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Restore iptal: mevcut prod db bulunamadi -> $DB_PATH" >&2
  exit 1
fi

gunzip -c "$ARCHIVE_PATH" > "$TMP_DB"

python3 - <<PY
import sqlite3
db = sqlite3.connect(r"$TMP_DB")
row = db.execute("PRAGMA integrity_check;").fetchone()
db.close()
if not row or row[0].lower() != "ok":
    raise SystemExit(f"Integrity check fail: {row!r}")
print("Integrity OK")
PY

cp "$DB_PATH" "$PRE_DB"
if [[ -f "${DB_PATH}-wal" ]]; then
  cp "${DB_PATH}-wal" "$PRE_WAL"
fi
if [[ -f "${DB_PATH}-shm" ]]; then
  cp "${DB_PATH}-shm" "$PRE_SHM"
fi

cp "$TMP_DB" "$DB_PATH"
rm -f "${DB_PATH}-wal" "${DB_PATH}-shm"
chmod 644 "$DB_PATH" 2>/dev/null || true

echo "Restore OK: $ARCHIVE_PATH -> $DB_PATH"
echo "Pre-restore snapshot: $PRE_DB"
