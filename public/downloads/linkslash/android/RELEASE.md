# LinkSlash Android — V1.0 Release Checklist

## Uygulama kimliği

| Alan | Değer |
|------|--------|
| Package name | `com.enaunity.linkslash` |
| App name | LinkSlash |
| Capacitor config | `mobile/linkslash/capacitor.config.ts` |
| Web shell | `public/linkslash/mobile/` |

## İkon

- [ ] Play Store 512×512 launcher icon (production asset)
- [ ] Adaptive icon foreground/background
- [x] Web shell `icon192.png` (PWA)

## Intent filter (Android share)

- [x] `ShareReceiverPlugin.java` — text/html/image share
- [x] AndroidManifest intent filters (Capacitor native project)
- [ ] Signed release APK/AAB pipeline (CI yok)

## Production URL

- [x] `LINKSLASH_SERVER_URL` → `https://enaunity.com.tr/linkslash/mobile/`
- [x] API: `/api/linkslash/mobile/capture`, `/api/linkslash/mobile/sync`

## Debug vs release build

| | Debug | Release |
|---|--------|---------|
| Build | `cd mobile/linkslash && npm run android:build` | Signed keystore gerekli |
| API | Production URL (config) | Aynı |
| Logging | Verbose | Kapatılmalı |

## Play Store eksikler

- [ ] Google Play Console hesabı & uygulama kaydı
- [ ] Privacy policy URL (ENAUNITY gizlilik sayfası)
- [ ] Data safety form
- [ ] Signed AAB upload
- [ ] Internal / closed testing track

## Privacy note (taslak)

LinkSlash Android uygulaması yalnızca kullanıcının paylaştığı içeriği (URL, metin) ENAUNITY hesabına kaydeder. Arka planda konum veya kişi rehberi okunmaz. Offline kuyruk cihazda tutulur, lisanslı oturum açıkken senkronize edilir.

## Kurulum (geliştirici)

```bash
cd mobile/linkslash
npm install
npm run android:build
```

Detay: `mobile/linkslash/README.md`

## Bilinen eksikler

- iOS share extension yok
- Play Store signed release pipeline yok
- Push notification yok
