#!/usr/bin/env bash
# Sunucuda hızlı deploy: stash → pull → prisma → build → pm2 restart
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

echo "=== ENAUNITY Quick Deploy ==="
git stash push -m "auto-deploy-$(date +%Y%m%d%H%M)" || true
git pull origin main

if [[ -f .env.production ]]; then
  set -a; source .env.production; set +a
elif [[ -f .env.local ]]; then
  set -a; source .env.local; set +a
fi

pm2 stop enaunity 2>/dev/null || true
npm install
npx prisma generate
npx prisma migrate deploy
rm -rf .next node_modules/.cache
npm run build
pm2 restart enaunity 2>/dev/null || pm2 start npm --name enaunity -- start
pm2 save 2>/dev/null || true
echo "✓ Deploy tamam — $(git log -1 --oneline)"
