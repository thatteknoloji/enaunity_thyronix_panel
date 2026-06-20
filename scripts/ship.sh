#!/usr/bin/env bash
# Güvenli deploy: riskli dosyaları engelle, staged listesini göster, push et.
set -euo pipefail

MSG="${1:-}"
if [[ -z "$MSG" ]]; then
  echo ""
  echo "Kullanım: bash scripts/ship.sh \"commit mesajı\""
  echo "Örnek:   bash scripts/ship.sh \"fix: sözleşme seed ve deploy güvenliği\""
  echo ""
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── Yasaklı path kontrolü ────────────────────────────────────────────────────
is_forbidden_path() {
  local f="$1"

  case "$f" in
    .env) return 0 ;;
    .env.*)
      case "$f" in
        .env.example|.env.production.example) return 1 ;;
        *) return 0 ;;
      esac
      ;;
  esac

  [[ "$f" == node_modules/* || "$f" == */node_modules/* ]] && return 0
  [[ "$f" == .next/* || "$f" == */.next/* ]] && return 0
  [[ "$f" == dist/* || "$f" == */dist/* ]] && return 0
  [[ "$f" == build/* || "$f" == */build/* ]] && return 0
  [[ "$f" == logs/* || "$f" == */logs/* ]] && return 0
  [[ "$f" == *.db || "$f" == *.db-journal || "$f" == *.db-shm || "$f" == *.db-wal ]] && return 0
  [[ "$f" == *.sqlite || "$f" == *.sqlite3 || "$f" == *.sqlite-journal ]] && return 0
  [[ "$f" == *.log ]] && return 0

  return 1
}

unstage_forbidden() {
  local f
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if is_forbidden_path "$f"; then
      echo "⚠  Unstage: $f (yasaklı dosya)"
      git reset HEAD -- "$f" 2>/dev/null || true
    fi
  done < <(git diff --cached --name-only 2>/dev/null || true)
}

scan_staged_forbidden() {
  local f hits=()
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if is_forbidden_path "$f"; then
      hits+=("$f")
    fi
  done < <(git diff --cached --name-only 2>/dev/null || true)

  if ((${#hits[@]} > 0)); then
    echo ""
    echo "✗ COMMIT İPTAL — staged alanda yasaklı dosya var:"
    printf '  - %s\n' "${hits[@]}"
    echo ""
    echo "  Bu dosyalar .gitignore'da olmalı ve commit'e girmemeli."
    echo "  Takip ediliyorsa: git rm --cached <dosya>"
    echo ""
    exit 1
  fi
}

# ── Değişiklik var mı? ───────────────────────────────────────────────────────
if git diff --quiet && git diff --cached --quiet; then
  echo "Commit edilecek değişiklik yok."
  exit 0
fi

echo ""
echo "=== ENAUNITY Ship ==="
echo ""

# gitignore sayesinde riskli dosyalar normalde stage edilmez;
# daha önce track edilmiş gizli dosyalar için ek koruma
echo "→ Dosyalar stage ediliyor (.gitignore uygulanır)…"
git add -A

echo "→ Yasaklı dosyalar kontrol ediliyor…"
unstage_forbidden
scan_staged_forbidden

if git diff --cached --quiet; then
  echo "Commit edilecek değişiklik yok (yalnızca yasaklı dosyalar vardı)."
  exit 0
fi

echo ""
echo "→ Stage edilecek dosyalar:"
git diff --cached --name-status | sed 's/^/  /'
echo ""

echo "→ Commit alınıyor…"
git commit -m "$MSG"

echo "→ GitHub'a gönderiliyor (origin main)…"
git push origin main

echo ""
echo "✓ Tamam. GitHub webhook canlı deploy'u başlattı."
echo ""
