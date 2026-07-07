#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
LOG="${APP_DIR}/storage/thyronix/ersa-provision.log"
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
cp -f scripts/data/ersa-gudu-feeds.json storage/thyronix/ersa-gudu-feeds.json 2>/dev/null || true

pkill -f "provision-ersa-dealer-feeds" 2>/dev/null || true
pkill -f "repair-ersa-gudu" 2>/dev/null || true
pkill -f "setup-ersa-gudu.ts --sync" 2>/dev/null || true
sleep 2

pm2 stop enaunity 2>/dev/null || true
pm2 stop enaunity-job-worker 2>/dev/null || true
sleep 5

npx prisma generate

echo "=== Provision başlıyor: $(date -Iseconds) ===" | tee "$LOG"
npx tsx scripts/provision-ersa-dealer-feeds.ts --sync 2>&1 | tee -a "$LOG"
echo "=== Bitti: $(date -Iseconds) ===" | tee -a "$LOG"
