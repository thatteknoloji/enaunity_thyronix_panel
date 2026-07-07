#!/usr/bin/env bash
set -euo pipefail
cd /opt/enaunity
set -a && source .env.production && export BEZOS_BAYI_TARGET_DEALER_ID="${BEZOS_BAYI_TARGET_DEALER_ID:-cmqmpj2r40001kloikelxtc6o}" && set +a
LOG="storage/thyronix/ersa-publish-all.log"
mkdir -p storage/thyronix

pm2 stop enaunity enaunity-job-worker 2>/dev/null || true
pkill -f "tsx scripts/" 2>/dev/null || true
sleep 10

echo "=== Yayın (firma bazlı) ===" | tee "$LOG"
CODES=(VHT1 VHT2 VHT7 VHT8 VHT9 VHT10 VHT18 VHT22 VHT24 VHT28 VHT30 VHT36 VHT37 VHT38 VHT40 VHT41 BIRLESIK)
for c in "${CODES[@]}"; do
  echo ">> $c" | tee -a "$LOG"
  npx tsx scripts/publish-ersa-feed-by-code.ts "$c" 2>&1 | tee -a "$LOG" || true
  sleep 2
done

pm2 restart enaunity enaunity-job-worker 2>/dev/null || true
echo "=== Bitti ===" | tee -a "$LOG"
