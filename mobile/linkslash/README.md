# LinkSlash Android Mobile

Capacitor wrapper for Android Share Intent → LinkSlash capture.

## Prerequisites

- Node.js 20+
- Android Studio + Android SDK
- JDK 17

## Setup

```bash
cd mobile/linkslash
npm install
npm run android:build
npm run cap:open
```

## Dev (emulator + local ENAUNITY)

Terminal 1:
```bash
cd /path/to/enaunity && npm run dev
```

Terminal 2:
```bash
cd mobile/linkslash
LINKSLASH_SERVER_URL=http://10.0.2.2:3333/linkslash/mobile/ npm run android:dev
npm run cap:open
```

## Production

Default server URL: `https://enaunity.com.tr/linkslash/mobile/`

```bash
cd mobile/linkslash
npm run android:build
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Share flow

1. User taps Share in any app
2. Selects **LinkSlash**
3. Native layer stores intent via `ShareReceiverPlugin`
4. Web shell reads pending share → POST `/api/linkslash/capture`
5. Offline → localStorage queue → POST `/api/linkslash/mobile/sync`

## Intent filters

- `text/plain`, `text/html`
- `image/*`, `video/*`, `application/pdf`
- `SEND_MULTIPLE` text/plain

## Notes

- Auth uses ENAUNITY session cookies in WebView
- No API keys in client
- AI enrichment runs server-side after capture
