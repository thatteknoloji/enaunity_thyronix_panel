# THYRONIX Access Matrix

Bu doküman THYRONIX API ve UI erişim sınıflandırmasını tanımlar.

## Roller

| Rol | Açıklama |
|-----|----------|
| **Admin** | `role === "admin"` — tüm tenantlar (GLOBAL + DEALER) |
| **Dealer** | THYRONIX modül lisansı (`ACTIVE` / `TRIAL`) + `dealerId` |

## Tenant kuralları

- **Admin:** GLOBAL ve DEALER kaynaklarını görür
- **Dealer:** GLOBAL kaynaklar + yalnızca kendi `dealerId` kaynakları

Helper: `src/lib/thyronix/tenant-access.ts`, `src/lib/thyronix/access.ts`

---

## A) Dealer Kullanabilir

THYRONIX lisansı olan bayiler erişebilir. Tüm sorgularda `dealerId` / tenant filtresi uygulanır.

### Kaynaklar
| Endpoint | Metod |
|----------|-------|
| `/api/thyronix/sources` | GET, POST |
| `/api/thyronix/sources/[id]` | PUT, DELETE |
| `/api/thyronix/sources/[id]/sync` | POST |
| `/api/thyronix/sources/test` | POST |
| `/api/thyronix/sources/csv/test` | POST |
| `/api/thyronix/sources/excel/test` | POST |
| `/api/thyronix/sources/excel/import` | POST |

### Ürünler
| Endpoint | Metod |
|----------|-------|
| `/api/thyronix/products` | GET |
| `/api/thyronix/products/update` | POST |
| `/api/thyronix/products/bulk` | POST |

### Mapping
| Endpoint | Metod |
|----------|-------|
| `/api/thyronix/brand-mapping` | GET, POST, PUT, DELETE |
| `/api/thyronix/category-mapping` | GET, POST, PUT, DELETE |

### Feed & Export
| Endpoint | Metod |
|----------|-------|
| `/api/thyronix/generate` | POST |
| `/api/thyronix/export` | GET |
| `/api/thyronix/feed/[id]/status` | GET |

### Sağlık & Raporlar
| Endpoint | Metod |
|----------|-------|
| `/api/thyronix/health/summary` | GET |
| `/api/thyronix/reports` | GET |
| `/api/thyronix/dashboard` | GET |

### Foto
| Endpoint | Metod |
|----------|-------|
| `/api/thyronix/photos/upload` | POST |

### Public (auth yok)
| Endpoint | Metod |
|----------|-------|
| `/api/thyronix/feed/[id]/output.xml` | GET |
| `/api/thyronix/feed/[id]/output.csv` | GET |
| `/api/thyronix/feed/[id]/output.xlsx` | GET |
| `/api/thyronix/feed/[id]/output.json` | GET |

---

## B) Admin Kullanabilir

Yalnızca platform admin (`requireThyronixAdmin`).

| Alan | Endpoint |
|------|----------|
| AI Provider / Jobs | `/api/thyronix/ai/*` |
| Global Snapshots | `/api/thyronix/snapshots` |
| Rollback | `/api/thyronix/rollback` |
| Dashboard History | `/api/thyronix/dashboard/history` |
| Demo Seed | `/api/thyronix/demo-seed` |

### UI (Admin-only sekmeler)
- `/thyronix/admin` — Ayarlar, Kullanıcılar, Lisanslar, Loglar, Sistem Durumu
- `/thyronix/ai` — AI Provider Management

---

## C) Her İkisi

Admin tüm tenant; dealer kendi tenant + GLOBAL.

| Endpoint | Not |
|----------|-----|
| `/api/thyronix/sources` | Dealer yeni kaynak oluştururken `DEALER` scope atanır |
| `/api/thyronix/products` | Tenant filtresi |
| `/api/thyronix/generate` | Feed erişim kontrolü + tenant kaynakları |
| `/api/thyronix/dashboard` | Tenant özet istatistikleri |
| `/api/thyronix/reports` | Tenant raporları |

---

## Middleware

`/api/thyronix/*` (feed output hariç):
- Oturum gerekli (`token` cookie)
- Admin **veya** dealer rolü
- Admin-only prefix listesi dealer için 403

---

## Lisans kontrolü

`requireThyronixLicense()` → `hasModuleAccess(dealerId, "THYRONIX")`

Admin bu kontrolden muaf.

---

## Test

```bash
npm run test:thyronix-dealer-api
```
