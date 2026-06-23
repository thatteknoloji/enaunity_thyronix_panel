# LinkSlash WhatsApp Import — Fix Notes (Faz 1 rapor)

**Durum:** Bu fazda mobil/native koduna dokunulmadı. Sorun teşhisi ve patch planı.

---

## Belirti

Bayi/mobil kullanıcı WhatsApp export (ZIP/TXT) ile içe aktarmaya çalışınca ekran açılmıyor veya import akışı başlamıyor.

---

## İlgili dosyalar

| Katman | Dosya |
|--------|--------|
| Next.js mobil shell | `src/components/linkslash/LinkSlashMobileShell.tsx` |
| Client routing | `public/linkslash/mobile/js/mobile-app.js` |
| WhatsApp parser | `public/linkslash/mobile/js/whatsapp-import.js` |
| JSZip | `public/linkslash/mobile/js/jszip.min.js` |
| Dealer desktop (iframe) | `public/linkslash/index.html`, `public/linkslash/js/ui.js` |
| Stale static HTML | `public/linkslash/mobile/index.html` (WhatsApp UI yok) |
| API capture | `src/app/api/linkslash/mobile/capture/route.ts` |
| Android share | `mobile/linkslash/android/.../ShareReceiverPlugin.java` |
| Manifest MIME | `mobile/linkslash/android/.../AndroidManifest.xml` |
| Capacitor config | `mobile/linkslash/capacitor.config.ts` |
| Bridge | `public/linkslash/mobile/js/mobile-bridge.js` |

---

## Kontrol edilecek route'lar

```bash
# Mobil shell (auth bypass)
curl -sI https://enaunity.com.tr/linkslash/mobile

# Capture API (oturum gerekli)
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://enaunity.com.tr/api/linkslash/mobile/capture

# APK durumu
curl -s https://enaunity.com.tr/api/linkslash/downloads/status
cat public/downloads/linkslash/android-build.json
```

---

## Muhtemel kök nedenler (öncelik sırası)

1. **Post-login redirect** — `mobile-app.js` içinde `routeAfterSession()` giriş sonrası `/dealer/linkslash` (desktop iframe) yönlendiriyor; mobil WhatsApp ekranından çıkıyor.
2. **iframe vs top window** — `mobile-bridge.js` dealer shell içindeyken sadece iframe navigate ediyor; `#screenWhatsApp` görünmüyor.
3. **Desktop ZIP reddi** — `public/linkslash/js/ui.js` yalnızca `.txt`/`.html` kabul ediyor; `.zip` WhatsApp export reddediliyor.
4. **Stale Capacitor webDir** — `capacitor.config.ts` `webDir: public/linkslash/mobile` eski HTML; remote URL kullanılmıyorsa WhatsApp UI eksik.
5. **APK eksik** — `android-build.json` → `buildApk: false`, `publicApk: false`.

---

## Önerilen patch (Faz 2)

1. `routeAfterSession()` — mobil path'teyken `/linkslash/mobile` kalsın; dealer iframe'e yönlendirme.
2. `mobile-bridge.js` — WhatsApp import için `window.top.location` veya deep link.
3. Desktop `ui.js` — `.zip` + JSZip desteği veya “mobil uygulamayı kullanın” mesajı.
4. `public/linkslash/mobile/index.html` — Next.js shell ile senkron veya webDir kaldırıp yalnızca remote URL.
5. APK build + `storage/downloads/linkslash/` publish.

---

## Console hata kaynakları

- `jszip.min.js` 404 → ZIP parse çalışmaz
- `whatsapp-import.js` yüklenmeden `#whatsappImportBtn` click → no-op
- `POST /api/linkslash/mobile/capture` 401/403 → oturum/lisans
- Capacitor `ShareReceiver` plugin register edilmemiş → native share intent gelmez
- MIME `application/zip` manifest'te yoksa Android share hedef listesinde görünmez

---

*ENA_CLEANUP_FIX_PHASE_1 — rapor only, kod değişikliği yok.*
