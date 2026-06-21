import Link from "next/link";

const FEATURES = [
  "Tek tıkla kayıt",
  "Chrome Extension",
  "Android Share",
  "Cloud Sync",
  "AI Özet",
  "AI Etiketleme",
  "SEO Brief",
  "Koleksiyonlar",
  "Offline queue",
];

const USE_CASES = [
  { title: "İçerik üreticileri", desc: "İlham kaynaklarını kaybetmeden arşivleyin." },
  { title: "Ajanslar", desc: "Müşteri araştırmalarını tek kütüphanede toplayın." },
  { title: "SEO uzmanları", desc: "Rakip ve kaynak linklerinden brief üretin." },
  { title: "Öğrenciler", desc: "Ders ve makale linklerini kategorize edin." },
  { title: "E-ticaretçiler", desc: "Trend ve ürün linklerini takip edin." },
  { title: "Araştırmacılar", desc: "Kaynakları AI ile özetleyip etiketleyin." },
];

const CHECKOUT = "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter";

export default function LinkSlashLandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0d14] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-black tracking-tight">
            <span className="text-cyan-400">Link</span>Slash
          </span>
          <div className="flex gap-3 text-sm">
            <Link href="/gateway/linkslash" className="text-white/70 hover:text-white">Giriş</Link>
            <Link href={CHECKOUT} className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black hover:bg-cyan-400">
              Lisans Al
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="mb-3 text-sm uppercase tracking-widest text-cyan-400">ENAUNITY Modülü · V1.0</p>
        <h1 className="text-4xl font-black leading-tight md:text-5xl">
          Gördüğün her şeyi kaybetmeden kaydet.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
          LinkSlash; web, X, Instagram, YouTube, Reddit, WhatsApp, Telegram ve daha fazlasından linkleri tek tuşla kaydeder,
          yapay zekayla özetler ve cihazların arasında senkronize eder.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/gateway/linkslash" className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black hover:bg-cyan-400">
            LinkSlash&apos;ı Deneyin
          </Link>
          <Link href="/linkslash/extension/manifest.json" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold hover:bg-white/5">
            Chrome Extension
          </Link>
          <Link href="/linkslash/mobile/" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold hover:bg-white/5">
            Android Paylaşım
          </Link>
        </div>
      </section>

      <section className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">Özellikler</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">{f}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">Kullanım senaryoları</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <div key={u.title} className="rounded-xl border border-white/10 p-5">
                <h3 className="font-semibold text-cyan-300">{u.title}</h3>
                <p className="mt-2 text-sm text-white/65">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold mb-8">Nasıl çalışır?</h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 font-mono text-sm leading-loose text-cyan-100/90">
            Paylaş / Kaydet<br />
            ↓<br />
            LinkSlash<br />
            ↓<br />
            AI analiz<br />
            ↓<br />
            Cloud Sync<br />
            ↓<br />
            İçerik fikri / brief
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Fiyatlandırma</h2>
          <p className="text-white/65 mb-6">Starter plan ile hemen başlayın. Pro plan daha yüksek limitler sunar.</p>
          <Link href={CHECKOUT} className="inline-block rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-black hover:bg-cyan-400">
            Starter — Lisans Al
          </Link>
        </div>
      </section>

      <section className="border-t border-white/10 py-12 text-center">
        <Link href="/gateway/linkslash" className="text-cyan-400 hover:underline text-sm">
          Demo / Gateway → /gateway/linkslash
        </Link>
      </section>
    </div>
  );
}
