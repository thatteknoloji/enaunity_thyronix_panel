# Operasyon Merkezi Birleştirme Raporu

**Tarih:** 2026-06-18

## Neden kaldırıldı?

**Operasyon Merkezi** (`/admin/fulfillment`) Premium Ürünler menüsünde ayrı bir hub olarak duruyordu; içindeki 8 sekmenin çoğu zaten admin panelinde daha güçlü karşılıklara sahipti:

- Siparişler → `/admin/orders`
- Depo → `/admin/stock-movements`
- Sevkiyatlar → `/admin/shipping`
- Cari → `/admin/dealer-transactions`
- Ekstreler → `/admin/invoices` (Ekstreler sekmesi)
- Raporlar → `/admin/reports`

Sayfa read-only özet paneliydi; CRUD ve operasyonel iş akışları mevcut modüllerde zaten vardı.

**Not:** `/admin/products` (B2B katalog) farklı bir domain — operasyon siparişleri oraya taşınmadı.

## URL haritası (eski → yeni)

| Eski (Operasyon Merkezi) | Yeni konum |
|---|---|
| Genel Bakış | `/admin/reports?tab=operasyon` |
| Siparişler | `/admin/orders?tab=operasyon` |
| Maliyetler | `/admin/orders?tab=operasyon` (sipariş detayında maliyet/kar) |
| Depo | `/admin/stock-movements` (operasyon hareketleri bölümü) |
| Sevkiyatlar | `/admin/shipping` (operasyon kargo listesi) |
| Bayi Cari Hesapları | `/admin/dealer-transactions` (özet kartlar) |
| Ekstreler | `/admin/invoices?tab=statements` |
| Raporlar | `/admin/reports?tab=operasyon` |
| `/admin/fulfillment` | Redirect → `/admin/orders?tab=operasyon` |

## Korunan backend

Aşağıdakiler **silinmedi** — Pazaryeri Merkezi, Hazır Ürün Deposu ve bayi fulfillment akışları buna bağımlı:

- `src/lib/fulfillment/**`
- `/api/fulfillment/**`
- `/api/my/**` (bayi)
- `/dealer/fulfillment/*` (bayi UI — Phase 2 sadeleştirme ayrı sprint)

## Teknik iyileştirmeler

- `src/lib/fulfillment/reports.ts` — raporlar artık `listOrders()` üzerinden core + legacy birleşik sayım yapıyor (`ORDER_ENGINE=core` uyumu)
- `src/components/admin/OperasyonOrdersPanel.tsx` — operasyon sipariş listesi + maliyet modal
- Premium Ürünler menüsünden **Operasyon Merkezi** linki kaldırıldı

## Phase 2 (planlanmadı)

Bayi menüsündeki `/dealer/fulfillment/*` rotalarını `/dealer/orders` ve `/dealer/invoices` ile birleştirmek.
