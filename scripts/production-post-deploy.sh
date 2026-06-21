#!/usr/bin/env bash
# Production sunucuda deploy sonrası: pull → migrate → seed → build → restart
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
elif [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
else
  echo "✗ .env.production veya .env.local bulunamadı (DATABASE_URL gerekli)"
  exit 1
fi

echo "=== ENAUNITY Production Post-Deploy ==="
echo "→ git pull…"
git pull origin main

echo "→ pm2 durdur (build için)…"
if command -v pm2 >/dev/null 2>&1 && pm2 describe enaunity >/dev/null 2>&1; then
  pm2 stop enaunity || true
fi

echo "→ prisma generate + db push…"
npx prisma generate
npx prisma db push --skip-generate

echo "→ site content seed…"
npm run seed:site-content

echo "→ product slug backfill…"
npx tsx scripts/backfill-product-slugs.ts || echo "  (slug backfill atlandı)"

echo "→ bayi cam tablo seed (görseller + ebat)…"
npx tsx scripts/seed-bayi-cam-tablo-full.ts || echo "  (cam tablo seed atlandı)"

echo "→ linkslash plan seed…"
npm run seed:linkslash-plans || echo "  (linkslash seed atlandı)"

echo "→ pod creator plan seed…"
npm run seed:pod-plans || echo "  (pod plans seed atlandı)"

echo "→ ecosystem showcase sync (LinkSlash vitrin)…"
npm run seed:ecosystem-showcase || echo "  (ecosystem sync atlandı)"

echo "→ production build…"
rm -rf .next node_modules/.cache 2>/dev/null || true
find .next -mindepth 1 -delete 2>/dev/null || rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
npm run build

echo "→ pm2 restart…"
if command -v pm2 >/dev/null 2>&1 && pm2 describe enaunity >/dev/null 2>&1; then
  pm2 restart enaunity
elif systemctl is-active --quiet enaunity 2>/dev/null; then
  systemctl restart enaunity
else
  pm2 start npm --name enaunity -- start || echo "  (pm2 start manuel gerekebilir)"
fi

echo "✓ Production post-deploy tamam."
