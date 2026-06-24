# Bayi Bakiye & Ödeme Sistemi — Teknik Spec (v1)

**Tarih:** 2026-06-24  
**Durum:** Faz 1 implementasyon tamamlandı (commit/deploy onay bekliyor)  
**Kapsam:** B2B checkout, bayi paneli bakiye yükleme, admin ayarları (Faz 1); modül checkout (Faz 2)

---

## 1. Özet

Bayiler siparişlerini **cari bakiyeden**, **karttan (Esnek POS)** veya **ikisinin birleşimi (split)** ile ödeyebilecek. Bakiye yetersizse checkout’ta havale yönlendirmesi yok — yalnızca **bakiye yükleme** veya **kart / split** seçenekleri sunulur.

Bayi panelinden bakiye yükleme:
- **Kredi kartı (Esnek POS)** → anında bakiyeye yansır
- **Havale/EFT** → admin onayı bekler; onaylanana kadar kullanılamaz

Sipariş, sepet tutarının **tamamı** tahsil edilmeden **onaylanmaz**.

---

## 2. Terimler

| Terim | Açıklama |
|-------|----------|
| **Kullanılabilir bakiye** | `Dealer.balance` / `DealerAccount.currentBalance` — onaylı, harcanabilir tutar |
| **Bekleyen bakiye** | Havale ile yüklenmiş, admin onayı bekleyen tutar (henüz kullanılabilir bakiyeye dahil değil) |
| **Sepet tutarı** | Checkout’taki nihai toplam (indirim, kupon, vade farkı dahil) |
| **Split ödeme** | Kullanılabilir bakiyenin tamamı + kalan tutarın kart ile ödenmesi |
| **Tam kart** | Sepet tutarının tamamı karttan; bakiyeye dokunulmaz |

Para birimi: **TRY**. Tutar karşılaştırmalarında **2 ondalık** hassasiyet (`Math.round(x * 100) / 100`).

---

## 3. Mevcut Durum (AS-IS)

### 3.1 Veri modeli

- `Dealer.balance`, `Dealer.creditLimit`, `Dealer.allowNegative` — legacy + aktif motor
- `DealerAccount` + `DealerAccountTransaction` — `ORDER_ENGINE=core` / dealer account motoru
- `DealerTransaction` — legacy işlem kaydı
- `PaymentMethodPolicy` — `balanceEnabled`, `cardEnabled`, `bankTransferEnabled` (GLOBAL / GROUP / DEALER)
- `Order.metadataJson` — ödeme meta verisi için genişletilebilir
- `Payment` — bayi ödemeleri (henüz top-up akışı yok)

### 3.2 Mevcut akış

| Dosya | Davranış |
|-------|----------|
| `src/app/checkout/page.tsx` | Bayi checkout; `PaymentCheckoutPanel` + `submitOrder(paymentMethod)` |
| `src/components/payments/PaymentCheckoutPanel.tsx` | `DEALER_ACCOUNT` seçeneği; yetersiz bakiyede API hata döner |
| `src/app/api/orders/route.ts` | `DEALER_ACCOUNT` → tam bakiye kesintisi; yetersiz → `INSUFFICIENT_BALANCE` |
| `src/lib/accounting/accounting-service.ts` | `checkDealerCredit`, `deductDealerBalance`, `addDealerBalance` |
| `src/app/dealer/balance/page.tsx` | Salt okunur bakiye + ekstre (top-up UI yok) |

**Eksikler:** split ödeme, bakiye yükleme API/UI, pending havale top-up, admin top-up ayarları, kısmi ödeme state machine, kart başarısızlığında bakiye iadesi.

---

## 4. İş Kuralları

### 4.1 Bakiye ile tam ödeme

Sipariş yalnızca bakiye ile tamamlanabilir **iff**:

```
availableBalance >= cartTotal
```

- `5000 ₺` bakiye + `5000 ₺` sepet → **OK**
- `8000 ₺` bakiye + `5000 ₺` sepet → **OK** (5000 kesilir, 3000 kalır)
- `5000 ₺` bakiye + `5000.01 ₺` sepet → **BLOKE** — tam bakiye ödeme seçilemez

> Not: `allowNegative` + kredi limiti mevcut motoru korunur; bu spec **prepaid pozitif bakiye** senaryosuna odaklanır. Negatif bakiye / açık hesap bayileri için mevcut `checkDealerCredit` kuralları geçerlidir.

### 4.2 Bakiye yetersiz — checkout seçenekleri

`availableBalance < cartTotal` iken:

| Seçenek | Açıklama |
|---------|----------|
| **Split** | Tüm kullanılabilir bakiye + kalan tutar kart (policy açıksa) |
| **Tam kart** | Sepet tutarının tamamı karttan; bakiye kullanılmaz |
| **B: kart önce** | Kart kalan tutarı tahsil eder; başarılı olursa bakiye kesilir |
| **Bakiye yükle** | Top-up akışına git; checkout’a dön; `balance >= cartTotal` olunca tam bakiye mümkün |
| **Sepeti düzenle** | Ürün çıkar / miktar azalt |

**Yasak:** Yetersiz bakiyede checkout’tan havale/EFT ile sipariş tamamlama yönlendirmesi.

Havale/EFT yalnızca **bayi paneli bakiye yükleme** ekranında kullanılabilir (onay bekler).

### 4.3 Tam kart ödeme

- Sepet tutarının **%100’ü** Esnek POS ile tahsil edilir
- **Bakiyeye dokunulmaz** (ne kesinti ne rezervasyon)

### 4.4 Split ödeme

```
balancePortion = min(availableBalance, cartTotal)
cardPortion    = cartTotal - balancePortion   // > 0
```

Önerilen sıra (**kart önce, bakiye sonra**):

1. Sipariş `payment_pending` durumunda oluşturulur (stok rezervasyonu mevcut kurallara göre)
2. Karttan `cardPortion` tahsil edilir
3. Başarılı → `balancePortion` bakiyeden kesilir → sipariş `confirmed` / mevcut onay statüsüne geçer
4. Kart başarısız → sipariş **iptal**; bakiye kesilmemiş olmalı (kart önce stratejisi)

Alternatif (kart sonra) yalnızca kart önce implementasyonu zorunlu kılınır; spec v1 **kart önce** standardını kullanır.

### 4.5 Sipariş onayı

```
paidTotal = balanceCharged + cardCharged
orderConfirmed iff paidTotal === cartTotal (±0.01 tolerans yok — tam eşitlik)
```

Kısmi ödeme kalıcı sipariş olarak **kabul edilmez**. Timeout / callback gecikmesinde `payment_pending` → `cancelled` + varsa bakiye iadesi.

### 4.6 Hata & iade

| Senaryo | Sonuç |
|---------|-------|
| Kart reddedildi | Sipariş iptal; bakiye kesilmediyse işlem yok |
| Kart başarılı, bakiye kesimi DB hatası | Kart tutarı iade edilir (manuel veya otomatik refund job); sipariş iptal |
| Split’te bakiye kesildi, kart sonradan fail (eski sıra) | Kesilen bakiye `addDealerBalance` ile iade |
| Top-up kart başarısız | Bakiye değişmez |
| Top-up havale — admin red | Talep `rejected`; bakiye değişmez |

---

## 5. Bakiye Yükleme (Top-Up)

### 5.1 Giriş noktaları

1. **Bayi paneli:** `/dealer/balance` — “Bakiye Yükle” bölümü
2. **Checkout:** “Bakiye ekle” → aynı top-up modal/sayfası → `returnUrl=/checkout` ile geri dönüş

### 5.2 Yöntemler

#### A) Kredi kartı (Esnek POS)

- Anında onay → `addDealerBalance(dealerId, amount, undefined, "TOPUP_CARD", ...)`
- `DealerAccountTransaction.type`: `TOPUP_CARD`
- Esnek POS callback/webhook mevcut gateway altyapısı üzerinden

#### B) Havale / EFT

- Talep oluşturulur → status `PENDING_APPROVAL`
- Bayi UI: **“Bakiyeniz onay bekliyor — X ₺”** (kullanılabilir bakiyeye dahil değil)
- Admin onaylar → bakiyeye yansır, status `APPROVED`
- Admin reddeder → status `REJECTED`, sebep notu

### 5.3 Tutar kuralları

| Ayar | Varsayılan | Admin |
|------|------------|-------|
| Minimum yükleme | 5.000 ₺ | Evet |
| Preset 1 | 5.000 ₺ | Evet |
| Preset 2 | 10.000 ₺ | Evet |
| Preset 3 | 20.000 ₺ | Evet |
| Min altı uyarı metni | “Minimum bakiye yükleme tutarı 5.000 ₺’dir.” | Evet |

Özel tutar: `amount >= minTopUpAmount` değilse form gönderilmez, uyarı gösterilir.

Checkout’tan dönüşte: top-up sonrası `availableBalance >= cartTotal` olmadıkça “Bakiye ile öde” aktif olmaz; split / tam kart seçenekleri güncel bakiyeyle yeniden hesaplanır.

---

## 6. Checkout UX

### 6.1 Ödeme modu seçimi (bayi)

```
┌─────────────────────────────────────────┐
│ Mevcut bakiye: 3.250,00 ₺               │
│ Sepet toplamı: 5.000,00 ₺               │
├─────────────────────────────────────────┤
│ ○ Tam bakiye ile öde     [disabled]     │
│   ↳ 1.750,00 ₺ eksik — Bakiye yükle     │
│ ○ Bakiye + kart (split)  [enabled]      │
│   ↳ 3.250 ₺ bakiye + 1.750 ₺ kart       │
│ ○ Tamamını kartla öde    [enabled]      │
│   ↳ Bakiye kullanılmaz                  │
└─────────────────────────────────────────┘
```

- Bakiye yeterliyse: **Tam bakiye** varsayılan (veya son seçim cookie/localStorage)
- `balanceEnabled === false` (policy) → bakiye seçenekleri gizlenir
- `splitEnabled === false` (admin) → yalnızca tam kart veya tam bakiye (yeterliyse)

### 6.2 Etkilenen yüzeyler

| Faz | Yüzey | Not |
|-----|-------|-----|
| **1** | `/checkout` | B2B sepet |
| **1** | `/dealer/balance` | Top-up UI |
| **2** | `/payment/checkout` | Modül / paket checkout |
| **2** | Hive / modül embed checkout | Ortak `PaymentCheckoutPanel` + API |

Mimari: `src/lib/payments/checkout-payment-service.ts` (yeni) — tüm yüzeyler aynı servisi çağırır.

---

## 7. Sipariş & Ödeme State Machine

### 7.1 Yeni / genişletilmiş statüler

| Statü | Anlam |
|-------|-------|
| `payment_pending` | Sipariş oluşturuldu, tahsilat devam ediyor |
| `confirmed` / mevcut onay statüsü | Tam ödeme alındı |
| `cancelled` | Ödeme tamamlanamadı veya timeout |

### 7.2 `Order.metadataJson` şeması (öneri)

```json
{
  "payment": {
    "mode": "BALANCE_ONLY | CARD_ONLY | SPLIT",
    "cartTotal": 5000.00,
    "balancePortion": 3250.00,
    "cardPortion": 1750.00,
    "balanceCharged": 3250.00,
    "cardCharged": 1750.00,
    "gateway": "ESNEKPOS",
    "gatewayReference": "...",
    "topUpRequestId": null
  }
}
```

### 7.3 Top-up talep modeli (yeni)

```prisma
model DealerBalanceTopUp {
  id              String   @id @default(cuid())
  dealerId        String
  amount          Float
  method          String   // CARD | BANK_TRANSFER
  status          String   // PENDING_PAYMENT | PENDING_APPROVAL | COMPLETED | REJECTED | FAILED | CANCELLED
  gatewayRef      String   @default("")
  adminNote       String   @default("")
  approvedBy      String   @default("")
  returnUrl       String   @default("")
  metadataJson    String   @default("{}")
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([dealerId, status])
  @@index([status, createdAt])
}
```

---

## 8. Admin Ayarları

**Konum önerisi:** `/admin/payments/balance-settings` veya mevcut `/admin/payments/gateways` alt sekme.

| Ayar | Key | Varsayılan |
|------|-----|------------|
| Bakiye ödeme (global) | `balanceTopUp.enabled` | `true` |
| Min yükleme tutarı | `balanceTopUp.minAmount` | `5000` |
| Preset tutarları | `balanceTopUp.presets` | `[5000, 10000, 20000]` |
| Min altı uyarı | `balanceTopUp.belowMinMessage` | (TR metin) |
| Split ödeme | `balanceTopUp.splitEnabled` | `true` |
| Havale top-up | `balanceTopUp.bankTransferEnabled` | `true` |
| Havale onay SLA metni | `balanceTopUp.pendingMessage` | “Onay süresi 1-2 iş günü” |

Mevcut `PaymentMethodPolicy.balanceEnabled` bayi/grup bazlı bakiye **kullanımını** kontrol etmeye devam eder.

**Admin iş listesi:** `/admin/dealer-balance-topups` — pending havale talepleri, onay/red, not.

---

## 9. API Tasarımı

### 9.1 Bayi — bakiye özeti (genişletme)

`GET /api/dealer/balance`

Response’a eklenecek:

```json
{
  "availableBalance": 3250.00,
  "pendingTopUpTotal": 10000.00,
  "pendingTopUps": [{ "id", "amount", "method", "status", "createdAt" }],
  "topUpSettings": { "minAmount", "presets", "splitEnabled", ... }
}
```

### 9.2 Top-up başlat

`POST /api/dealer/balance/topup`

```json
{ "amount": 10000, "method": "CARD" | "BANK_TRANSFER", "returnUrl": "/checkout" }
```

- **CARD** → Esnek POS session URL / form token döner
- **BANK_TRANSFER** → talep `PENDING_APPROVAL`, havale talimatları (IBAN vb. mevcut bank transfer settings)

### 9.3 Top-up callback

`POST /api/payments/topup/callback` (Esnek POS webhook)

→ `COMPLETED` + `addDealerBalance`

### 9.4 Checkout ödeme özeti

`GET /api/payments/checkout-context?cartTotal=5000`

```json
{
  "availableBalance": 3250,
  "cartTotal": 5000,
  "canPayFullBalance": false,
  "canSplit": true,
  "split": { "balancePortion": 3250, "cardPortion": 1750 },
  "methods": ["SPLIT", "CARD_ONLY"]
}
```

### 9.5 Sipariş oluştur (genişletme)

`POST /api/orders`

Yeni body alanı:

```json
{
  "paymentMethod": "DEALER_ACCOUNT" | "ESNEKPOS" | "SPLIT",
  "paymentMode": "BALANCE_ONLY" | "CARD_ONLY" | "SPLIT"
}
```

Akış:

| Mode | Adımlar |
|------|---------|
| `BALANCE_ONLY` | Mevcut akış; `checkDealerCredit` + `deductDealerBalance` |
| `CARD_ONLY` | Gateway redirect; callback’te sipariş onay |
| `SPLIT` | `payment_pending` → kart `cardPortion` → başarı → `deductDealerBalance(balancePortion)` → onay |

### 9.6 Admin

- `GET /api/admin/dealer-balance-topups?status=PENDING_APPROVAL`
- `POST /api/admin/dealer-balance-topups/:id/approve`
- `POST /api/admin/dealer-balance-topups/:id/reject` `{ "note": "..." }`

---

## 10. Güvenlik & Tutarlılık

- Tüm tutarlar **sunucuda** yeniden hesaplanır; istemci `balancePortion` / `cardPortion` gönderse bile doğrulanır
- Top-up ve split işlemleri **idempotency key** veya gateway ref ile tekrarlanmaz
- `deductDealerBalance` + sipariş onayı aynı DB transaction’ında (Prisma `$transaction`)
- Kart callback doğrulaması mevcut Esnek POS imza kontrolü
- Rate limit: top-up başına dealer başına dakikada N istek

---

## 11. Faz Planı

### Faz 1 (MVP)

- [ ] `DealerBalanceTopUp` Prisma model + migration
- [ ] `BalanceTopUpSettings` (SiteSettings veya JSON config)
- [ ] `checkout-payment-service` — mod hesaplama
- [ ] `POST/GET` dealer top-up API + Esnek callback
- [ ] Admin havale onay ekranı
- [ ] `/dealer/balance` top-up UI
- [ ] `/checkout` — split / tam kart / bakiye UX
- [ ] `POST /api/orders` — SPLIT + CARD_ONLY modları
- [ ] Test: senaryo matrisi (aşağıda)

### Faz 2

- [ ] `/payment/checkout` entegrasyonu
- [ ] Modül ödemelerinde aynı top-up redirect
- [ ] Raporlama: top-up hacmi, split oranı

### Faz 3 (opsiyonel)

- [ ] Otomatik havale eşleştirme (dekont OCR / banka API)
- [ ] Top-up için fatura / e-arşiv

---

## 12. Test Senaryoları

| # | Bakiye | Sepet | Mod | Beklenen |
|---|--------|-------|-----|----------|
| 1 | 5000 | 5000 | BALANCE_ONLY | Onay, bakiye 0 |
| 2 | 8000 | 5000 | BALANCE_ONLY | Onay, bakiye 3000 |
| 3 | 5000 | 5000.01 | BALANCE_ONLY | Red — seçenek sunulmaz |
| 4 | 3250 | 5000 | SPLIT | Kart 1750 + bakiye 3250 |
| 5 | 3250 | 5000 | CARD_ONLY | Kart 5000, bakiye 3250 |
| 6 | 3250 | 5000 | SPLIT, kart fail | İptal, bakiye 3250 |
| 7 | 0 | 5000 | SPLIT disabled | Yalnızca CARD_ONLY veya top-up |
| 8 | — | 10000 | Top-up CARD | +10000 bakiye |
| 9 | — | 10000 | Top-up Havale | Pending; onay sonrası +10000 |
| 10 | 5000 | 5000 | Top-up pending 10k | Hâlâ 5000 kullanılabilir; pending ayrı gösterilir |

---

## 13. Dosya Haritası (implementasyon)

| Yeni / değişecek | Açıklama |
|------------------|----------|
| `prisma/schema.prisma` | `DealerBalanceTopUp` |
| `src/lib/payments/checkout-payment-service.ts` | Mod hesaplama, validation |
| `src/lib/payments/balance-topup-settings.ts` | Admin ayar okuma |
| `src/app/api/dealer/balance/topup/route.ts` | Top-up başlat |
| `src/app/api/payments/topup/callback/route.ts` | Esnek webhook |
| `src/app/api/admin/dealer-balance-topups/**` | Onay/red |
| `src/app/dealer/balance/page.tsx` | Top-up UI |
| `src/components/payments/PaymentCheckoutPanel.tsx` | Split / mod seçimi |
| `src/app/checkout/page.tsx` | Checkout entegrasyonu |
| `src/app/api/orders/route.ts` | SPLIT / CARD_ONLY |
| `src/lib/accounting/accounting-service.ts` | `TOPUP_CARD`, `TOPUP_BANK` tipleri |

---

## 14. Açık Sorular

1. **Vade farkı:** Split’te vade farkı yalnızca kart kısmına mı, tüm sepete mi uygulanır? (Mevcut: `paymentTermRate` sepete eklenir — split’te aynı kalır, önerilir.)
2. **Stok rezervasyonu:** `payment_pending` siparişlerde rezervasyon süresi / timeout (örn. 30 dk) — mevcut stok motoru ile uyumlandırılacak.
3. **Legacy vs DealerAccount motor:** Her iki motor için `addDealerBalance` / `deductDealerBalance` wrapper’ları kullanılacak (mevcut pattern korunur).

---

## 15. Onay

Bu spec, önceki konuşmada netleşen kuralları kodlanabilir tek kaynak olarak tanımlar. Onay sonrası **Faz 1** implementasyonuna geçilir.
