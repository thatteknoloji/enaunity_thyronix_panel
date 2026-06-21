# LinkSlash — Kurulum Rehberi

Ürün adı: **LinkSlash** (eski kod adı LinkStash — kullanıcı arayüzünde kullanılmaz).

---

## Chrome Extension kurulumu

### Gereksinimler

- Google Chrome veya Chromium tabanlı tarayıcı
- Aktif LinkSlash lisansı ve ENAUNITY oturumu

### Yöntem A — Unpacked (geliştirme / MVP)

1. Chrome'da `chrome://extensions` açın
2. **Developer mode** (Geliştirici modu) açın
3. **Load unpacked** / Paketlenmemiş öğe yükle
4. Repo içinde `public/linkslash/extension` klasörünü seçin

### Yöntem B — Zip paketi

```bash
npm run package:linkslash-extension
```

1. `/downloads/linkslash/linkslash-extension.zip` indirin
2. Zip'i açın
3. `chrome://extensions` → Developer mode → Load unpacked → açılan klasörü seçin

### Production origin kontrolü

Extension `config.js` içinde `preferredOrigin` değerinin production domain ile eşleştiğinden emin olun:

- Production: `https://enaunity.com.tr` (veya canlı domain)
- Local: `http://localhost:3333`

Extension, ENAUNITY oturum çerezini kullanır — ayrı API anahtarı gerekmez.

---

## Android APK build

### Gereksinimler

- Node.js 18+
- Android Studio + SDK
- JDK 17

### Build adımları

```bash
cd mobile/linkslash
npm install
npm run android:build
cd android && ./gradlew assembleDebug
```

Build çıktısı (varsayılan):

```
mobile/linkslash/android/app/build/outputs/apk/debug/app-debug.apk
```

### Doğrulama ve public kopyalama

```bash
npm run verify:linkslash-android
```

Script:

- Proje yapısını kontrol eder
- Share intent snippet'ini doğrular
- APK varsa `public/downloads/linkslash/linkslash-debug.apk` içine kopyalar
- `android-build.json` metadata üretir
- APK yoksa **build'i kırmaz** — `status: missing` yazar

---

## Android APK yükleme (cihaz)

1. Cihazda **Bilinmeyen kaynaklardan yükleme** izni verin
2. `linkslash-debug.apk` indirin (`/linkslash/downloads`)
3. APK dosyasını açıp yükleyin
4. Herhangi bir uygulamadan **Paylaş** → LinkSlash seçin
5. ENAUNITY oturumu açık olmalı (mobil web shell veya uygulama içi giriş)

---

## Mobil web shell testi

APK olmadan mobil tarayıcıdan test:

```
/linkslash/mobile/
```

- Offline queue ve temel UI test edilebilir
- Native share intent yalnızca APK ile çalışır

---

## Production sonrası kontrol listesi

- [ ] `/linkslash` ürün sayfası erişilebilir
- [ ] `/linkslash/downloads` indirme merkezi erişilebilir
- [ ] `GET /api/linkslash/downloads/status` JSON döner
- [ ] Extension zip indirilebilir (varsa)
- [ ] APK indirilebilir (varsa) veya eksik uyarısı görünür
- [ ] Extension `config.js` production origin
- [ ] `/gateway/linkslash` lisans akışı çalışır
- [ ] `/dealer/linkslash` SPA yüklenir
- [ ] Cloud sync push/pull test edildi
- [ ] AI analyze endpoint yanıt veriyor

---

## Bilinen eksikler

| Konu | Durum |
|------|-------|
| Chrome Web Store | Henüz yayınlanmadı — unpacked kurulum |
| Google Play Store | Henüz yayınlanmadı — debug APK |
| iOS Share Extension | Planlanmış — bu sprintte yok |
| Team Workspace | Sonraki faz |
| Public Vault | Sonraki faz |
| Dedicated `/linkslash/pricing` | Checkout deep link kullanılıyor |

---

## İlgili dosyalar

| Dosya | Açıklama |
|-------|----------|
| `public/linkslash/extension/RELEASE.md` | Extension release checklist |
| `mobile/linkslash/RELEASE.md` | Android release checklist |
| `docs/linkslash/ROADMAP_LOCK_V1.md` | Resmi roadmap kilidi |
| `public/downloads/linkslash/` | İndirilebilir paketler |
