#!/usr/bin/env bash
# Lokal deploy öncesi kontrol.
# Production build NEXT_SKIP_TYPECHECK=1 kullanır (next.config.ts).
# Tam tsc temizliği ayrı borç; preflight deploy'un kırılmayacağını doğrular.
#
# Kullanım:
#   npm run preflight
#   PREFLIGHT_STRICT=1 npm run preflight   # typecheck hatalarında fail
#   PREFLIGHT_FULL_BUILD=1 npm run preflight
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== ENAUNITY Preflight ==="

missing=0
for f in \
  next.config.ts \
  scripts/deploy-production-quick.sh \
  package.json
do
  if [[ ! -f "$f" ]]; then
    echo "✗ eksik: $f"
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

if ! grep -q 'NEXT_SKIP_TYPECHECK' next.config.ts; then
  echo "✗ next.config.ts içinde NEXT_SKIP_TYPECHECK desteği yok"
  exit 1
fi

echo "→ prisma generate…"
if ! npx prisma generate >/dev/null 2>&1; then
  echo "  ⚠ prisma generate uyarı verdi — devam (client genelde zaten var)"
  npx prisma generate || true
fi

echo "→ typecheck raporu (src/)…"
set +e
TYPECHECK_OUT="$(npx tsc -p tsconfig.typecheck.json --noEmit 2>&1)"
TYPECHECK_EXIT=$?
set -e
ERR_COUNT="$(printf '%s\n' "$TYPECHECK_OUT" | rg -c 'error TS' || true)"
ERR_COUNT="${ERR_COUNT:-0}"

if [[ "$TYPECHECK_EXIT" -eq 0 ]]; then
  echo "  ✓ typecheck temiz (0 hata)"
else
  echo "  ⚠ typecheck: ${ERR_COUNT} hata"
  printf '%s\n' "$TYPECHECK_OUT" | rg 'error TS' | head -15 || true
  if [[ "${ERR_COUNT}" -gt 15 ]]; then
    echo "  … ve $((ERR_COUNT - 15)) hata daha (npm run typecheck)"
  fi
  # Varsayılan: typecheck fail = preflight fail (temizlik sonrası)
  # Geçici atlamak için: PREFLIGHT_ALLOW_TS=1 npm run preflight
  if [[ "${PREFLIGHT_ALLOW_TS:-0}" != "1" ]]; then
    echo "✗ Typecheck fail — düzelt veya PREFLIGHT_ALLOW_TS=1"
    exit 1
  fi
  echo "  (PREFLIGHT_ALLOW_TS=1 — devam)"
fi

PORT="${ENAUNITY_PORT:-3333}"
if [[ "${PREFLIGHT_FULL_BUILD:-0}" == "1" ]]; then
  if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠ Dev server :$PORT açık — full build atlandı"
    echo "  Önce: npm run dev:fix"
  else
    echo "→ production build smoke (NEXT_SKIP_TYPECHECK=1)…"
    NEXT_SKIP_TYPECHECK=1 npm run build
  fi
else
  echo "→ full build atlandı (hızlı preflight). Smoke için: PREFLIGHT_FULL_BUILD=1 npm run preflight"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
AHEAD="$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo '?')"
echo "→ git: branch=${BRANCH} unpushed=${AHEAD}"

echo "✓ Preflight OK — deploy: npm run deploy:live"
echo "  Sunucuda doğrudan: bash scripts/deploy-production-quick.sh"
