#!/usr/bin/env bash
# ENAUNITY dev server — sağlıksızsa otomatik onar ve yeniden başlat
set -euo pipefail

PORT="${ENAUNITY_PORT:-3333}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HEALTH_BODY="/tmp/enaunity-health-$$.txt"

cleanup() {
  rm -f "$HEALTH_BODY" 2>/dev/null || true
}
trap cleanup EXIT

kill_port() {
  if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "→ Port $PORT üzerindeki süreç sonlandırılıyor…"
    lsof -ti ":$PORT" | xargs kill -9 2>/dev/null || true
    pkill -f "next dev.*${PORT}" 2>/dev/null || true
    sleep 1
  fi
}

health_ok() {
  local code body
  code=$(curl -s -o "$HEALTH_BODY" -w "%{http_code}" "http://localhost:${PORT}/" --max-time 10 2>/dev/null || echo "000")
  body=$(head -c 400 "$HEALTH_BODY" 2>/dev/null || echo "")
  if [[ "$body" == *"Internal Server Error"* ]]; then
    return 1
  fi
  case "$code" in
    200|301|302|307|308) return 0 ;;
    500) return 1 ;;
    *) return 1 ;;
  esac
}

prepare_db() {
  echo "→ Prisma client + veritabanı senkronu…"
  npx prisma generate
  npx prisma db push --skip-generate 2>/dev/null || npx prisma db push --skip-generate
}

# Bozuk .next: prod build kalıntısı, eksik manifest veya yarım silinmiş cache
cache_broken() {
  [[ ! -d ".next" ]] && return 1

  # npm run build sonrası prod cache — dev turbo ile çakışır → 500
  if [[ -f ".next/BUILD_ID" ]] && [[ ! -d ".next/cache" ]]; then
    return 0
  fi

  # Eski kontrol: tamamen boş/yarım cache
  if [[ ! -f ".next/BUILD_ID" ]] && [[ ! -d ".next/cache" ]] && [[ ! -d ".next/dev" ]]; then
    return 0
  fi

  # Manifest dosyaları eksik (ENOENT 500 kök nedeni)
  if [[ -d ".next/server/app" ]] && [[ ! -f ".next/server/app-paths-manifest.json" ]]; then
    return 0
  fi

  return 1
}

wipe_cache() {
  echo "→ Bozuk .next cache temizleniyor…"
  rm -rf .next
  rm -rf node_modules/.cache 2>/dev/null || true
}

start_server() {
  prepare_db
  echo ""
  echo "✓ Hazır — hot reload dev server"
  echo "  → http://localhost:$PORT"
  echo ""
  exec npm run dev:hot
}

# ── Mevcut süreç sağlıklı mı? ──
if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  if health_ok; then
    echo "✓ Dev server sağlıklı → http://localhost:$PORT"
    exit 0
  fi
  echo ""
  echo "⚠ Internal Server Error tespit edildi (bozuk .next cache)."
  echo "  Otomatik onarım: cache temizle + yeniden başlat"
  echo ""
  kill_port
  wipe_cache
elif cache_broken; then
  wipe_cache
fi

start_server
