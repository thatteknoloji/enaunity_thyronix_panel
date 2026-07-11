# PHASE 6 — ENA Dropship Store Builder

> Son güncelleme: ENA_DROPSHIP_STABILIZE_V1 (2026-06-26)

## Mimari Kararlar (Kesinleşti)

### Ödeme Modeli
- **MVP (şu an)**: Sipariş kaydı + `paymentStatus: PENDING_MANUAL` — online POS yok
- **Planlanan PLATFORM**: `paymentModel = "PLATFORM"` — ödemeler ENAUNITY üzerinden
- **Planlanan DEALER**: `paymentModel = "DEALER"` — bayi kendi POS'unu tanımlar
- Altyapı (`merchantId`, `taxNumber` alanları) `DealerStore` modelinde hazır

### Lisans
- Modül key: **`AI_DROPSHIP`**
- Tek kaynak: `moduleLicense` tablosu + `getModuleLicenseState()` / `resolveDropshipGatewayStep()`
- Onaylı bayi otomatik erişim **yok** — trial için açık `moduleLicense` kaydı gerekir

### Domain
- Subdomain `{slug}.enaunity.com.tr` → `/store/{slug}`
- Custom domain: admin onaylı CNAME

### Diğer Modüllerle İlişki
- **Hazır Ürün Deposu**: Mağaza ürün kaynağı (`StoreProduct` → `ProductCatalogItem`)
- **THYRONIX, AI Page Factory, POD Creator**: Bağımsız; entegrasyon sonraki faz

---

## Durum Özeti (kod ile uyumlu)

| Alan | Durum |
|------|--------|
| Storefront | ✅ done |
| Cart | ✅ done |
| Checkout order create | ✅ done (manuel ödeme) |
| Dealer store setup | ✅ done |
| Admin store management | ✅ done |
| Domain routing (subdomain + custom) | ✅ done |
| Kategori / banner / medya | ✅ done |
| Tema özelleştirme | ✅ done |
| Sipariş yönetimi (bayi + admin) | ✅ done |
| Lisans tutarlılığı | ✅ done (STABILIZE_V1) |
| **Payments (online POS)** | ⏳ pending |
| **Fulfillment entegrasyonu** | ⏳ pending |
| **Sipariş e-posta bildirimi** | ⏳ pending (`notificationStatus: NOT_CONFIGURED`) |
| **AI özellikleri** | ⏳ pending |
| **Marketplace sync** | ⏳ pending |

---

## Milestone'lar

### M1 ✅ Temel altyapı
- Prisma: `DealerStore`, `StoreProduct`, `StoreOrder`, `StoreCategory`, `StoreMedia`, `StoreBanner`
- `AI_DROPSHIP` marketplace kaydı
- Admin + dealer + gateway + public API

### M2 ✅ Dealer kurulum paneli
- Logo, tema, yayın durumu, iletişim, custom domain talebi

### M3 ✅ Ürün seçimi + fiyatlandırma
- Hazır Ürün Deposu arama, tekli + bulk ekleme, fiyat/stok

### M4 ✅ Public storefront + routing
- `{slug}.enaunity.com.tr`, custom domain rewrite, ürün listesi/detay

### M5 ✅ Sepet + checkout + sipariş
- LocalStorage sepet, checkout form, `StoreOrder` oluşturma, `orderNumber`

### M6 🔄 Sipariş yönetimi (kısmi)
- [x] Bayi + admin sipariş paneli, durum, kargo takip kodu
- [ ] Fulfillment köprüsü (`fulfillmentOrderId`)
- [ ] E-posta bildirimi

### M7 ✅ Tema özelleştirme
- Renk, font, SEO, footer, sosyal, banner

### M8 🔄 Custom domain (kısmi)
- [x] CNAME talebi + admin onay
- [ ] Cloudflare Registrar satın alma

### M9 ⏳ Ödeme entegrasyonu
- [ ] PLATFORM POS checkout
- [ ] DEALER POS modeli

### M10 ⏳ AI + Pazaryeri
- [ ] AI destekli mağaza/ürün özellikleri
- [ ] Trendyol / HB / Amazon sync

---

## Sayfalar

- `/admin/dropship` — admin mağaza listesi
- `/dealer/dropship` — bayi mağaza yönetimi
- `/gateway/dropship` — lisans yönlendirme
- `/platform/dropship` — tanıtım landing
- `/store/[slug]` — public storefront
- `/store/[slug]/checkout` — sipariş oluşturma

## API Özeti

- Admin: `/api/dropship/*`
- Bayi: `/api/dealer/dropship/*` (AI_DROPSHIP lisansı zorunlu)
- Public: `/api/public/store` (GET mağaza, POST sipariş)
- Gateway: `/api/gateway/dropship`
