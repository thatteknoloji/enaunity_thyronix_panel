# UI Türkçe Lokalizasyon Raporu

**Sprint:** Türkçe UI Temizliği ve Canlı Dil Standardizasyonu  
**Tarih:** 2026-06-18

## Değiştirilen Ana Alanlar

### Merkezi altyapı
- `src/lib/ui/turkish-labels.ts` — durum, fatura tipi, lisans seviyesi ve ortak UI sabitleri
- `src/lib/i18n/dictionaries/tr.ts` — admin `dashboard` → Genel Bakış, `webhooks` → Bildirimler
- `src/lib/customer-products/types.ts` — ENA Ticaret, Hazır Ürün Deposu
- `src/lib/modules/access.ts` — modül görünen adları

### Admin panel
- `src/app/admin/layout.tsx` — Hazır Ürün Deposu, Operasyon Merkezi, Pazaryeri Merkezi, Modül Lisansları/Ödemeleri, Ekosistem Vitrini
- `src/app/admin/page.tsx` — Genel Bakış başlığı
- `src/app/admin/product-library/page.tsx` — sekmeler, durum rozetleri, içe aktarım metinleri
- `src/app/admin/fulfillment/page.tsx` — Operasyon Merkezi sekmeleri ve durum etiketleri
- `src/app/admin/marketplace-hub/page.tsx` — Pazaryeri Merkezi sekmeleri, form placeholder’ları
- `src/app/admin/module-licenses/page.tsx` — modül adı ve durum Türkçe
- `src/app/admin/payments/module-payments/page.tsx` — modül adı ve ödeme durumu Türkçe
- `src/app/admin/hive/page.tsx`, `admin/reports/page.tsx`, `admin/integrations/hive/page.tsx`

### Bayi panel
- `src/app/dealer/layout.tsx` — Hazır Ürünler, Pazaryeri Bağlantıları/Siparişleri
- `src/app/product-library/page.tsx` — Hazır Ürünler başlığı
- `src/app/dealer/orders/page.tsx` — Operasyon Bekleyen, Pazaryeri filtreleri

### Müşteri / Hesap merkezi
- `src/app/(customer-center)/products/layout.tsx` — zaten Türkçe (Ürünlerim)
- `src/components/customer-products/ProductCard.tsx` — Hazır Ürünlere Git
- `src/components/account/AccountShell.tsx` — Hesap Merkezi
- `src/app/admin/customer-products/page.tsx` — Müşteri Ürünleri, modül/durum etiketleri
- `src/app/admin/ecosystem/` — Ekosistem Vitrini
- `src/app/dealer/marketplace/` — Pazaryeri Bağlantıları ve Siparişleri
- `src/app/account/page.tsx` — Genel bakış hata metni
- `src/lib/customer-products/service.ts` — ENA Ticaret ownedProducts etiketi

## Bilinçli Olarak Çevrilmeyen Teknik Terimler

| Terim | Neden |
|-------|--------|
| THYRONIX, HIVE | Marka adları |
| SKU, XML, CSV, Excel, API | Endüstri standardı kısaltmalar |
| Prisma enum değerleri (ACTIVE, PENDING, …) | Backend/API uyumu — yalnızca ekranda `statusLabel()` ile Türkçe gösterilir |
| Route/path isimleri (`/product-library`, `/admin/fulfillment`) | Sprint kuralı: URL değiştirilmedi |
| Model/alan adları (`moduleKey`, `planKey`, `billingType`) | Payload ve kod uyumu |
| Platform kodları (TRENDYOL, HEPSIBURADA, …) | Pazaryeri tanımlayıcıları |
| THYRONIX feed/kaynak terminolojisi | Ürün markası iç terminolojisi; ayrı sprint kapsamında |

## Kalan Şüpheli İngilizce Metinler

- `src/app/admin/ecosystem/` — vitrin detay sayfalarında İngilizce kart metinleri olabilir
- `src/app/admin/customer-products/` — tablo kolonlarında ham `moduleKey` görünebilir
- `src/app/admin/thyronix/` — admin THYRONIX yönetim ekranları (kısmen İngilizce)
- `src/app/thyronix/` — Feed, Provider gibi marka-teknik terimler
- Eski admin sayfaları (`/admin/products`, `/admin/dealers` vb.) — i18n anahtarları kullanıyor; bazı inline İngilizce kalıntılar olabilir
- Toast/API hata mesajları — backend’den dönen ham İngilizce mesajlar (ör. üçüncü parti API)

## Kontrol Edilmesi Gereken Sayfalar

| Sayfa | Durum |
|-------|--------|
| `/admin` | Genel Bakış ✓ |
| `/admin/product-library` | Hazır Ürün Deposu ✓ |
| `/admin/marketplace-hub` | Pazaryeri Merkezi ✓ |
| `/admin/fulfillment` | Operasyon Merkezi ✓ |
| `/product-library` | Hazır Ürünler ✓ |
| `/products` | Ürünlerim ✓ |
| `/dealer/balance` | Türkçe (önceden) |
| `/dealer/orders` | Güncellendi ✓ |
| `/admin/payments/module-payments` | Güncellendi ✓ |
| `/admin/module-licenses` | Güncellendi ✓ |
| `/account` | Hesap Merkezi ✓ |

## Test

```bash
npm run build
npm run test:product-library-live
```

Build ve mevcut testler backend enum/route değişikliği olmadığı için etkilenmemelidir.
