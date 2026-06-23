# Phase 6 — AI Dropship Store Builder
> Execution Plan — 23 Haziran 2026

---

## Genel Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    ENAUNITY PLATFORM                      │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │ Product Lib. │───▶│  AI Store    │───▶│  Store     │  │
│  │ (Ürün Seçimi)│    │  Generator   │    │  Frontend  │  │
│  └──────────────┘    └──────┬───────┘    └──────┬─────┘  │
│                             │                    │        │
│              ┌──────────────▼───────┐    ┌───────▼─────┐  │
│              │  Page Factory        │    │  Thyronix   │  │
│              │  (SEO Pages)         │    │  Feed       │  │
│              │  Product Universe    │    │  Auto-Bind  │  │
│              └──────────────┬───────┘    └───────┬─────┘  │
│                             │                    │        │
│              ┌──────────────▼────────────────────▼─────┐  │
│              │        Fulfillment Pipeline              │  │
│              │  (Sipariş → Kargolama → Teslimat)        │  │
│              └──────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Dealer Store Domain: {dealer}.enaunity.com.tr   │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Terminoloji

| Terim | Anlamı |
|-------|--------|
| **Store** | Bir bayiye ait e-ticaret sitesi |
| **Store Product** | Bayinin mağazasında sattığı ürün (ProductLibrary → seçilmiş) |
| **Store Page** | Page Factory tarafından üretilen SEO sayfası |
| **Store Template** | Mağazanın görsel teması |
| **Store Order** | Müşteriden gelen sipariş |
| **Dealer Feed** | Mağazaya özel Thyronix feed'i (fiyat/stok senkronu) |

---

# Milestone 1 — Foundation (Data Model + Admin Panel)

## M1.1 — DealerStore Modeli

**Yeni Prisma Model:**
```prisma
model DealerStore {
  id              String   @id @default(cuid())
  dealerId        String   @unique
  dealer          User     @relation(fields: [dealerId], references: [id])
  name            String   // Mağaza adı (örn: "Korhan'ın Mağazası")
  slug            String   @unique // subdomain slug (örn: "korhan")
  customDomain    String?  // özel domain (örn: "korhan.com.tr")
  templateKey     String   @default("default") // hangi tema
  status          String   @default("DRAFT") // DRAFT | ACTIVE | SUSPENDED
  currency        String   @default("TRY")
  locale          String   @default("tr-TR")
  metaTitle       String?
  metaDescription String?
  logo            String?
  favicon         String?
  socialMedia     Json?    // {instagram, facebook, whatsapp}
  contactEmail    String?
  contactPhone    String?
  shippingConfig  Json?    // {freeShippingLimit, cargoPrice, etc}
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  isActive        Boolean  @default(true)
}
```

- `npx prisma migrate dev --name add_dealer_store`
- Admin panel: `/admin/ai-dropship/stores` — CRUD table
- Dealer panel: `/hesabim/magazam` — store settings

## M1.2 — StoreProduct Modeli (Product Library Bridge)

```prisma
model StoreProduct {
  id             String   @id @default(cuid())
  storeId        String
  store          DealerStore @relation(fields: [storeId], references: [id])
  catalogItemId  String   // ProductCatalogItem ID
  catalogItem    ProductCatalogItem @relation(fields: [catalogItemId], references: [id])
  dealerPrice    Decimal? // bayi özel fiyatlandırma
  dealerStock    Int?
  isActive       Boolean  @default(true)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([storeId, catalogItemId])
}
```

## M1.3 — StoreOrder Modeli (Store → Fulfillment Bridge)

```prisma
model StoreOrder {
  id                  String   @id @default(cuid())
  storeId             String
  store               DealerStore @relation(fields: [storeId], references: [id])
  orderNumber         String   @unique // görünen sipariş no
  customerName        String
  customerEmail       String?
  customerPhone       String
  shippingAddress     String
  shippingCity        String
  shippingDistrict    String
  cargoCompany        String?
  cargoTrackingNo     String?
  status              String   @default("PENDING") // PENDING | APPROVED | SHIPPED | DELIVERED | CANCELLED
  totalAmount         Decimal
  shippingFee         Decimal  @default(0)
  grandTotal          Decimal
  paymentMethod       String   // "TRANSFER" | "CREDIT_CARD" | "PAYMENT_LINK"
  paymentStatus       String   @default("UNPAID")
  notes               String?
  fulfillmentOrderId  String?  // bağlı DealerOrder ID
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model StoreOrderItem {
  id              String   @id @default(cuid())
  orderId         String
  order           StoreOrder @relation(fields: [orderId], references: [id])
  productId       String   // StoreProduct ID
  productName     String   // snapshot
  productSku      String?
  productBarcode  String?
  quantity        Int      @default(1)
  unitPrice       Decimal
  totalPrice      Decimal
}
```

## M1.4 — Admin Panel: AI Dropship Store Builder

Admin sidebar'e yeni grup: **AI Dropship** (Partner Ecosystem grubu altına)
- `/admin/ai-dropship/stores` — Store listesi (CRUD)
- `/admin/ai-dropship/stores/[id]` — Store detay (products, orders, settings, domain)

**Konsept:** Mevcut admin pattern'i takip et — `PageFactoryShell` veya `ProductUniverseShell` benzeri bir `AiDropshipShell` component'ı.

---

# Milestone 2 — Product Selection UI (P6.2 çekirdek)

## M2.1 — Product Library "Mağazaya Ekle" Butonu

DealerProductLibraryPanel'e "Mağazaya Ekle" aksiyonu:
- Her ürün için checkbox + "Mağazaya Ekle" button
- Toplu seçim + "Seçilenleri Mağazaya Ekle"
- StoreProduct kaydı oluştur
- API: `POST /api/ai-dropship/stores/[storeId]/products`

## M2.2 — Store Product Yönetimi (Dealer)

- `/hesabim/magazam/urunler` — Mağazadaki ürünleri listele
  - Fiyat, stok override
  - Aktif/pasif toggle
  - Sıralama
  - Kategori atama

## M2.3 — Store Generator (AI)

"Mağazayı Oluştur" button'ı:
1. Seçilen ürünleri al
2. Product Universe kayıtlarını oluştur (eğer yoksa)
3. Page Factory blueprints oluştur (her ürün için: PRODUCT_DETAIL, PRODUCT_GUIDE, PRODUCT_BENEFIT, PRODUCT_COMPARISON, PRODUCT_FAQ)
4. Kategori blueprints oluştur
5. Ana sayfa blueprint'i oluştur
6. Tümünü publish et
7. Thyronix feed'ini otomatik bağla

API: `POST /api/ai-dropship/stores/[storeId]/generate`

---

# Milestone 3 — Frontend Store (P6.3)

## M3.1 — Store Frontend Routes

Wildcard routing ile çalışacak:

```
{subdomain}.enaunity.com.tr          → Store ana sayfa
{subdomain}.enaunity.com.tr/urunler  → Tüm ürünler
{subdomain}.enaunity.com.tr/kategori/{slug} → Kategori sayfası
{subdomain}.enaunity.com.tr/urun/{slug}    → Ürün detay
{subdomain}.enaunity.com.tr/sepettim      → Sepet
{subdomain}.enaunity.com.tr/siparis       → Sipariş tamamla
{subdomain}.enaunity.com.tr/hakkimizda    → Hakkında
{subdomain}.enaunity.com.tr/iletisim      → İletişim
```

**Teknik yaklaşım:** Next.js middleware ile hostname'e göre store route'lara yönlendir:
```
middleware.ts:
  - Host: "*.enaunity.com.tr" ise → store route'larına yönlendir
  - Host: "enaunity.com.tr" ise → normal platform
```

Store route'ları `src/app/store/` altında:
```
src/app/store/
  [[...slug]]/page.tsx   → Dynamic store page renderer
  sepet/page.tsx          → Sepet
  odeme/page.tsx          → Ödeme
  siparis-tamam/page.tsx  → Sipariş onay
```

## M3.2 — Store Page Renderer

Page Factory'in `PublishedPageRenderer` benzeri ama e-ticaret odaklı:
- Ana sayfa: Hero slider, öne çıkan ürünler, kategoriler
- Ürün listesi: Filtreleme, sıralama, grid/görünüm
- Ürün detay: Görsel, fiyat, stok, açıklama, SSS
- Kategori sayfası: Alt kategoriler + ürün grid

**Veri kaynağı:** Page Factory PublishedPages + StoreProduct bilgisi

## M3.3 — Store Checkout

1. Sepet (localStorage veya server-side cart)
2. Teslimat bilgileri formu
3. Ödeme seçeneği (havale/EFT veya payment link)
4. Sipariş oluştur → StoreOrder
5. Onay sayfası

Entegrasyon noktaları:
- Mevcut `PaymentCheckoutPanel` yeniden kullanılabilir
- `Order` / `DealerOrder` oluşturma mekanizması

---

# Milestone 4 — Auto-Bind & Fulfillment (P6.4 + P6.5)

## M4.1 — Thyronix Feed Auto-Bind

Store generate edilince otomatik:
1. `ThyronixFeed` oluştur (dealer'a bağlı, output: XML+JSON)
2. Feed'e store ürünlerini otomatik ekle (source mapping)
3. Feed URL'i store'a kaydet
4. Periyodik senkronizasyon (fiyat/stok güncellemeleri)

API: `POST /api/ai-dropship/stores/[storeId]/sync-feed`

## M4.2 — Fulfillment Auto-Entegrasyon

StoreOrder → Fulfillment pipeline:
1. Yeni StoreOrder oluşunca → `createDealerOrder()` çağır
2. StoreOrderItem → DealerOrderItem
3. DealerOrder status tracking
4. Kargo takibi store frontend'de göster

---

# Milestone 5 — Subdomain & Domain (P6.6)

## M5.1 — Subdomain Infrastructure

- DNS: `*.enaunity.com.tr` wildcard A record → sunucu IP
- Nginx: wildcard server block → Next.js (port 3333)
- SSL: Let's Encrypt wildcard certificate (`*.enaunity.com.tr`)
- Middleware: hostname → store lookup → store context

## M5.2 — Custom Domain

- Dealer kendi domain'ini girer (örn: `korhan.com.tr`)
- DNS TXT doğrulama
- Let's Encrypt otomatik sertifika
- Nginx config otomatik güncelleme

---

# Milestone 6 — Templates (P6.7)

## M6.1 — Template System

- `StoreTemplate` modeli:
  ```prisma
  model StoreTemplate {
    id          String   @id @default(cuid())
    key         String   @unique // "default", "minimal", "premium", etc.
    name        String
    description String?
    preview     String?  // görsel URL
    thumbnail   String?
    isDefault   Boolean  @default(false)
    config      Json?    // renkler, fontlar, layout ayarları
  }
  ```
- Her template CSS değişkenleri (renk, font, spacing) üzerinden çalışır
- Bayi template seçince store görünümü anında değişir

## M6.2 — Theme Marketplace

- `/admin/ai-dropship/templates` — Admin CRUD
- Başlangıç template'leri: "Default", "Minimal", "Premium"
- İleride community templates

---

# Implementation Order (Önerilen Sıra)

| Adım | Ne | Süre Tahmini | Bağımlılık |
|------|-----|-------------|-----------|
| **1** | DealerStore + StoreProduct model migration | ~1 saat | Yok |
| **2** | Admin panel: store CRUD | ~2 saat | Adım 1 |
| **3** | Product Library "Mağazaya Ekle" UI + API | ~3 saat | Adım 1 |
| **4** | Store Generator (Product Universe + Page Factory bridge) | ~4 saat | Adım 3 |
| **5** | Store frontend routes + page renderer | ~6 saat | Adım 4 |
| **6** | Store checkout + StoreOrder | ~4 saat | Adım 5 |
| **7** | Thyronix feed auto-bind | ~2 saat | Adım 4 |
| **8** | Fulfillment auto-entegrasyon | ~3 saat | Adım 6 |
| **9** | Subdomain routing (middleware + DNS) | ~2 saat | Adım 5 |
| **10** | Template system + themes | ~4 saat | Adım 5 |
| **11** | Custom domain support | ~2 saat | Adım 9 |

**Toplam:** ~33 saat (1-2 hafta full-time)

---

# Dosya Yapısı (Önerilen)

```
src/
  app/
    ai-dropship/                        # Dealer yüzü
      layout.tsx
      page.tsx                          # Yönlendirme / dashboard
      magazam/
        page.tsx                        # Store settings
        urunler/
          page.tsx                      # Store products
        siparisler/
          page.tsx                      # Store orders
        tasarim/
          page.tsx                      # Template seçimi
    admin/
      ai-dropship/
        layout.tsx
        page.tsx                        # Stores list
        stores/
          [id]/
            page.tsx                    # Store detail
            products/
              page.tsx                  # Store products admin
            orders/
              page.tsx                  # Store orders admin
    store/                              # Public store frontend
      [[...slug]]/page.tsx             # Dynamic page router
      sepet/page.tsx                    # Cart
      odeme/page.tsx                    # Checkout
      siparis-tamam/page.tsx            # Order confirmation
      api/
        sepet/route.ts                  # Cart API
        siparis/route.ts                # Order API
  components/
    ai-dropship/
      AiDropshipShell.tsx              # Ana shell (admin)
      StoreSettingsForm.tsx             # Store settings
      StoreProductList.tsx              # Store product management
      StoreProductSelector.tsx          # Product Library → Store
      StoreGeneratorDialog.tsx          # Generate store dialog
      StoreOrderList.tsx                # Store orders
      StoreFrontRenderer.tsx            # Public storefront renderer
      StoreTemplateSelector.tsx         # Template picker
      StoreCart.tsx                     # Cart component
      StoreCheckout.tsx                 # Checkout form
  lib/
    ai-dropship/
      types.ts                          # Types
      service.ts                        # CRUD service
      store-generator.ts                # Store generation logic
      feed-binder.ts                    # Thyronix feed binding
      order-fulfillment.ts              # Order → fulfillment bridge
      domain-service.ts                 # Domain/subdomain management
      template-service.ts               # Template management
  middleware.ts                         # Subdomain routing eklentisi
prisma/
  schema.prisma                         # + DealerStore, StoreProduct, StoreOrder, StoreTemplate
```

---

# Riskler

| Risk | Olasılık | Etki | Mitigasyon |
|------|---------|------|-----------|
| Wildcard SSL sertifikası kurulumu | Düşük | Yüksek | Let's Encrypt + certbot otomatik |
| Store frontend performansı (çok store) | Orta | Orta | ISR + CDN cache |
| Dealer ürün seçim UX karmaşıklığı | Orta | Orta | Product Library UI'sını tekrar kullan |
| Fulfillment routing (hangi bayi) | Düşük | Yüksek | DealerStore → dealerId bağlantısı net |
| Ödeme entegrasyonu | Orta | Yüksek | Mevcut payment altyapısını kullan |

---

# Ön Koşullar (Bu bitmeden başlanmamalı)

- [ ] Phase 1 güvenlik fix'leri yapılmış olmalı (JWT, Stripe webhook)
- [ ] Mevcut build stabil olmalı (şu an fix'lendikten sonra tamam)
- [ ] Product Library dealer UI'sı çalışıyor (çalışıyor)
- [ ] Page Factory universe generator çalışıyor (çalışıyor)
