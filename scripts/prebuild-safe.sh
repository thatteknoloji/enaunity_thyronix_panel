#!/usr/bin/env bash
# prebuild: dev çalışırken .next silme — Internal Server Error (ENOENT manifest) önleme
set -euo pipefail

PORT="${ENAUNITY_PORT:-3333}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo ""
  echo "⚠  Dev server port $PORT üzerinde çalışıyor."
  echo "   npm run build .next'i silerse dev 500 verir."
  echo "   Önce: Ctrl+C veya  npm run dev:fix"
  echo ""
  exit 1
fi

rm -rf .next
