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

ANDROID_VALID=false
if [ -d android ] && find android/app/src/main/java -name "MainActivity.java" 2>/dev/null | grep -q .; then
  ANDROID_VALID=true
fi

if [ "$ANDROID_VALID" = false ]; then
  if [ -d android ] && [ -z "$(ls -A android 2>/dev/null)" ]; then
    rmdir android 2>/dev/null || rm -rf android
  fi
  if [ ! -d android ]; then
    echo "→ Capacitor Android platform ekleniyor..."
    npx cap add android
  fi
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
echo ""
echo "Play Store AAB (keystore gerekli):"
echo "  npm run prepare:linkslash-play-store"
echo "  cd android && ./gradlew bundleRelease"
