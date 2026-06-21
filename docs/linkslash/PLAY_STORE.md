# LinkSlash — Google Play Store Hazırlığı

> Yayın henüz yapılmayacak; pipeline ve asset yapısı hazır olacak.

## Paket bilgisi

| Alan | Değer |
|------|--------|
| Package | `com.enaunity.linkslash` |
| App name | LinkSlash |
| Min SDK | Capacitor default (API 22+) |
| Target | API 34+ |

## Build komutları

```bash
# Debug APK (test / sideload)
npm run mobile:linkslash:setup
npm run verify:linkslash-android

# Play Store AAB (release — keystore gerekli)
npm run prepare:linkslash-play-store
cd mobile/linkslash/android && ./gradlew bundleRelease
```

## Keystore (production)

1. `mobile/linkslash/android/keystore.properties.example` dosyasını `keystore.properties` olarak kopyalayın
2. Keystore oluşturun:

```bash
keytool -genkey -v -keystore linkslash-release.keystore -alias linkslash -keyalg RSA -keysize 2048 -validity 10000
```

3. `keystore.properties` içine path ve şifreleri girin (repo'ya commit etmeyin)
4. `./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`

## Play Console checklist

- [ ] Uygulama kaydı (`com.enaunity.linkslash`)
- [ ] Store listing (TR + EN)
- [ ] 512×512 icon (`mobile/linkslash/play-store/icon-512.png`)
- [ ] Feature graphic 1024×500
- [ ] Privacy policy URL (ENAUNITY gizlilik sayfası)
- [ ] Data safety form
- [ ] Internal testing track → AAB upload
- [ ] Closed testing → beta testers

## Asset klasörü

```
mobile/linkslash/play-store/
├── README.md
├── icon-512.png          (public/linkslash/icon512.png kopyası)
├── feature-graphic.png   (manuel üretilecek)
└── screenshots/          (cihaz ekran görüntüleri)
```

## Scriptler

| Script | Açıklama |
|--------|----------|
| `npm run verify:linkslash-android` | APK doğrulama + public kopyalama |
| `npm run prepare:linkslash-play-store` | Asset sync + Gradle signing şablonu kontrolü |
| `npm run package:linkslash-extension` | Chrome extension zip |
