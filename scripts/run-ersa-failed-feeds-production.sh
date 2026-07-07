#!/usr/bin/env bash
# Production: Ersa hatalı feed'leri tek tek sync + çıktı XML
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
LOG="${APP_DIR}/storage/thyronix/ersa-failed-sync.log"
cd "$APP_DIR"

cleanup() {
  pm2 restart enaunity 2>/dev/null || true
  pm2 restart enaunity-job-worker 2>/dev/null || true
}
trap cleanup EXIT

set -a
# shellcheck disable=SC1091
source .env.production
export BEZOS_BAYI_TARGET_DEALER_ID="${BEZOS_BAYI_TARGET_DEALER_ID:-cmqmpj2r40001kloikelxtc6o}"
set +a

mkdir -p storage/thyronix
pkill -f "setup-ersa-gudu.ts" 2>/dev/null || true
pkill -f "repair-ersa-gudu.ts" 2>/dev/null || true
pkill -f "seed-vht-supplier-feeds.ts" 2>/dev/null || true
sleep 2

pm2 stop enaunity 2>/dev/null || true
pm2 stop enaunity-job-worker 2>/dev/null || true
sleep 5

npx prisma generate

echo "=== Ersa hatalı feed sync: $(date -Iseconds) ===" | tee "$LOG"

for code in VHT18 VHT24 VHT30 VHT41; do
  echo "--- $code ---" | tee -a "$LOG"
  npx tsx scripts/seed-vht-supplier-feeds.ts --bundle=ersa --sync "$code" 2>&1 | tee -a "$LOG" || echo "✗ $code başarısız" | tee -a "$LOG"
done

echo "=== Çıktı XML ===" | tee -a "$LOG"
npx tsx scripts/setup-ersa-gudu.ts --publish 2>&1 | tee -a "$LOG"

echo "=== Doğrulama ===" | tee -a "$LOG"
npx tsx scripts/verify-ersa-gudu-setup.ts --db 2>&1 | tee -a "$LOG"

echo "=== Bitti: $(date -Iseconds) ===" | tee -a "$LOG"
