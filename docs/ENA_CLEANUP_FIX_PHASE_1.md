# ENA Cleanup Fix — Phase 1

**Tarih:** 23 Haziran 2026  
**Kaynak:** `docs/ENA_SYSTEM_CLEANUP_AUDIT_V1.md`  
**Kural:** Büyük silme yok · Prisma model silme yok · veri silme yok · canlı route kırılmadı

---

## Executive Summary

Faz 1, audit’teki **kullanıcıyı yanıltan duplicate/legacy yüzeyleri** park etti ve **ortak helper’lar** ekledi. Hiçbir dosya veya route silinmedi; legacy path’ler backward-compatible wrapper olarak işaretlendi.

---

## 1. Git / Untracked Durumu (audit sonrası)

Önceki commit (`2601168`) ile **Blog Engine, Universe Bridge V2, feed chunking** zaten `main`’e alındı.

**Bu fazda yeni/değişen (commit bekliyor):**

| Dosya / alan | Durum |
|--------------|--------|
| `src/lib/geo/turkiye-geo-source.ts` | Yeni — ortak GEO helper |
| `src/app/api/product-universe/excel/templates`, `excel/template` | Yeni — canonical alias |
| `docs/LINKSLASH_WHATSAPP_FIX_NOTES.md` | Yeni — rapor only |
| Page Factory shell, import wrappers, Blog Engine, admin badges | Modified |

**Silinmedi:** `checkout-demo`, legacy import routes, `BlueprintUniverseTab`, `TOP_20_CITIES`.

---

## 2. Ne Değişti

### Page Factory — çift universe sadeleştirme

- **Varsayılan aktif akış:** `PageFactoryUniverseGeneratorTab` (Universe Generator V2)
- **Legacy:** `BlueprintUniverseTab` → menüde **"Legacy Blueprint Evren"** (amber), uyarı banner’ları
- Proje detayında **Universe Generator (V2)** birincil buton; legacy ayrı sekme
- Eski component **silinmedi**; API `/api/page-factory/projects/[id]/universe/*` dokunulmadı

### Product Universe — import route karmaşası

| Canonical (UI kullanır) | Legacy wrapper (korundu) |
|-------------------------|--------------------------|
| `POST /api/product-universe/excel/preview` | `POST .../import/preview` |
| `POST /api/product-universe/excel/commit` | `POST .../import/commit` |
| `GET/POST .../excel/templates` | `.../import/templates` |
| `GET .../excel/template` | `.../import/template` |
| `GET .../excel/jobs` | `.../import/jobs` |
| `GET .../excel/jobs/[id]` | `.../import/jobs/[id]` |
| — | `POST .../import` (monolithic legacy) |

`ProductUniverseImportWizard` artık yalnızca **excel/** path kullanıyor.

### GEO kaynak tekleştirme

Yeni: `src/lib/geo/turkiye-geo-source.ts`

- `getDefaultGeoCities(limit?)`
- `getTopGeoCities(limit?)`
- `getGeoCitiesFromDbOrFallback(limit?)`
- `normalizeProvinceName()`

**Blog Engine:** `blog-service.ts` GEO üretiminde DB → fallback; UI il listesi admin GEO API’den yüklenir.  
**TOP_20_CITIES:** deprecated notu güçlendirildi; **silinmedi**.

### Stub / Beta etiketleri

| Ekran | Etiket |
|-------|--------|
| Admin Blog Engine menü | Beta |
| Admin AI Partner | Yakında (menü + sayfa) |
| Admin POD Orders | Yakında |
| Dealer AI Partner | Beta banner |

### Blog Engine

- Admin menüde **Beta** badge
- Tüm admin fetch çağrıları → `fetchPageFactoryJson` (HTML/JSON güvenliği)
- GEO illeri → `/api/admin/page-factory/geo?entity=provinces`

### LinkSlash WhatsApp

- Kod değişikliği **yok**
- Teşhis: `docs/LINKSLASH_WHATSAPP_FIX_NOTES.md`

### Küçük build fix (yan etki)

- `dealer/dropship/products` — `image` → `imagesJson` (schema uyumu)

---

## 3. Ne Park Edildi

| Öğe | Durum |
|-----|--------|
| `BlueprintUniverseTab` | Legacy / park — gizlenmedi, işaretlendi |
| `import/*` API routes | Legacy wrapper — silinmedi |
| `TOP_20_CITIES` | Deprecated — silinmedi |
| `checkout-demo` | Dokunulmadı |
| AI Partner admin | Yakında — menüde görünür ama stub |
| POD Orders admin | Yakında |

---

## 4. Legacy Route Envanteri

- `/api/product-universe/import/*` → excel canonical’a yönlendirme yorumları
- `/api/page-factory/projects/[id]/universe/*` → BlueprintUniverseTab (legacy UI)
- `/api/product-universe/import` → monolithic legacy POST

---

## 5. Commit Edilmesi Gereken Dosyalar (öneri)

```
src/lib/geo/turkiye-geo-source.ts
src/app/api/product-universe/excel/templates/route.ts
src/app/api/product-universe/excel/template/route.ts
src/app/api/product-universe/import/** (yorumlar)
src/components/page-factory/PageFactoryShell.tsx
src/components/product-universe/ProductUniverseImportWizard.tsx
src/components/blog-engine/BlogEngineShell.tsx
src/lib/blog-engine/blog-service.ts
src/lib/blog-engine/blog-types.ts
src/lib/page-factory/universe/universe-types.ts
src/app/admin/layout.tsx
src/app/admin/ai-partner/page.tsx
src/app/admin/pod/orders/page.tsx
src/app/dealer/ai-partner/page.tsx
src/components/partners/PartnerAdminShell.tsx
src/app/api/dealer/dropship/products/route.ts
docs/LINKSLASH_WHATSAPP_FIX_NOTES.md
docs/ENA_CLEANUP_FIX_PHASE_1.md
```

---

## 6. Faz 2’ye Kalan

- LinkSlash WhatsApp patch (redirect, ZIP, APK)
- Nexa/Thyronix canonical API prefix birleşimi
- SAFE_DELETE: `TOP_20_CITIES`, dead exports
- Universe V1 stack kaldırma (migration sonrası)
- Blog GEO tam async client cache
- `site-settings` / `notFound*` schema drift (tsc — ayrı fix)
- Streaming/DB-side feed merge (300k+)

---

## 7. Build Doğrulama

| Komut | Sonuç |
|-------|--------|
| `npx tsc --noEmit` | **Kısmi başarısız** — `src/lib/site-settings/service.ts` içinde `notFound*` alanları Prisma `SiteSettings` modelinde yok (bu faz dışı drift; önceki oturumdan kalan değişiklikler) |
| Faz 1 dosyaları | Lint/type hatası yok |
| `npx next build` | Önceki oturumda geçmişti; bu çalıştırmada `site-settings` typecheck build’i bloke edebilir |

**Öneri:** Faz 2 öncesi `site-settings` schema ↔ service hizalansın veya `not-found.ts` alanları migration ile eklensin.

---

## 8. Do Not Touch (korundu)

Thyronix core, payments, orders, accounting, LinkSlash mobile native, prisma model silme — **dokunulmadı**.

---

*ENA_CLEANUP_FIX_PHASE_1 — güvenli park ve sadeleştirme tamamlandı.*
