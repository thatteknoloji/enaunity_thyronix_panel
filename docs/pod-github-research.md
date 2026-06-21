# POD GitHub Araştırma — Faz 0

EnaUnity POD modülü için editör entegrasyonu **sonraki fazda** yapılacaktır. Bu doküman aday projeleri ve değerlendirme kriterlerini listeler.

## Değerlendirme kriterleri

| Kriter | Ağırlık |
|--------|---------|
| React/Next.js uyumu | Yüksek |
| Fabric.js / canvas desteği | Yüksek |
| Lisans (ticari kullanım) | Kritik |
| Bakım durumu (son commit) | Orta |
| Türkçe / B2B özelleştirme kolaylığı | Orta |
| Print area / bleed / DPI | Yüksek |

## Aday 1: lmanukyan/print-designer

- **Repo:** https://github.com/lmanukyan/print-designer
- **Odak:** Web tabanlı ürün tasarım editörü
- **Artılar:** Canvas tabanlı tasarım, ürün şablonu mantığı
- **Riskler:** Aktiflik ve lisans kontrolü gerekli
- **EnaUnity eşlemesi:** `PODProductTemplate` + `PODDesign`

## Aday 2: ProboConnect/product-configurator

- **Repo:** https://github.com/ProboConnect/product-configurator
- **Odak:** B2B ürün konfigüratörü
- **Artılar:** Kurumsal POD/print iş akışına yakın
- **Riskler:** Stack uyumu (Vue/React?) doğrulanmalı
- **EnaUnity eşlemesi:** Admin şablon yönetimi + bayi mağaza

## Aday 3: web-to-print-online-designer

- **Arama:** GitHub / npm — "web-to-print online designer"
- **Odak:** W2P (web-to-print) endüstri standardı
- **Artılar:** Baskı alanları, export pipeline deneyimi
- **Riskler:** Çoğu proje eski veya kapalı kaynak
- **EnaUnity eşlemesi:** Export → `PODOrder` fulfillment

## Aday 4: Fabric.js + React örnekleri

- **Kaynak:** http://fabricjs.com · community React wrappers
- **Örnekler:** `fabricjs-react`, custom hooks, Konva alternatifleri
- **Artılar:** Tam kontrol, EnaUnity UI ile uyum
- **Riskler:** Sıfırdan geliştirme süresi
- **EnaUnity eşlemesi:** Önerilen uzun vadeli yol — ince wrapper + `PODDesign.metadataJson`

## EnaUnity Faz planı

| Faz | Kapsam |
|-----|--------|
| **Faz 0 (şimdi)** | Prisma modeller, admin/dealer route shell, API iskelet |
| **Faz 1** | POC: Fabric.js ile basit text+image placement |
| **Faz 2** | Şablon editörü admin, creator mağaza yayını |
| **Faz 3** | Sipariş → baskı partner API / fulfillment |

## Mevcut EnaUnity modelleri

- `PODProductTemplate` — admin şablon
- `PODDesign` — creator tasarım
- `PODCreatorStore` — mağaza
- `PODOrder` — sipariş
- `PODCommission` — creator komisyonu

## LinkSlash notu

LinkSlash lisans/device/APK altyapısına **dokunulmadı**. İleride `PartnerProfile.metadataJson.linkslashLicenseId` ile opsiyonel bağlantı mümkün.

## Sonraki adım

1. Her aday repo için lisans + son commit tarihi doğrula
2. 1 haftalık POC: Fabric.js minimal editor in `/dealer/pod/designs/new`
3. Admin `/admin/pod/templates` ile şablon JSON import
