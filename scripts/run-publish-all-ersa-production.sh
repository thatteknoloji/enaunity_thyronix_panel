#!/usr/bin/env bash
set -euo pipefail
cd /opt/enaunity
set -a && source .env.production && export BEZOS_BAYI_TARGET_DEALER_ID="${BEZOS_BAYI_TARGET_DEALER_ID:-cmqmpj2r40001kloikelxtc6o}" && set +a
LOG="storage/thyronix/ersa-publish-all.log"
mkdir -p storage/thyronix

pm2 stop enaunity enaunity-job-worker 2>/dev/null || true
sleep 5

echo "=== Yayın (firma bazlı) ===" | tee "$LOG"
for c in "${CODES[@]}"; do
  echo ">> $c" | tee -a "$LOG"
  npx tsx scripts/publish-ersa-feed-by-code.ts "$c" 2>&1 | tee -a "$LOG" || true
  sleep 2
done

pm2 restart enaunity enaunity-job-worker 2>/dev/null || true
echo "=== Bitti ===" | tee -a "$LOG"
