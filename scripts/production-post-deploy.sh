#!/usr/bin/env bash
# Production sunucuda deploy sonrası: pull → migrate → seed → restart
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

echo "=== ENAUNITY Production Post-Deploy ==="
echo "→ git pull…"
git pull origin main

echo "→ prisma generate + db push…"
npx prisma generate
npx prisma db push --skip-generate

echo "→ site content seed…"
npm run seed:site-content

echo "→ restart app…"
if command -v pm2 >/dev/null 2>&1 && pm2 describe enaunity >/dev/null 2>&1; then
  pm2 restart enaunity
elif systemctl is-active --quiet enaunity 2>/dev/null; then
  systemctl restart enaunity
else
  echo "  (pm2/systemctl bulunamadı — manuel restart gerekebilir)"
fi

echo "✓ Production post-deploy tamam."
