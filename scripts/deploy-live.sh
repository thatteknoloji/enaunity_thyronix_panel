#!/usr/bin/env bash
# Laptop'tan tek komut canlı deploy.
#
# Akış:
#   1) preflight (typecheck raporu + dosya kontrolü)
#   2) isteğe bağlı git push
#   3) SSH → sunucuda deploy-production-quick.sh
#
# Kullanım:
#   npm run deploy:live
#   ENAUNITY_SSH_PASS='…' npm run deploy:live
#   SKIP_PREFLIGHT=1 npm run deploy:live
#   PUSH_FIRST=1 npm run deploy:live
#
# Ortam:
#   ENAUNITY_SSH_HOST  default 13.140.138.135
#   ENAUNITY_SSH_USER  default root
#   ENAUNITY_SSH_PASS  sshpass şifresi (opsiyonel)
#   ENAUNITY_APP_DIR   default /opt/enaunity
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST="${ENAUNITY_SSH_HOST:-13.140.138.135}"
USER="${ENAUNITY_SSH_USER:-root}"
APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
REMOTE="${USER}@${HOST}"

echo "=== ENAUNITY Live Deploy ==="
echo "Target: ${REMOTE}:${APP_DIR}"

if [[ "${SKIP_PREFLIGHT:-0}" != "1" ]]; then
  bash "$ROOT/scripts/preflight-deploy.sh"
else
  echo "⚠ SKIP_PREFLIGHT=1"
fi

if [[ "${PUSH_FIRST:-0}" == "1" ]]; then
  echo "→ git push origin HEAD…"
  git push origin HEAD
fi

AHEAD="$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)"
if [[ "$AHEAD" != "0" && "$AHEAD" != "?" ]]; then
  echo "⚠ Lokalda ${AHEAD} push edilmemiş commit var."
  echo "  Önce: git push   veya   PUSH_FIRST=1 npm run deploy:live"
fi

remote_cmd="cd '${APP_DIR}' && bash scripts/deploy-production-quick.sh"

echo "→ SSH deploy…"
if [[ -n "${ENAUNITY_SSH_PASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  # shellcheck disable=SC2029
  sshpass -p "${ENAUNITY_SSH_PASS}" ssh -o StrictHostKeyChecking=no "${REMOTE}" \
    "cd '${APP_DIR}' && git pull origin main && bash scripts/deploy-production-quick.sh"
else
  # shellcheck disable=SC2029
  ssh -o StrictHostKeyChecking=no "${REMOTE}" \
    "cd '${APP_DIR}' && git pull origin main && bash scripts/deploy-production-quick.sh"
fi

echo "✓ Live deploy tamam."
