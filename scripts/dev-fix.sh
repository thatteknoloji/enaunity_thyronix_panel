#!/usr/bin/env bash
# Tek komutla dev sunucuyu sıfırla — Internal Server Error için
set -euo pipefail

PORT="${ENAUNITY_PORT:-3333}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=== ENAUNITY Dev Fix ==="
echo ""

# Tüm Next/Node süreçlerini bu projede kapat (port + turbo çakışması)
kill_all_dev() {
  if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "→ Port $PORT kapatılıyor…"
    lsof -ti ":$PORT" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  # Aynı projede kalan next dev süreçleri
  pkill -f "next dev.*${PORT}" 2>/dev/null || true
  pkill -f "next dev -p ${PORT}" 2>/dev/null || true
  sleep 1
}

kill_all_dev

echo "→ .next + turbo cache temizleniyor…"
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true

echo "→ Prisma generate + db push…"
npx prisma generate
npx prisma db push --skip-generate 2>/dev/null || npx prisma db push --skip-generate

echo ""
echo "✓ Dev server başlatılıyor…"
echo "  → http://localhost:$PORT"
echo "  (500 görürsen: Ctrl+C → npm run dev:fix)"
echo ""
exec npm run dev:hot
