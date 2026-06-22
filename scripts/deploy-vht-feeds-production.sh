#!/usr/bin/env bash
# Production: VHT feed JSON kopyala + kaynakları ekle/senkronize et
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

set -a
# shellcheck disable=SC1091
source .env.production
set +a

mkdir -p storage/thyronix

if [[ -f scripts/data/vht-supplier-feeds.json ]]; then
  cp scripts/data/vht-supplier-feeds.json storage/thyronix/vht-supplier-feeds.json
  echo "✓ VHT JSON storage'a kopyalandı"
elif [[ ! -f storage/thyronix/vht-supplier-feeds.json ]]; then
  echo "✗ storage/thyronix/vht-supplier-feeds.json bulunamadı"
  echo "  scripts/data/vht-supplier-feeds.json dosyasını sunucuya kopyalayın"
  exit 1
fi

echo "=== Bezos kaynağı güncelle (2 feed URL) ==="
npx tsx scripts/seed-esra-bezos-source.ts

echo "=== VHT kaynakları ekle + senkronize ==="
npx tsx scripts/seed-vht-supplier-feeds.ts --sync

echo "=== Tamamlandı — /thyronix/sources kontrol edin ==="
