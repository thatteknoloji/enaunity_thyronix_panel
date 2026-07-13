# Operasyon sipariş detay — geri dönüş notu

**Güvenli nokta (yeni detay sayfasından önce):** `efaeb360`  
**Tag:** `backup/pre-operasyon-detail-2026-07-13`  
**Branch:** `backup/pre-operasyon-detail`

## Eski yapı neydi?
- Liste + popup (drawer) detay: `OperasyonOrdersPanel`
- Tam sayfa detay yoktu
- Yedek dosya: `src/components/admin/OperasyonOrdersPanel.legacy.tsx`

## Eski paneli geri getirmek
```bash
# Tüm repoyu o commit'e almak
git checkout backup/pre-operasyon-detail

# Veya sadece eski paneli geri koymak:
cp src/components/admin/OperasyonOrdersPanel.legacy.tsx src/components/admin/OperasyonOrdersPanel.tsx
```

## Yeni yapı
- Liste: satır → tam sayfa
- Bayi: `/dealer/marketplace/orders/[id]`
- Admin: `/admin/orders/operasyon/[id]`
- Bileşen: `src/components/orders/OperasyonOrderDetailView.tsx`
