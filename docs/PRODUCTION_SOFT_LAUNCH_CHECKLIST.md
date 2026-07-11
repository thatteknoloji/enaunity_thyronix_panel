# ENAUNITY — Production Soft Launch Checklist

Canlı sunucu kurulumu öncesi kontrol listesi.

---

## Altyapı

- [ ] Domain DNS ayarları tamamlandı
- [ ] SSL sertifikası aktif (HTTPS zorunlu)
- [ ] Production sunucu provision edildi (Node 20+, PM2/systemd)
- [ ] `DATABASE_URL` production SQLite/PostgreSQL ayarlandı
- [ ] `JWT_SECRET` güçlü random değer atandı
- [ ] `ADMIN_SECRET_PATH` özelleştirildi (varsayılan `/x-control-eu-7294` değiştirildi)
- [ ] `/admin` doğrudan erişim kapalı (secret path üzerinden)
- [ ] `.env.production` tüm zorunlu değerlerle dolduruldu

---

## Convergence Flag'leri (Production)

```env
MARKETPLACE_ENGINE=hub
ACCOUNTING_ENGINE=dealer_account
ORDER_ENGINE=core
WAREHOUSE_ENGINE=core
INVOICE_ENGINE=invoice_model
LEGACY_MARKETPLACE_ENABLED=false
LEGACY_DEALER_BALANCE_ENABLED=false
LEGACY_DEALER_ORDER_ENABLED=false
LEGACY_DEALER_WAREHOUSE_ENABLED=false
```

- [ ] Tüm flag'ler yukarıdaki gibi ayarlandı
- [ ] `MARKETPLACE_ALLOW_MOCK=false` (production'da asla true olmamalı)

---

## SMTP / Bildirim

- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` ayarlandı
- [ ] Test e-postası gönderildi (sipariş/fatura bildirimi)
- [ ] SMS provider (varsa) test edildi

---

## Ödeme Testleri

### Havale / EFT (Manuel)
- [ ] Product Library paket satın alma → MANUAL_REVIEW
- [ ] Admin onayı → ProductPackageAccess ACTIVE
- [ ] ModulePayment PAID + ModuleLicense ACTIVE

### EsnekPOS
- [ ] `ESNEKPOS_ENABLED=true` + merchant credentials
- [ ] Sandbox ödeme akışı test edildi
- [ ] Callback `/api/payments/callback/esnekpos` → PAID
- [ ] PaymentWebhookLog kaydı oluşuyor

### İyzico
- [ ] `IYZICO_ENABLED=true` + API key/secret
- [ ] Checkout Form sandbox testi
- [ ] Callback `/api/payments/callback/iyzico` → PAID
- [ ] Webhook `/api/payments/webhook/iyzico` loglanıyor

---

## Product Library

- [ ] Ücretsiz paket anında erişim
- [ ] Ücretli paket — 3 ödeme seçeneği görünür (Havale, EsnekPOS, İyzico)
- [ ] XML/Excel/CSV indirme çalışıyor
- [ ] İndirme logu (`ProductDistributionLog`) kaydediliyor
- [ ] Import sync (XML/Excel) duplicate oluşturmuyor

---

## Marketplace

- [ ] Marketplace Hub cron: `POST /api/cron/marketplace-sync` (CRON_SECRET ile)
- [ ] Trendyol/Hepsiburada bağlantı testi
- [ ] Sipariş import → core Order oluşuyor
- [ ] Legacy marketplace route'ları kapalı

---

## Sipariş / Fatura / Cari

- [ ] Yeni sipariş oluşturma (core engine)
- [ ] Sipariş → fatura otomatik oluşumu
- [ ] Admin fatura ödeme kaydı → DealerAccountTransaction
- [ ] Cari bakiye doğru hesaplanıyor
- [ ] Stok hareketi (warehouse core engine)

---

## Kargo

- [ ] Admin sipariş ekranından manuel takip no girişi
- [ ] Fulfillment shipment PATCH ile güncelleme
- [ ] Bayi kargo bildirimi alıyor

---

## HIVE

- [ ] `HIVE_ENABLED=true/false` config çalışıyor
- [ ] `HIVE_SALES_ACTIVE=false` → pricing'de "Yakında"
- [ ] `/gateway/hive` lisanslı kullanıcı için çalışıyor
- [ ] `/hive/login` session bridge test edildi
- [ ] `HIVE_PROXY_MODE=external` + `HIVE_BASE_URL` (canlı HIVE varsa)

---

## Admin / Yetki

- [ ] Secret path ile admin girişi
- [ ] Rol bazlı erişim (SUPER_ADMIN, ADMIN, MANAGER, vb.)
- [ ] Bayi/dealer ayrımı doğru

---

## Cron Route'ları

| Route | Amaç |
|-------|------|
| `POST /api/cron/marketplace-sync` | Marketplace hub sync motor |
| `POST /api/cron/nexa-sync` | Nexa sync (legacy) |
| `POST /api/cron/thyronix-sync` | Thyronix sync |

- [ ] `CRON_SECRET` ayarlandı
- [ ] Cron job'lar sunucuda zamanlandı

---

## Yedekleme & Rollback

- [ ] Veritabanı günlük yedekleme planı
- [ ] `.env` yedeği güvenli konumda
- [ ] Önceki sürüm deploy paketi saklandı
- [ ] Rollback prosedürü dokümante edildi:
  1. Önceki build'e dön (`git checkout` + `npm run build`)
  2. DB restore (gerekirse)
  3. Env flag'leri kontrol et

---

## Build & Test Komutları

```bash
npm run build
npm run test:product-library-live
npm run test:marketplace-convergence
npm run test:accounting-convergence
npm run test:order-convergence
npm run test:warehouse-convergence
npm run test:invoice-convergence
npm run test:payment-gateways
npm run test:production-readiness
```

- [ ] Tüm testler geçti
- [ ] Build 0 hata

---

## Go-Live Onayı

- [ ] Staging ortamında tam akış test edildi
- [ ] Production env dolduruldu
- [ ] DNS cutover planlandı
- [ ] İlk gerçek ödeme (sandbox dışı) test edildi
- [ ] Soft launch — sınırlı bayi grubu ile başlat
