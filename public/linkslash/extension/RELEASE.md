# LinkSlash Chrome Extension — V1.0 Release Checklist

## Paket bilgisi

| Alan | Değer |
|------|--------|
| Manifest version | MV3 — `1.2.0` (`public/linkslash/extension/manifest.json`) |
| Klasör | `public/linkslash/extension/` |
| Yükleme | Chrome → Extensions → Developer mode → Load unpacked |

## İkonlar

- [x] `icon16.png`, `icon48.png`, `icon128.png` mevcut
- [ ] Chrome Web Store için 128×128 PNG (store asset) ayrı export
- [ ] Promotional tile / screenshot set (1280×800)

## Production API origin

- [x] `config.js` → `preferredOrigin: https://enaunity.com.tr`
- [x] `origins` listesi production + localhost dev
- [ ] Store build için yalnızca production origin whitelist (dev origins kaldırılabilir)

## Permissions (manifest)

- [x] `contextMenus`, `storage`, `activeTab`, `scripting`
- [x] Host permissions: `<all_urls>` (meta fetch için)
- [ ] Store review: `<all_urls>` gerekçesi privacy note'da açıklanmalı

## Privacy note (taslak)

LinkSlash extension yalnızca kullanıcı tarafından kaydedilen URL ve sayfa meta verilerini ENAUNITY hesabınıza gönderir. Üçüncü taraf reklam/track yok. API anahtarları extension içinde saklanmaz; oturum cookie ile ENAUNITY sunucusuna bağlanır.

## Store açıklaması (taslak — TR)

**Başlık:** LinkSlash — Link Kaydet & AI Özet

**Kısa açıklama:** Web, sosyal medya ve mesajlardan linkleri tek tıkla kaydedin. ENAUNITY Cloud Sync ile senkronize edin.

**Uzun açıklama:**
- Sağ tık → LinkSlash ile kaydet
- X, Instagram, YouTube, Reddit ve daha fazlası
- ENAUNITY LinkSlash lisansı gerekir
- Cloud sync ile tüm cihazlarda erişim

## Kurulum adımları (bayi / admin)

1. ENAUNITY'de LinkSlash lisansı aktif olsun
2. `https://enaunity.com.tr/linkslash/extension/` klasörünü zip'leyin veya repo'dan `public/linkslash/extension` yükleyin
3. Chrome'da unpacked olarak yükleyin
4. ENAUNITY'ye giriş yapın (`/gateway/linkslash`)
5. Extension popup → oturum bağlı mı kontrol edin
6. Herhangi bir sayfada sağ tık → LinkSlash ile kaydet

## Bilinen eksikler

- Chrome Web Store listing yok
- Auto-update channel yok
- Firefox / Safari extension yok
