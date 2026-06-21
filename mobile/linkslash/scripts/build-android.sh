#!/usr/bin/env bash
# LinkSlash Android build helper
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== LinkSlash Android Setup ==="

if ! command -v npm >/dev/null; then
  echo "npm gerekli"
  exit 1
fi

npm install

if [ ! -d android ]; then
  echo "→ Capacitor Android platform ekleniyor..."
  npx cap add android
fi

echo "→ Native share plugin dosyaları kopyalanıyor..."
bash scripts/copy-native-share.sh

echo "→ Capacitor sync..."
npx cap sync android

echo ""
echo "✓ Hazır. Android Studio ile aç:"
echo "  npm run cap:open"
echo ""
echo "Emulator dev sunucu:"
echo "  LINKSLASH_SERVER_URL=http://10.0.2.2:3333/linkslash/mobile/ npm run android:dev"
echo ""
echo "Release APK:"
echo "  cd android && ./gradlew assembleDebug"
