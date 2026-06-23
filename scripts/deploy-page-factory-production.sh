#!/usr/bin/env bash
# Page Factory full chain — production deploy
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

echo "=== Page Factory Production Deploy ==="

git pull origin main

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
  echo "✗ .env.production bulunamadı"
  exit 1
fi

pm2 stop enaunity 2>/dev/null || true

npx prisma generate
npx prisma db push --skip-generate

rm -rf .next node_modules/.cache 2>/dev/null || true
npm run build

pm2 restart enaunity --update-env
pm2 save 2>/dev/null || true

echo "✓ Deploy tamam — $(git log -1 --oneline)"

echo ""
echo "=== Smoke checks ==="
curl -s -o /dev/null -w "admin page-factory: %{http_code}\n" http://127.0.0.1:3333/admin/page-factory || true
curl -s -o /dev/null -w "pf-sitemap: %{http_code}\n" http://127.0.0.1:3333/pf-sitemap/internal.json || true
