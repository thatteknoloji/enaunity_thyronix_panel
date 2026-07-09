#!/usr/bin/env bash
# Sunucuda hızlı deploy: pull → install → prisma → build (typecheck skip) → pm2
# Typecheck lokalde / CI'da yapılır (npm run preflight). Sunucuda tekrar etmeyiz.
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

echo "=== ENAUNITY Quick Deploy (server) ==="
echo "Commit: $(git log -1 --oneline 2>/dev/null || echo '?')"

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
fi

if [[ -x "$APP_DIR/backup-db.sh" ]]; then
  echo "→ pre-deploy db snapshot…"
  "$APP_DIR/backup-db.sh"
fi

echo "→ npm install…"
npm install --prefer-offline --no-audit --no-fund

echo "→ prisma generate…"
npx prisma generate

if [[ -d prisma/migrations ]] && find prisma/migrations -mindepth 1 -maxdepth 1 -type d | grep -q .; then
  echo "→ prisma migrate deploy…"
  npx prisma migrate deploy || echo "  (migrate atlandı / hata — kontrol et)"
fi

echo "→ production build (NEXT_SKIP_TYPECHECK=1)…"
# prebuild-safe.sh .next siler; sunucuda port çakışması olmaz
rm -rf .next node_modules/.cache 2>/dev/null || true
NEXT_SKIP_TYPECHECK=1 npm run build

echo "→ pm2 restart…"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart enaunity 2>/dev/null || pm2 start npm --name enaunity -- start
  pm2 restart enaunity-job-worker 2>/dev/null || true
  pm2 save 2>/dev/null || true
  pm2 list | head -20
else
  echo "⚠ pm2 yok — manuel restart gerekli"
fi

echo "✓ Deploy tamam — $(git log -1 --oneline)"
