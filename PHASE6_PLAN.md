# PHASE 6 — AI Dropship Store Builder

## Mimari Kararlar (Kesinleşti)

### Ödeme Modeli
- **MVP**: `PAYMENT_MODEL = "PLATFORM"` — tüm ödemeler ENAUNITY üzerinden, fatura ENAUNITY'den müşteriye
- **İlerde**: `PAYMENT_MODEL = "DEALER"` — bayi kendi POS'unu tanımlar, faturayı kendi keser
- Altyapı (`merchantId`, `taxNumber` alanları) şimdiden `DealerStore` modelinde hazır

### Fatura
- ENAUNITY → Müşteri (e-arşiv)
- ENAUNITY → Bayiye aylık marj ödemesi (havale)
- Bayi varsa komisyon faturası keser, yoksa gider pusulası

### Domain
- **M1-M5**: Subdomain `{slug}.enaunity.com.tr`
- **M8**: Custom domain + Cloudflare Registrar
- Checkout domain: her koşulda `enaunity.com.tr/checkout` (POS tek merkezde)

### Diğer Modüllerle İlişki
- **Hazır Ürün Deposu**: Mağaza ürünlerinin kaynağı (StoreProduct → ProductCatalogItem)
- **THYRONIX, AI Page Factory, POD Creator**: Bağımsız çalışır, entegrasyon Phase 7'de
- **Mevcut ProductPackageAccess**: Hangi ürünlerin mağazaya eklenebileceğini belirler

---

## Milestone'lar

### M1 ✅ (Tamamlandı)
**Modeller + Migration + Admin Panel + Registry**

- [x] Prisma modelleri: `DealerStore`, `StoreProduct`, `StoreOrder`
- [x] `db push` ile tablolar oluşturuldu
- [x] Module marketplace registration (`AI_DROPSHIP`)
- [x] Module access control (`access.ts`)
- [x] Admin sidebar menü
- [x] Middleware route protection
- [x] Dealer sidebar integration
- [x] Admin CRUD API (`/api/dropship/stores`)
- [x] Dealer store API (`/api/dealer/dropship/store`)
- [x] Admin panel sayfası (`/admin/dropship`)
- [x] Dealer panel sayfası (setup + overview - `/dealer/dropship`)
- [x] Gateway page (`/gateway/dropship`)
- [x] Gateway API (`/api/gateway/dropship`)
- [x] Ecosystem showcase (platform-content + seed)
- [x] Build test geçti

### M2 ⬅️ (Sıradaki)
**Dealer Kurulum Paneli — Detaylı**
- [ ] Logo yükleme (coverImage)
- [ ] Tema renkleri (themeJson)
- [ ] Mağaza açılış/kapanış
- [ ] Mağaza yayına alma/almama
- [ ] İletişim bilgileri

### M3
**Ürün Seçimi + Fiyatlandırma**
- [ ] Hazır Ürün Deposu'ndan ürün listeleme
- [ ] Mağazaya ürün ekleme API
- [ ] Fiyat belirleme arayüzü
- [ ] Ürün sıralama

### M4
**Public Storefront + Subdomain Routing**
- [ ] Middleware hostname routing (`{slug}.enaunity.com.tr` → `store/[slug]`)
- [ ] Storefront anasayfa
- [ ] Ürün listesi
- [ ] Ürün detay

### M5
**Sepet + Checkout + Sipariş**
- [ ] Sepet sistemi
- [ ] Checkout (`enaunity.com.tr` üzerinde)
- [ ] StoreOrder oluşturma
- [ ] Sipariş onay emaili

### M6
**Sipariş Yönetimi + Fulfillment**
- [ ] Bayi sipariş paneli
- [ ] Sipariş durum takibi
- [ ] Fulfillment entegrasyonu

### M7
**Tema Özelleştirme**
- [ ] Renk paleti
- [ ] Font seçimi
- [ ] Logo + cover
- [ ] CSS değişkenleri

### M8
**Custom Domain**
- [ ] Cloudflare Registrar API entegrasyonu
- [ ] Custom domain bağlama
- [ ] SSL sertifikası
- [ ] Domain doğrulama

---

## Veri Modeli

```prisma
model DealerStore {
  id                  String   @id @default(cuid())
  dealerId            String   @unique
  name                String
  slug                String   @unique
  customDomain        String   @default("")
  customDomainVerified Boolean @default(false)
  logo                String   @default("")
  coverImage          String   @default("")
  aboutText           String   @default("")
  contactEmail        String   @default("")
  contactPhone        String   @default("")
  themeJson           String   @default("{}")
  paymentModel        String   @default("PLATFORM")  // "PLATFORM" | "DEALER"
  merchantId          String?
  merchantApiKey      String?
  taxNumber           String?
  taxOffice           String?
  status              String   @default("DRAFT")
  orderCount          Int      @default(0)
  totalRevenue        Float    @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  products            StoreProduct[]
  orders              StoreOrder[]
}

model StoreProduct {
  id                   String   @id @default(cuid())
  storeId              String
  productCatalogItemId String
  dealerPrice          Float    @default(0)
  isActive             Boolean  @default(true)
  sortOrder            Int      @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  store                DealerStore @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([storeId, productCatalogItemId])
}

model StoreOrder {
  id                 String   @id @default(cuid())
  storeId            String
  customerName       String
  customerEmail      String
  customerPhone      String   @default("")
  shippingAddress    String
  city               String   @default("")
  district           String   @default("")
  zipCode            String   @default("")
  itemsJson          String   @default("[]")
  totalAmount        Float    @default(0)
  status             String   @default("PENDING")
  notes              String   @default("")
  fulfillmentOrderId String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  store              DealerStore @relation(fields: [storeId], references: [id], onDelete: Cascade)
}
```

## API Routes

### Admin
- `GET /api/dropship/stores` — tüm mağazalar
- `GET /api/dropship/stores/[id]` — mağaza detay
- `PATCH /api/dropship/stores/[id]` — mağaza güncelleme

### Dealer
- `GET /api/dealer/dropship/store` — kendi mağazasını getir
- `POST /api/dealer/dropship/store` — mağaza oluştur
- `PATCH /api/dealer/dropship/store` — mağaza güncelle

### Gateway
- `GET /api/gateway/dropship` — lisans durumu sorgula

## Sayfalar

- `/admin/dropship` — admin mağaza listesi
- `/dealer/dropship` — bayi mağaza yönetimi
- `/gateway/dropship` — lisans yönlendirme
- `/platform/dropship` — ekosistem vitrini (dinamik)
- `/{slug}.enaunity.com.tr` — public storefront (M4)

## Middleware
- `/dealer/dropship` → lisans kontrolü + JWT doğrulama
- `/api/dropship/*` → admin-only
- `/api/dealer/dropship/*` → dealer + admin
