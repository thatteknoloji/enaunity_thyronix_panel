#!/usr/bin/env bash
# Esra Güden — ürünü olan ama boş/eksik firma feed'lerini yeniden yayınla + birleşik.
# Sunucuda: bash scripts/republish-empty-firma-feeds.sh
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

export BEZOS_BAYI_TARGET_DEALER_ID="${BEZOS_BAYI_TARGET_DEALER_ID:-cmqmpj2r40001kloikelxtc6o}"
LOG="storage/thyronix/republish-empty-firma.log"
mkdir -p storage/thyronix

echo "=== Republish empty firma feeds ($(date -Iseconds)) ===" | tee "$LOG"
echo "Dealer: $BEZOS_BAYI_TARGET_DEALER_ID" | tee -a "$LOG"

# Kaynakta ürün var, feed 0 veya yok → yayınla
CODES=(
  VHT5
  VHT8
  VHT9
  VHT10
  VHT22
  VHT28
  VHT34
  VHT1
  VHT2
  VHT7
  VHT24
  VHT36
  VHT37
  VHT38
  VHT40
  VHT41
  BIRLESIK
)

for c in "${CODES[@]}"; do
  echo ">> $c" | tee -a "$LOG"
  npx tsx scripts/publish-ersa-feed-by-code.ts "$c" 2>&1 | tee -a "$LOG" || true
  sleep 1
done

echo "=== Bitti $(date -Iseconds) ===" | tee -a "$LOG"
