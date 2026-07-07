#!/usr/bin/env bash
# Production: Ersa Güdü — kurallar + 18 feed seed/sync
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

set -a
# shellcheck disable=SC1091
source .env.production
set +a

mkdir -p storage/thyronix

if [[ -f scripts/data/ersa-gudu-feeds.json ]]; then
  cp scripts/data/ersa-gudu-feeds.json storage/thyronix/ersa-gudu-feeds.json
  echo "✓ Ersa Güdü feed JSON storage'a kopyalandı"
elif [[ ! -f storage/thyronix/ersa-gudu-feeds.json ]]; then
  echo "✗ storage/thyronix/ersa-gudu-feeds.json bulunamadı"
  exit 1
fi

echo "=== Ersa Güdü kurulum (kurallar + feed + sync) ==="
npx tsx scripts/setup-ersa-gudu.ts --sync

echo "=== Doğrulama ==="
npx tsx scripts/verify-ersa-gudu-setup.ts --db

echo "=== Tamamlandı ==="
