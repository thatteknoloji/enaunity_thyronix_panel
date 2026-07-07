#!/usr/bin/env bash
# Production: Ersa Güdü onarım — arka planda çalışır, SSH kopunca devam eder.
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
LOG_FILE="${APP_DIR}/storage/thyronix/ersa-repair.log"
cd "$APP_DIR"

set -a
# shellcheck disable=SC1091
source .env.production
export BEZOS_BAYI_TARGET_DEALER_ID="${BEZOS_BAYI_TARGET_DEALER_ID:-cmqmpj2r40001kloikelxtc6o}"
set +a

mkdir -p storage/thyronix

if [[ -f scripts/data/ersa-gudu-feeds.json ]]; then
  cp scripts/data/ersa-gudu-feeds.json storage/thyronix/ersa-gudu-feeds.json
fi

# Eski takılı sync süreçlerini temizle
pkill -f "setup-ersa-gudu.ts --sync" 2>/dev/null || true
pkill -f "seed-ersa-gudu-feeds.ts --sync" 2>/dev/null || true
pkill -f "repair-ersa-gudu.ts" 2>/dev/null || true
sleep 2

cleanup() {
  pm2 restart enaunity 2>/dev/null || true
  pm2 restart enaunity-job-worker 2>/dev/null || true
}
trap cleanup EXIT

pm2 stop enaunity 2>/dev/null || true
pm2 stop enaunity-job-worker 2>/dev/null || true
sleep 5

npx prisma generate

echo "=== Ersa onarım başlıyor: $(date -Iseconds) ===" | tee "$LOG_FILE"
npx tsx scripts/repair-ersa-gudu.ts 2>&1 | tee -a "$LOG_FILE" || true
echo "=== Tamamlandı: $(date -Iseconds) ===" | tee -a "$LOG_FILE"

npx tsx scripts/verify-ersa-gudu-setup.ts --db 2>&1 | tee -a "$LOG_FILE"
