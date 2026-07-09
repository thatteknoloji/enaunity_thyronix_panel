# Canlı deploy (kısa)

## Neden 6 saat sürdü?

Sunucuda `npm run build` **typecheck açık** çalıştırıldı. Repoda birikmiş TS hataları
tek tek çıktı → her seferinde 3–4 dk build. Asıl feature 15 dk’ydı.

## Doğru yol (bundan sonra)

```bash
# 1) Lokal kontrol (~30 sn)
npm run preflight

# 2) Push
git push origin main

# 3) Canlıya al (laptop'tan)
ENAUNITY_SSH_PASS='…' npm run deploy:live

# veya sunucuda:
cd /opt/enaunity && git pull && bash scripts/deploy-production-quick.sh
```

Production build **bilerek** `NEXT_SKIP_TYPECHECK=1` kullanır (`next.config.ts`).
Compile (webpack) geçerse site ayağa kalkar. Typecheck borcu CI’da raporlanır, deploy’u kilitlemez.

## Komutlar

| Komut | Ne yapar |
|-------|----------|
| `npm run preflight` | Dosya + typecheck (0 hata zorunlu) |
| `PREFLIGHT_ALLOW_TS=1 npm run preflight` | Typecheck hatasında yine de devam |
| `PREFLIGHT_FULL_BUILD=1 npm run preflight` | + production smoke build |
| `npm run typecheck` | Sadece `src/` tsc |
| `npm run deploy:live` | Preflight + SSH quick deploy |
| `npm run deploy:server` | Sadece sunucu script’i (sunucuda çalıştır) |

## Kural

- Canlıya alırken **asla** çıplak `npm run build` kullanma (typecheck tuzağı).
- Her zaman `deploy-production-quick.sh` veya `deploy:live`.

## Sipariş sınıflandırma (B2B vs Operasyon)

Yanlış yere düşen siparişleri düzeltmek için (sunucuda):

```bash
cd /opt/enaunity && bash scripts/fix-yesterday-order-classification.sh
```

Kod kuralı: `sourceType === "B2B"` → asla operasyon paneline düşmez
(`src/lib/fulfillment/operasyon-service.ts`).
