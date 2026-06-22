# ENAUNITY Roadmap

> Sistem geneli analiz ve geliştirme yol haritası — 22 Haziran 2026

---

## Phase 1 — Security & Stability (Hemen)

| # | Task | Neden | Dosyalar |
|---|---|---|---|
| P1.1 | JWT `"fallback-secret"` kaldır, env required yap | Güvenlik açığı — env yoksa herkes token üretebilir | `src/lib/auth.ts`, `src/middleware.ts` |
| P1.2 | JWT doğrulamayı tek fonksiyonda birleştir | Middleware Web Crypto API, backend jsonwebtoken kullanıyor — iki ayrı implementation bypass riski | `src/middleware.ts`, `src/lib/auth.ts` |
| P1.3 | Stripe webhook signature doğrulaması ekle | `stripe.webhooks.constructEvent()` çağrılmıyor, sahte webhook ile ödeme atlatılabilir | `src/app/api/stripe/webhook/route.ts` |
| P1.4 | Login/register/forgot-password rate limit ekle | Brute-force korumasız | `src/app/api/auth/login/route.ts`, `register/route.ts`, `forgot-password/route.ts` |
| P1.5 | AI encryption fallback key kaldır | `ai-crypto.ts`'de hardcoded fallback var, env yoksa encryption kırılabilir | `src/lib/thyronix/ai-crypto.ts` |

## Phase 2 — Ölü Kod & Tutarsızlık Temizliği

| # | Task | Detay |
|---|---|---|
| P2.1 | PAYTR type-only referansını temizle | `PaymentProviderKey`'de tanımlı ama provider implementasyonu yok, factory case'i yok. Çağrılırsa runtime error |
| P2.2 | Stripe'ı `PaymentProvider` interface'ine entegre et veya kaldır | `create-payment-intent` + stripe webhook ayrı flow'da, module payment kaydı oluşturmuyor |
| P2.3 | Payment provider belirleme mekanizmasını birleştir | `getActivePaymentProvider()` env-only ile `resolveActiveProviderKey()` DB-backed çelişiyor |
| P2.4 | `DealerGroup` string FK'yı ID FK'ya çevir | `Dealer.group` → `DealerGroup.name` string referans. Name değişirse tüm dealer'lar kopar |
| P2.5 | Fee hesaplama frontend/backend ikilemesini kaldır | `payment-settings.ts` ve `PaymentCheckoutPanel.tsx` aynı hesabı ayrı yapıyor |
| P2.6 | `getPaymentSettings()` cache stratejisini düzelt | 15 saniyelik in-memory cache multi-server'da anlamsız |

## Phase 3 — Test Altyapısı

| # | Task | Detay |
|---|---|---|
| P3.1 | `vitest` + Prisma mocking kurulumu | Test runner ve DB mock altyapısı |
| P3.2 | Pure logic modüllerini testle | `merge-engine.ts`, `xml-parser.ts`, `csv-parser.ts`, `excel-parser.ts`, `commercial.ts`, `templates.ts`, fee hesaplama |
| P3.3 | Auth flow integration testleri | Login, register, 2FA, session, module access |
| P3.4 | Payment flow testleri | createPaymentIntent, approvePayment, callback handling, webhook |
| P3.5 | Thyronix sync/generate testleri | Source → Product → Feed pipeline |

## Phase 4 — Refactoring (Teknik Borç)

| # | Task | Detay |
|---|---|---|
| P4.1 | `any` tiplerini temizle | `as any` ve `any` tipi tüm modüllerde yaygın. Prisma generated types + Zod ile tip güvenliği |
| P4.2 | Zod ile API request validation ekle | Tüm route'lara Zod schema. Aynı zamanda tip çıktısı |
| P4.3 | Monolitik component'leri böl | `products-content.tsx` (711 satır) → `ProductList`, `ProductRow`, `ProductDetailModal`. `sources-content.tsx` (542 satır) → `SourceList`, `SourceFormModal`, `SourceRow` |
| P4.4 | Search/filter kodunu tekilleştir | Smart search parsing hem `product-query.ts`'de hem `products/route.ts`'de inline |
| P4.5 | Service layer çıkar | API route'larındaki business logic'i `src/lib/thyronix/services/` altına taşı |
| P4.6 | Parasal alanları `Float` → `Decimal` yap | `price`, `total`, `amount` alanlarında kuruş yuvarlama hatası riski |
| P4.7 | Excel parser'daki `require`'ı ESM-safe yap | `excel-parser.ts:89` `require("xlsx")` kullanıyor, `import` yap |
| P4.8 | `catch {}` boş bloklarını doldur | `feed-fetch.ts:23`, `ai-service.ts:66` — hatalar sessizce kayboluyor |
| P4.9 | Status/String enum tutarsızlığını temizle | 15 native Prisma enum var ama çoğu alan `String` ile serbest metin |

## Phase 5 — Multi-Marketplace Expansion 🆕

| # | Task | Detay |
|---|---|---|
| P5.1 | `MarketplaceProvider` interface tasarımı | Generic marketplace connector pattern. Trendyol referans implementation |
| P5.2 | Hepsiburada entegrasyonu | API entegrasyonu, sipariş çekme, stok güncelleme, fiyat güncelleme |
| P5.3 | N11 entegrasyonu | API entegrasyonu |
| P5.4 | Amazon TR entegrasyonu | Amazon SP-API entegrasyonu |
| P5.5 | Facebook/Instagram Shop | Catalog upload + Commerce API |
| P5.6 | Google Shopping auto-submit | Thyronix template'i var ama otomatik Content API submit yok |
| P5.7 | Trendyol mevcut entegrasyonu iyileştir | Label policy, webhook reliability, hata yönetimi |

## Phase 6 — AI Dropship Store Builder 🆕 (Yeni Modül)

| # | Task | Detay |
|---|---|---|
| P6.1 | Modül konsept tasarımı | Product Library → AI Store pipeline mimarisi |
| P6.2 | Product Library → AI Store generator | Bayi Product Library'den ürün seçer, AI otomatik e-ticaret sitesi kurar |
| P6.3 | Page Factory + Universe birleşimi | Product Universe entity'leri → Page Factory blueprint → SEO site |
| P6.4 | Thyronix feed auto-bağlama | Oluşan siteye Thyronix feed'i otomatik bağlanır, fiyat/stok senkronu |
| P6.5 | Fulfillment auto-entegrasyon | Sipariş gelince fulfillment üzerinden karşılanır |
| P6.6 | Bayiye özel subdomain / custom domain | Her bayi kendi mağazasını alır |
| P6.7 | Theme/store template marketplace | Bayilerin kullanabileceği hazır şablonlar |

## Phase 7 — AI Commerce Tools 🆕

| # | Task | Detay |
|---|---|---|
| P7.1 | AI Müşteri Hizmetleri Botu | Bayilerin kendi müşterilerine AI destek. Chat + WhatsApp. Mevcut AI provider altyapısı hazır |
| P7.2 | WhatsApp Commerce | WhatsApp sipariş botu + otomatik sipariş oluşturma. Türkiye pazarı WhatsApp üzerinden siparişe alışkın |
| P7.3 | AI Product Photography | Mevcut `image-harvester.ts` altyapısına AI arka plan temizleme + görsel iyileştirme |
| P7.4 | AI Talep Tahmini / Stok Forecasting | Geçmiş sipariş verisiyle "bu ürün 2 hafta sonra bitecek" tahmini |

## Phase 8 — Dealer Mobile & Portal 🆕

| # | Task | Detay |
|---|---|---|
| P8.1 | Dealer Mobile App | React Native. Sipariş onay, stok sorgulama, QR barkod okuma, anlık bildirim. LinkSlash Android build altyapısına ek |
| P8.2 | Supplier Portal | Tedarikçiler giriş yapıp ürün yönetimi, stok güncelleme, sipariş görüntüleme |
| P8.3 | QR/Barkod Stok Yönetimi | Mobil cihazla stok sayımı, barkod sorgulama |

## Phase 9 — Uzun Vade

| # | Task | Detay |
|---|---|---|
| P9.1 | Prisma schema böl | 174 model tek `schema.prisma`. `core-commerce`, `thyronix`, `affiliate` gibi context'lere ayır |
| P9.2 | Soft delete mekanizması | Çoğu modelde `deletedAt` yok. Fiziksel silme yerine soft delete |
| P9.3 | Refresh token rotation | 7 günlük JWT tek token. Short-lived access + long-lived refresh |
| P9.4 | Thyronix connector plugin sistemi | Connector'lar şu an hardcoded TS dosyası. Interface + dynamic registry |
| P9.5 | Cascade delete politikası | `OrderItem → Product`, `VariantGroup → Product` gibi ilişkilerde `onDelete` tanımlı değil |
| P9.6 | Audit log monitoring/alerting | `logAdminAction()` hataları sessizce yutuyor. Console + monitoring |
| P9.7 | `@updatedAt` ekle | Birçok modelde otomatik timestamp yok, audit zorlaşıyor |

---

## Proje Büyüklüğü (Mevcut Durum)

| Metrik | Değer |
|---|---|
| DB Modeli | 174 (tek schema.prisma) |
| API Route | 395 |
| Sayfa Route | ~100 |
| Lib modül | 264 dosya |
| Component | 86 |
| Premium modül | 5 (Thyronix, Hive, LinkSlash, POD, Page Factory) |
| Test | 0 |

---

*Son güncelleme: 22 Haziran 2026*
