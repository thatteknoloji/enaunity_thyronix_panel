# LinkSlash — Roadmap Lock V1

> Bu doküman LinkSlash ürün yol haritasını kilitleyerek dağıtım sprintinin kapsamını tanımlar.  
> **Ürün adı:** LinkSlash · **Kod adı (legacy):** LinkStash

---

## 1. Ürün adı kararı

| Terim | Kullanım |
|-------|----------|
| **LinkSlash** | Resmi ürün adı — UI, public sayfalar, admin, docs, store metinleri |
| **LinkStash** | Eski/kod adı — yalnızca `.analysis/` veya geçmiş referanslarda; **kullanıcıya görünmez** |

**Kural:** UI, public, admin, docs ve store metinlerinde **LinkStash kullanılmayacak**.

---

## 2. Tamamlanan fazlar

- [x] ENAUNITY modül entegrasyonu (`/gateway/linkslash`, `/dealer/linkslash`, lisans middleware)
- [x] Chrome Extension MVP (`public/linkslash/extension/`)
- [x] Cloud Sync (`/api/linkslash/sync/*`)
- [x] Android Share Capture altyapısı (`mobile/linkslash/`, `public/linkslash/mobile/`)
- [x] AI Analyze (`/api/linkslash/ai/analyze`)
- [x] Landing / ürün sayfası (`/linkslash`)
- [x] Release checklist (`/admin/linkslash/release`)

---

## 3. Bu sprint (dağıtım kilidi)

- [x] Product Page — `/linkslash` (Thyronix/HIVE seviyesinde tanıtım)
- [x] Download Center — `/linkslash/downloads`
- [x] Chrome Extension paket script — `npm run package:linkslash-extension`
- [x] Android APK doğrulama — `npm run verify:linkslash-android`
- [x] Install guides — `docs/linkslash/INSTALLATION.md`
- [x] Download links — `public/downloads/linkslash/`
- [x] Status API — `GET /api/linkslash/downloads/status`

---

## 4. Sonraki fazlar

| Faz | Açıklama |
|-----|----------|
| Shareable Vault | Link koleksiyonlarını paylaşılabilir hale getirme |
| Team Workspace | Ekip bazlı kütüphane ve izinler |
| AI Research Vault | Araştırma odaklı AI arşiv |
| Cloud integrations | Google Drive, Notion, Google Docs, WordPress, HIVE |
| iOS Share Extension | iOS paylaşım menüsü entegrasyonu |
| Chrome Web Store | Mağaza yayını ve otomatik güncelleme |
| Google Play Store | İmzalı AAB ve Play Console yayını |

---

## 5. Kapsam dışı (bu sprint)

- Team Workspace
- Public Vault
- iOS Share Extension
- Play Store / Chrome Web Store mağaza yayını

---

## Referanslar

- Kurulum: [INSTALLATION.md](./INSTALLATION.md)
- Extension release: `public/linkslash/extension/RELEASE.md`
- Android release: `mobile/linkslash/RELEASE.md`
- İndirme merkezi: `/linkslash/downloads`
