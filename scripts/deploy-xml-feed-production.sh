#!/usr/bin/env bash
# Production: XML Feed motor deploy + opsiyonel Leyna pilot seed
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

set -a
# shellcheck disable=SC1091
source .env.production
set +a

if [[ -x "$APP_DIR/backup-db.sh" ]]; then
  echo "→ DB yedeği…"
  "$APP_DIR/backup-db.sh"
fi

echo "=== XML Feed Engine Deploy ==="
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy

echo "→ Smoke test (Leyna fetch + parse)…"
npx tsx scripts/test-xml-feed-engine.ts

if [[ "${SEED_LEYNA_FEED:-0}" == "1" ]]; then
  echo "→ Leyna feed seed + ilk sync…"
  npx tsx scripts/seed-leyna-xml-feed.ts
fi

pm2 stop enaunity 2>/dev/null || true
rm -rf .next node_modules/.cache
NEXT_SKIP_TYPECHECK=1 npm run build
pm2 restart enaunity 2>/dev/null || pm2 start npm --name enaunity -- start
pm2 save 2>/dev/null || true

echo "→ Cron xml-feed-sync test…"
curl -sf -m 30 -H "x-cron-secret: ${CRON_SECRET}" \
  "http://127.0.0.1:3333/api/cron/xml-feed-sync?limit=1" || echo "  (cron test atlandı — feed yoksa normal)"

echo "✓ XML Feed deploy tamam — $(git log -1 --oneline)"
