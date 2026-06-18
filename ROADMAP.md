# ENA B2B Modülü — Yol Haritası

## Rakip Analizi & Esinlenme Kaynakları

### Çalınacak Özellikler (Doğrudan Implementasyon)

| Kaynak | Özellik | Durum |
|--------|---------|-------|
| **Amazon Business** | Multi-tier pricing (group-based) | ✅ Phase 2 |
| **Amazon Business** | Gated catalog (group-based restrictions) | ✅ Phase 2 |
| **Amazon Business** | Approval workflows | ✅ Phase 5 |
| **Amazon Business** | Tax exemption management | ❌ (ertelendi) |
| **Hepsiburada Premium** | Müşteri grupları (Bronze/Silver/Gold) | ✅ Phase 2 |
| **Hepsiburada Premium** | Özel fiyat listeleri | ✅ Phase 2 |
| **Trendyol Express** | Tedarikçi paneli & teklif sistemi | ✅ Phase 4 |
| **Shopify B2B** | Company profiles, net terms, credit limit | ✅ Phase 2-3 |
| **Shopify B2B** | Volume / tiered discounts | ✅ Phase 5 |
| **Shopify B2B** | Sub-accounts (alt kullanıcılar) | ✅ Phase 5 |
| **Logo / Mikro / Sage** | Cari hesap / bakiye yönetimi | ✅ Phase 3 |
| **Logo / Mikro / Sage** | Stok hareketleri log | ✅ Phase 4 |
| **Logo / Mikro / Sage** | Çoklu depo yönetimi | ✅ Phase 4 |
| **n11 / GittiGidiyor** | Toplu sipariş indirimi | ✅ Phase 5 |
| **n11 / GittiGidiyor** | Kargo takip entegrasyonu | ✅ Phase 5 |

### Esinlenilen & Adapte Edilen Özellikler

| Kaynak | Bizdeki Karşılığı |
|--------|-------------------|
| Amazon Business multi-tier → | `PriceList` modeli + `group` bazlı `getDealerPrice()` override |
| Shopify B2B net terms → | `Dealer.openingBalance` + `creditLimit` ile limit hesabı |
| Logo cari hesap → | `Payment` modeli + `/api/dealer/balance` + 4'lü kart gösterimi |
| Trendyol Express → | `Quote` sistemi (dealer teklif ister, admin onaylar/reddeder) |
| Sage stok yönetimi → | `Warehouse` + `ProductWarehouse` + `StockMovement` otomasyonu |
| Hepsiburada Premium → | `CatalogRestriction` ile grup bazlı katalog filtreleme |
| Bankacılık yazılımları → | Hesap ekstresi (işlem geçmişi, tipe göre renklendirme) |

---

## Implementation Sırası

### Phase 1 — Foundation ✅
- [x] Bayi kayıt & onay sistemi
- [x] Bayi dashboard
- [x] Bayi indirim oranı (%)
- [x] Admin bayi yönetimi
- [x] Bayi navigasyonu & layout

### Phase 2 — B2B Core ✅
- [x] Fiyat listeleri (gruba özel)
- [x] Müşteri grupları (bronze/silver/gold)
- [x] Katalog kısıtlama (gated catalog)
- [x] Minimum sipariş adedi (MOQ)
- [x] Kredi limiti kontrolü

### Phase 3 — Operations ✅
- [x] Ödeme sistemi & kaydı
- [x] Hesap ekstresi / bakiye sayfası
- [x] Sipariş detay sayfası (+ iptal)
- [x] PDF fatura indirme
- [x] Admin sipariş yönetimi (dealer bilgisi)

### Phase 4 — Advanced B2B ✅
- [x] Stok hareketleri log (otomatik düşme/ekleme)
- [x] Çoklu depo yönetimi
- [x] Excel export (ürün/sipariş/bayi/stok)
- [x] Bildirim sistemi (in-app çan + email)
- [x] Fiyat teklif sistemi (Quote CRUD)

### Phase 5 — Sıradaki (Öncelik Sırası)

- [x] **1. Sipariş Durum Geçmişi Log** — OrderStatusHistory modeli, her durum değişikliğini kaydet, admin/dealer görebilsin
- [x] **2. Dashboard Grafikleri** — Chart.js ile aylık satış grafiği, kategori dağılımı, son 7 gün sipariş
- [x] **3. Kupon / Promosyon Kodu** — Coupon modeli, admin CRUD, checkout'da uygulama, yüzde/tutar indirimi
- [x] **4. Onay Akışları (Approval Workflow)** — Sipariş onay mekanizması: dealer siparişi verir, admin onaylar, sonra işleme alınır
- [x] **5. Toplu Sipariş İndirimi (Volume Pricing)** — Miktar bazlı kademeli fiyat: 10+ adet %5, 50+ adet %10, 100+ adet %15
- [x] **6. Alt Kullanıcı / Multi-Account** — Bir bayide birden çok kullanıcı, rol bazlı yetki (admin, sipariş, görüntüleme)
- [x] **7. Kargo Entegrasyonu + Takip** — Kargo şirketi API entegrasyonu, takip numarası, durum güncelleme

---

### Phase 6 — Operations Polish ✅

> **Amaç:** Tüm operasyonların admin tarafından sorunsuz yönetilmesi

- [x] **1. Akıllı Sipariş Arama & Filtre** — Admin orders: bayi/müşteri adı, sipariş no, tarih aralığı, tutar aralığı ile arama. Tablo header sort (tarih, tutar). Sayfalama (pagination).
- [x] **2. Düşük Stok Uyarı Sistemi** — `Product.minStockLevel` field, admin dashboard'da kritik stok widget'ı, sidebar'da kırmızı badge. Stok limit altına düşünce bildirim.
- [x] **3. Toplu Sipariş İşlemleri** — Checkbox ile çoklu seçim, "Seçilenleri Onayla", "Seçilenleri İptal Et", "Toplu Kargoya Ver" butonları.
- [x] **4. Ürün Min/Max Stok Seviyesi** — Her ürüne `minStockLevel` ve `maxStockLevel` alanı. Stok hareketlerinde bu limitlere göre uyarı.

### CMS Page System ✅
> **Amaç:** Statik sayfaların (SSS, Kargo, İade, İletişim) admin panelden yönetilmesi

- [x] **1. Page Model** — `Page` prisma modeli (title, slug, content, active, order)
- [x] **2. Public API** — `GET /api/public/pages` (aktif sayfalar), `GET /api/pages/[slug]` (tek sayfa)
- [x] **3. Admin API** — CRUD: listele, oluştur, güncelle, sil
- [x] **4. Dynamic Route** — `/[slug]` route'u aktif page'leri render eder
- [x] **5. Admin UI** — `/admin/pages` listeleme + `/admin/pages/[id]` düzenleme (zengin metin editörü)
- [x] **6. Dynamic Footer** — Footer yardım linkleri DB'den çekilir, admin yeni sayfa ekledikçe footer otomatik güncellenir
- [x] **7. Seed** — Varsayılan SSS, Kargo, İade, İletişim sayfaları seed'de

---
### Phase 7 — B2B Financial ✅

> **Amaç:** Gerçek B2B finansal operasyon altyapısı

> *Not: Bu özelliklerin çoğu önceden inşa edilmişti. Bu fazda eksik parçalar tamamlandı.*

- [x] **1. Vade Farkı Sistemi** — `PaymentTerm` modeli zaten vardı (per-dealer `days` + `rate`). Eksik olan **admin UI** (`/admin/payment-terms`) yazıldı: tüm bayileri listeler, inline vade günü ve oran düzenleme. Checkout'ta term fee hesaplanıp total'e ekleniyor. `term_fee` tipinde DealerTransaction oluşuyor. Sidebar'a "Vade Farkı" menüsü eklendi.
- [x] **2. İade & İptal Yönetimi** — Zaten tamdı: dealer `/dealer/returns`'den talep açar, admin `/admin/returns`'den onaylar/reddeder, onaylanınca stok + bakiye otomatik iade edilir, bildirim gider.
- [x] **3. Kalıcı Sepet (DB-Backed)** — Zaten tamdı: `Cart` + `CartItem` DB modeli, zustand store `/api/cart` CRUD, giriş yapınca DB'den yüklenir, misafir localStorage kullanır, `mergeLocal` ile birleştirir.
- [x] **4. Gelişmiş Hesap Hareketleri** — `DealerTransaction` zaten vardı. Eksik olan **PDF ekstre indirme** (`jspdf` ile) ve **tarih aralığı filtresi** + **sayfalama** eklendi. `/dealer/balance` sayfası güncellendi.

---
### Phase 8 — UX & Professionalism 🎨

> **Amaç:** Son kullanıcıya profesyonel deneyim

- [ ] **1. HTML Email Şablonları** — Sipariş onay, kargoya verildi, teslim edildi, iade onay mail şablonları. Responsive HTML + logo.
- [ ] **2. SMS Bildirimleri (Canlı)** — `sendSMS()` gerçek API'ye bağla. Sipariş durum değişikliğinde bayiye SMS. Kargo takip no SMS'i.
- [ ] **3. Kargo API Entegrasyonu** — Yurtiçi Kargo / Aras Kargo API ile gerçek takip. Otomatik barkod oluşturma, durum webhook'u, kargo fiyat hesaplama.
- [ ] **4. Canlı Bildirimler (SSE)** — Admin yeni sipariş gelince anında görsün. Dealer siparişi onaylanınca anında bildirim (Server-Sent Events).

### Phase 8b — Notification System Overhaul 🔔
> **Amaç:** Admin/dealer bildirim sistemi, tercihler ve UI/UX iyileştirmesi

- [ ] **1. Admin Dashboard Bildirim Paneli** — Admin dashboard'un üst kısmında bildirim akışı: son 50 bildirim, tip filtreleme (sipariş/iade/onay/stok), okundu/işlem yapıldı.
- [ ] **2. Bildirim Tercihleri** — `NotificationPreference` modeli: kullanıcı hangi bildirim tiplerini almak istediğini seçer (email/SMS/uygulama içi). Admin ve dealer için ayrı sayfa.
- [ ] **3. Bildirim Gruplama** — Aynı tipteki bildirimleri grupla (örn: "3 yeni sipariş onay bekliyor"). Toplu okundu işaretleme.
- [ ] **4. Bildirim Ses/Toast** — Gerçek zamanlı toast bildirimler + sesli uyarı (opsiyonel).

---
### Phase 9 — Scale & Integrations 🚀

> **Amaç:** Büyüme ve dış dünyaya açılma

- [ ] **1. Ürün Varyantları** — `ProductVariant` modeli: aynı ürünün beden/renk/ebat seçenekleri. Her varyant için ayrı stok + fiyat + SKU. Ürün sayfasında varyant seçici.
- [ ] **2. API Anahtarı Yönetimi** — `ApiKey` modeli. Dealer'a özel API key. Rate limiting. API dökümantasyon sayfası. Webhook endpoint'leri.
- [ ] **3. Detaylı Satış Raporları** — Admin dashboard: ürün bazlı satış, bayi bazlı ciro, kategori performansı, tarih aralığı filtresi. CSV/PDF export.
- [ ] **4. Çoklu Dil Desteği** — `next-intl` ile TR/EN dil desteği. Admin panel + dealer panel + mağaza.

---

### Phase 10 — Mobile App (PWA + TWA) 📱

> **Amaç:** Sitenden APK indirilebilen, native özellikli, App Store'a gerek kalmayan mobil uygulama
> **Yaklaşım:** PWA + TWA (Trusted Web Activity) + iOS Web Clip
> **Süre:** ~3 hafta

#### 10.1 — PWA Güçlendirme

- [ ] **1. Service Worker Yeniden Yazımı** — `public/sw.js`, Workbox tabanlı
  - Cache-first: statik asset'ler, ürün resimleri, kategoriler
  - Network-first: API yanıtları (sipariş, bakiye, profil)
  - Stale-while-revalidate: ürün kataloğu, CMS sayfaları
  - Offline fallback sayfası: "Çevrimdışısın" + son veriler
  - Background sync: çevrimdışı sipariş → bağlantı gelince gönder

- [ ] **2. Manifest Güncelleme** — `public/manifest.json`
  - `id` alanı (PWA güncelleme tespiti)
  - `screenshots` dizisi (katalog, sipariş, dashboard)
  - `shortcuts`: [Siparişler, Teklifler, Favoriler, Sepet]
  - `categories: ["business", "shopping"]`

- [ ] **3. iOS Özel Meta Tag'leri** — `layout.tsx`
  - `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
  - `apple-touch-icon` (192x192 SVG)
  - iOS splash screen (tüm iPhone boyutları)

- [ ] **4. Mobil UI İyileştirmeleri**
  - iOS safe-area-inset: `pb-safe` / `pt-safe` utility'leri
  - Touch target min 44x44px
  - Pull-to-refresh: sipariş, katalog, favoriler
  - Swipe-back gesture
  - Bottom sheet: mobil filtreleme/sıralama
  - Haptic feedback: `navigator.vibrate`

- [ ] **5. "Uygulamayı Yükle" Prompt'u** — `PwaRegister.tsx`
  - `beforeinstallprompt` event → custom banner
  - iOS: "Safari → Paylaş → Ana Ekrana Ekle" yönlendirme
  - Kapat/X, 3 gün sonra tekrar göster

#### 10.2 — Native Özellikler

- [ ] **1. Push Notification** — Web Push + Firebase Cloud Messaging
  - Sipariş onay/kargo/iade push'ları
  - Bildirim tercihleri sayfası
  - Deep link ile ilgili sayfaya yönlendirme

- [ ] **2. Kamera Doküman Yükleme** — `capture="environment"` ile direkt fotoğraf
  - Evrak yükleme mobil optimize
  - Ön izleme + crop

- [ ] **3. Biometric Auth (WebAuthn)** — Parmak izi / Face ID ile giriş
  - İlk giriş normal, sonra biyometrik seçeneği
  - `navigator.credentials.get()`

- [ ] **4. Web Share API** — Ürün/teklif/sipariş paylaşımı
  - `navigator.share({title, url, text})`

- [ ] **5. Dosya Sistemine Kaydet** — `showSaveFilePicker()`
  - PDF fatura/ekstre direkt kaydet

#### 10.3 — Android APK (TWA)

- [ ] **1. Bubblewrap** — `bubblewrap init --manifest`
  - Digital Asset Links: `.well-known/assetlinks.json`
  - Keystore yönetimi (release signing key)

- [ ] **2. APK Build Pipeline'ı**
  - `bubblewrap build` → `app-release-signed.apk` (~16-18 MB)
  - GitHub Action: her release'te otomatik APK
  - `/indir/enaunity.apk` → direkt indirme

- [ ] **3. Asset Links Doğrulaması** — TWA güvenli mod

#### 10.4 — iOS Web Clip

- [ ] **1. iOS Smart Banner** — Safari'de "Ana Ekrana Ekle" akıllı banner
- [ ] **2. iOS Özel Davranışlar** — overscroll, 300ms tıklama, klavye viewport fix
- [ ] **3. "Ana Ekrana Ekle" Rehberi** — Adım adım görsel + video

#### 10.5 — İndirme Sayfası

- [ ] **1. `/indir` Sayfası** — `src/app/indir/page.tsx`
  - Device detection: Android → APK indir, iOS → PWA rehberi
  - QR kod → `enaunity.com/indir`
  - Sürüm no + dosya boyutu + hash

- [ ] **2. APK Dağıtım API'si** — `/api/download/app`
  - APK stream + Content-Disposition header
  - CDN cache (Cloudflare)

- [ ] **3. Analytics** — `app_download` event (android_apk / ios_pwa / desktop_pwa)

#### 10.6 — Test & Optimizasyon

- [ ] **1. Lighthouse PWA Audit** — Skor ≥ 95
- [ ] **2. Gerçek Cihaz Testleri** — Samsung, Xiaomi, iPhone SE/12/14 Pro Max, iPad
- [ ] **3. Offline Senaryolar** — Uçak modu, 3G throttle, bağlantı geri gelme
- [ ] **4. Push Notification Testi** — Token kaydı, deep link, permission deny stratejisi
