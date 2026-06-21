# LinkSlash İndirme Dosyaları

Bu klasör LinkSlash dağıtım paketlerini barındırır.

## Beklenen dosyalar

| Dosya | Açıklama |
|-------|----------|
| `linkslash-extension.zip` | Chrome Extension paketi (`npm run package:linkslash-extension`) |
| `linkslash-debug.apk` | Android debug APK (`npm run verify:linkslash-android`) |
| `android-build.json` | APK doğrulama metadata (otomatik üretilir) |
| `extension/` | Opsiyonel: ek extension notları |
| `android/` | Opsiyonel: Android build notları |

## Komutlar

```bash
npm run package:linkslash-extension
npm run verify:linkslash-android
```

APK yoksa build kırılmaz — indirme merkezi durumu gösterir.

Detaylı kurulum: [INSTALLATION.md](./INSTALLATION.md) ve `docs/linkslash/INSTALLATION.md`.
