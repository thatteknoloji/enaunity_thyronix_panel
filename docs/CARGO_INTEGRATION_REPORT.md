# ENAUNITY — Kargo Entegrasyon Raporu

**Tarih:** 2026-06-18  
**Kapsam:** Mevcut kargo altyapısı envanteri + minimum canlı bağlantı durumu

---

## 1. Mevcut Entegrasyonlar

| Sağlayıcı | Dosya | API Route | Durum |
|-----------|-------|-----------|-------|
| **BasitKargo** | `src/lib/basitkargo.ts` | `POST /api/admin/basitkargo` | Tam API client + admin UI |
| **Kargonomi** | `src/lib/kargonomi.ts` | `POST /api/admin/kargonomi` | Tam API client + admin UI |
| **Manuel kurallar** | `ShippingConfig` model | `GET/POST/PATCH/DELETE /api/admin/shipping` | Desi/fiyat kuralları |
| **Checkout lookup** | `src/lib/shipping-calculator.ts` | `GET /api/shipping` | Sepet kargo hesabı |
| **Aras / Yurtiçi** | `src/lib/shipping.ts` | — | Stub (kullanılmıyor) |

**Admin UI:** `/admin/shipping` — BasitKargo, Kargonomi, Manuel Kurallar sekmeleri

### BasitKargo endpoint aksiyonları
`handlers`, `feeByDesi`, `createOrder`, `createOrderWithBarcode`, `filterOrders`, `getOrder`, `cancelBarcode`, `balance`, `brands`, `addresses`, `cities`, `towns`

### Kargonomi endpoint aksiyonları
`balance`, `carriers`, `listShipments`, `createShipment`, `updateShipment`, `confirmShippingPrice`, `cancelShipment`, `barcode`, `priceComparison`, `listWarehooks`

---

## 2. Order / Fulfillment Bağlantısı

| Özellik | Durum | Dosya |
|---------|-------|-------|
| Order manuel takip no | ✅ Var | `PATCH /api/admin/orders/[id]/tracking` |
| DealerShipment modeli | ✅ Var | `prisma/schema.prisma` — `DealerShipment` |
| Core order → shipment otomatik | ✅ Var | `src/lib/orders/core-order-service.ts` |
| Fulfillment shipment listesi | ✅ Var | `GET /api/fulfillment/shipments` |
| Fulfillment shipment güncelleme | ✅ **Eklendi** | `PATCH /api/fulfillment/shipments` |
| Order ↔ shipment sync | ✅ **Eklendi** | Takip no → `Order.trackingNumber` + `Order.carrier` |
| BasitKargo → Order otomatik | ❌ Yok | Admin proxy, order pipeline'a bağlı değil |
| Kargonomi webhook inbound | ❌ Yok | Webhook yönetimi var, inbound route yok |
| Canlı kargo etiketi otomasyonu | ❌ Yok | MVP dışı |

---

## 3. Canlıda Minimum Bağlantı (MVP)

**Yeterli olan:**
- Admin sipariş ekranından manuel takip no + kargo firması girişi
- Fulfillment shipment ekranından aynı bilgi güncelleme (Order ile senkron)
- Bayi bildirimi (`notifyTracking`)

**Eksik (canlı sonrası sprint):**
- BasitKargo/Kargonomi'den otomatik etiket oluşturma
- Kargo durumu webhook ile otomatik güncelleme
- BasitKargo/Kargonomi proxy route'larına `requireAdmin()` eklenmesi

---

## 4. Env Değişkenleri

```env
BASITKARGO_API_TOKEN=
KARGONOMI_API_TOKEN=
KARGONOMI_APP_KEY=
```

---

## 5. Sonuç

Canlıya çıkış için **manuel takip no + kargo firması + durum güncelleme yeterli**. Otomatik kargo etiketi entegrasyonu sonraki sprint'e bırakıldı; mevcut BasitKargo/Kargonomi admin araçları korundu.
