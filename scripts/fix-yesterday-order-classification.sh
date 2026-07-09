#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/fix-yesterday-order-classification.sh
#
# This script marks the two reported orders as B2B so they appear
# under normal dealer orders instead of operasyon orders.

TARGET_A="cmrc95l5"
TARGET_B="cmrc8z2v"

DB_CANDIDATES=(
  "./dev.db"
  "./prisma/dev.db"
  "./prod.db"
  "./prisma/prod.db"
)

UPDATED_ANY=0

for db in "${DB_CANDIDATES[@]}"; do
  if [[ ! -f "$db" ]]; then
    continue
  fi

  echo "→ Checking $db"

  HAS_ORDER_TABLE=$(sqlite3 "$db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Order';")
  HAS_DEALER_ORDER_TABLE=$(sqlite3 "$db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='DealerOrder';")
  if [[ "$HAS_ORDER_TABLE" -eq 0 && "$HAS_DEALER_ORDER_TABLE" -eq 0 ]]; then
    echo "  • Skipped (no Order/DealerOrder tables)"
    continue
  fi

  if [[ "$HAS_ORDER_TABLE" -eq 1 ]]; then
    sqlite3 "$db" "UPDATE \"Order\" SET sourceType = 'B2B' WHERE id LIKE '${TARGET_A}%' OR id LIKE '${TARGET_B}%' OR orderNumber IN ('${TARGET_A}', '${TARGET_B}');"
  fi

  if [[ "$HAS_DEALER_ORDER_TABLE" -eq 1 ]]; then
    sqlite3 "$db" "UPDATE \"DealerOrder\" SET sourceType = 'B2B' WHERE id LIKE '${TARGET_A}%' OR id LIKE '${TARGET_B}%' OR orderNumber IN ('${TARGET_A}', '${TARGET_B}');"
  fi

  CHANGED_ORDER=0
  CHANGED_DEALER=0
  if [[ "$HAS_ORDER_TABLE" -eq 1 ]]; then
    CHANGED_ORDER=$(sqlite3 "$db" "SELECT COUNT(*) FROM \"Order\" WHERE sourceType = 'B2B' AND (id LIKE '${TARGET_A}%' OR id LIKE '${TARGET_B}%' OR orderNumber IN ('${TARGET_A}','${TARGET_B}'));")
  fi
  if [[ "$HAS_DEALER_ORDER_TABLE" -eq 1 ]]; then
    CHANGED_DEALER=$(sqlite3 "$db" "SELECT COUNT(*) FROM \"DealerOrder\" WHERE sourceType = 'B2B' AND (id LIKE '${TARGET_A}%' OR id LIKE '${TARGET_B}%' OR orderNumber IN ('${TARGET_A}','${TARGET_B}'));")
  fi

  if [[ "$CHANGED_ORDER" -gt 0 || "$CHANGED_DEALER" -gt 0 ]]; then
    UPDATED_ANY=1
    echo "  ✓ Updated rows -> Order: $CHANGED_ORDER, DealerOrder: $CHANGED_DEALER"
  else
    echo "  • No matching rows in this database"
  fi
done

if [[ "$UPDATED_ANY" -eq 1 ]]; then
  echo "Done: matching orders were classified as B2B."
else
  echo "Done: no matching rows found in scanned DB files."
fi
