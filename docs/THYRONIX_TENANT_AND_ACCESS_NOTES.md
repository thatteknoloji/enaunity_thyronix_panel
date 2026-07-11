# THYRONIX Tenant & API Access Notes

## Mevcut Durum

- **THYRONIX admin** (`/x-control-eu-7294/thyronix`) kaynak, besleme, kural, log ve hariç tutulan sekmeleri `/api/admin/thyronix-*` alias endpointleri üzerinden çalışır.
- **Legacy NEXA endpointleri** (`/api/admin/nexa-*`) korunur; aynı Prisma modellerini kullanır.
- **Veri modeli** `ThyronixSource`, `ThyronixProduct`, `ThyronixFeed`, `ThyronixRule`, `ThyronixExclusion` üzerinde `dealerId`, `tenantScope` (GLOBAL | DEALER), `ownerType` (ADMIN | DEALER) alanları eklendi.
- Mevcut kayıtlar varsayılan olarak **GLOBAL** + **ADMIN** kabul edilir; davranış değişmez.
- Helper: `src/lib/thyronix/tenant-access.ts`

## Risk

Bayi kullanıcıları THYRONIX UI (`/thyronix/*`) görebilir ancak birçok `/api/thyronix/*` route'u hâlâ `requireAdmin()` kullanır. Bu, bayi panelinden kaynak/ürün yönetiminde **403** veya boş veri riski oluşturur.

## Admin Kalması Gereken Endpointler

- `/api/admin/thyronix-*` (feeds, rules, logs, exclusions)
- `/api/admin/nexa-*` (legacy alias)
- `/api/admin/nexa-ai-providers/*`
- `/api/cron/nexa-sync`, `/api/cron/thyronix-sync`
- Global kural/besleme oluşturma ve silme işlemleri

## Bayi Kullanımına Açılması Gereken Endpointler (Sonraki Sprint)

- `GET /api/thyronix/sources` — sadece tenant filter ile kendi + GLOBAL kaynaklar
- `GET /api/thyronix/products` — dealer scope
- `GET /api/thyronix/dashboard` — dealer özeti
- `POST /api/thyronix/sources` — DEALER scope yeni kaynak (lisanslı bayi)
- `PUT /api/thyronix/products/update` — kendi ürünleri
- Besleme **okuma** (kendi tenant) — yazma admin veya ileri plan

## Multi-Tenant Geçiş Planı

1. **Faz 1 (bu sprint):** Schema + helper; mevcut API davranışı aynı.
2. **Faz 2:** Create/update path'lerinde `resolveThyronixOwner(user)` ile `dealerId` / `tenantScope` set et.
3. **Faz 3:** List/query endpointlerinde `getThyronixTenantFilter(user)` uygula.
4. **Faz 4:** Bayi THYRONIX API Access Sprint — yukarıdaki endpointlerde `requireDealer` + tenant guard.
5. **Faz 5:** Admin UI'da GLOBAL vs DEALER kayıt filtresi ve bayi atama.

## Sonraki Sprint TODO

**THYRONIX Dealer API Access Sprint**

- [ ] Bayi lisans kontrolü + tenant filter tüm `/api/thyronix/*` read path'lerinde
- [ ] Admin-only mutation'ları ayır
- [ ] Integration test: dealer A, dealer B izolasyonu
- [ ] UI: bayi sadece kendi kaynaklarını görür

## HIVE Admin

- HIVE gözetim: `/x-control-eu-7294/hive`
- API: `/api/admin/hive/overview|workspaces|licenses|gateway-links|health`
- Permission: `hive_view` (SUPER_ADMIN / ADMIN tam; MANAGER/SUPPORT kısıtlı rol tanımına göre)
