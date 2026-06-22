#!/usr/bin/env bash
# Production: LinkSlash APK rebuild + post-deploy
# Run on server: bash scripts/deploy-linkslash-pu-production.sh
set -euo pipefail

APP_DIR="${ENAUNITY_APP_DIR:-/opt/enaunity}"
cd "$APP_DIR"

set -a
# shellcheck disable=SC1091
source .env.production
set +a

echo "=== git pull ==="
git pull origin main

echo "=== prisma ==="
npx prisma generate
npx prisma db push --skip-generate

echo "=== Android APK build ==="
cd mobile/linkslash
npm install --no-audit --no-fund
npx cap sync android
cd android
echo "sdk.dir=${ANDROID_SDK_ROOT:-/opt/android-sdk}" > local.properties
./gradlew clean assembleDebug

echo "=== APK sync ==="
cd "$APP_DIR"
npm run verify:linkslash-android
npx tsx scripts/ensure-linkslash-apk.ts

echo "=== production post-deploy ==="
bash scripts/production-post-deploy.sh

pm2 restart enaunity --update-env
pm2 save

echo "=== smoke tests ==="
curl -sI https://enaunity.com.tr/linkslash/downloads | head -3
curl -s https://enaunity.com.tr/api/linkslash/version | head -c 600
echo ""
curl -sI https://enaunity.com.tr/linkslash/mobile | head -5

echo "✓ Deploy tamamlandı."
