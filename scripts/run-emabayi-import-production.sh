#!/usr/bin/env bash
# Production sunucusunda EMA bayi import
# Kullanım:
#   bash scripts/run-emabayi-import-production.sh --dry-run
#   bash scripts/run-emabayi-import-production.sh
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
XLSX="$APP_DIR/data/emabayi1.xlsx"
DRY=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --file=*) XLSX="${arg#--file=}" ;;
    --file) shift; XLSX="${1:-$XLSX}" ;;
  esac
done

cd "$APP_DIR"

if [[ -f .env.production ]]; then
  set -a; source .env.production; set +a
elif [[ -f .env.local ]]; then
  set -a; source .env.local; set +a
fi

if [[ ! -f "$XLSX" ]]; then
  echo "Excel dosyası bulunamadı: $XLSX"
  echo "Önce data/emabayi1.xlsx yükleyin."
  exit 1
fi

if [[ -x "$APP_DIR/backup-db.sh" ]]; then
  echo "→ DB yedeği alınıyor…"
  "$APP_DIR/backup-db.sh"
fi

ARGS=(--file "$XLSX")
if [[ "$DRY" -eq 1 ]] || [[ -n "${DRY_RUN:-}" ]]; then
  ARGS+=(--dry-run)
fi

echo "→ Import başlıyor…"
npx tsx scripts/import-emabayi-dealers.ts "${ARGS[@]}"
echo "✓ Tamamlandı"
