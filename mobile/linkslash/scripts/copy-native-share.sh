#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
NATIVE="$ROOT/native/android"

if [ ! -d "$ANDROID" ]; then
  echo "android/ yok — önce: npm run android:build"
  exit 1
fi

APP_JAVA=$(find "$ANDROID/app/src/main/java" -name "MainActivity.java" 2>/dev/null | head -1)
if [ -z "$APP_JAVA" ]; then
  echo "MainActivity.java bulunamadı"
  exit 1
fi

PKG_DIR=$(dirname "$APP_JAVA")
cp "$NATIVE/ShareReceiverPlugin.java" "$PKG_DIR/ShareReceiverPlugin.java"
cp "$NATIVE/MainActivity.java" "$APP_JAVA"

MANIFEST="$ANDROID/app/src/main/AndroidManifest.xml"
if ! grep -q "text/plain" "$MANIFEST" || ! grep -q "android.intent.action.SEND" "$MANIFEST"; then
  python3 - <<'PY' "$MANIFEST" "$NATIVE/AndroidManifest.share.xml"
import sys
from pathlib import Path
manifest = Path(sys.argv[1])
snippet = Path(sys.argv[2]).read_text()
text = manifest.read_text()
idx = text.find('android:name=".MainActivity"')
if idx == -1:
    print('MainActivity not found'); sys.exit(1)
close = text.find('</activity>', idx)
if close == -1:
    print('activity close not found'); sys.exit(1)
if 'android.intent.action.SEND' in text[idx:close]:
    print('Intent filters already present')
else:
    updated = text[:close] + snippet + text[close:]
    manifest.write_text(updated)
    print('Manifest intent filters merged')
PY
fi

echo "✓ ShareReceiver plugin + MainActivity patched"
