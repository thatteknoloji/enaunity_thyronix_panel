import { Metadata } from "next";
import Link from "next/link";
import { Sparkles, TrendingUp, Search, Globe, FileText, Network, Building2, Lock } from "lucide-react";

export const metadata: Metadata = { title: "HIVE — Büyüme Motoru | THYRONIX" };

export default function HivePage() {
  return (
    <div className="min-h-screen bg-ena-dark">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-6">
            <Sparkles size={16} /> Premium Modül — Yakında
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-ena-text tracking-tight mb-4">
            HIVE
          </h1>
          <p className="text-xl md:text-2xl text-violet-400 font-semibold mb-6">
            Görünürlüğünüzü büyütün.
          </p>
          <p className="text-ena-light max-w-2xl mx-auto text-lg leading-relaxed">
            SEO, GEO, AI içerik, Entity Graph, Publisher Network ve Site Factory —
            tek platformda. HIVE, dijital varlığınızı otomatik olarak büyütür.
          </p>
          <div className="mt-8">
            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
              <Lock size={16} /> Bu modül henüz aktif değil. Yakında kullanıma açılacak.
            </span>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: Search, title: "AI SEO", desc: "Her ürün ve sayfa için otomatik SEO optimizasyonu. Meta, schema, içerik önerileri." },
            { icon: Globe, title: "GEO Engine", desc: "AI arama motorları için optimize edilmiş içerik. ChatGPT, Perplexity, Google AI Overviews." },
            { icon: FileText, title: "AI İçerik", desc: "Blog, ürün açıklaması, kategori metni — AI ile otomatik içerik üretimi." },
            { icon: Network, title: "Entity Graph", desc: "Markanızın dijital varlık haritası. Bağlantılı entity'ler ve otorite yönetimi." },
            { icon: Building2, title: "Site Factory", desc: "Çoklu micro-site ve landing page üretimi. Her kanal için optimize edilmiş sayfalar." },
            { icon: TrendingUp, title: "Publisher Network", desc: "İçerik dağıtım ağı. Yayıncı entegrasyonları ve backlink otomasyonu." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-ena-card border border-ena-border p-6 hover:border-violet-500/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <item.icon size={20} className="text-violet-400" />
              </div>
              <h3 className="text-base font-semibold text-ena-text mb-2">{item.title}</h3>
              <p className="text-sm text-ena-text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center rounded-3xl bg-gradient-to-br from-violet-500/5 to-ena-card border border-violet-500/10 p-12">
          <h2 className="text-2xl font-bold text-ena-text mb-3">HIVE ile büyümeye hazır mısınız?</h2>
          <p className="text-ena-light mb-8 max-w-lg mx-auto">HIVE modülü yakında kullanıma açılacak. İlk kullanıcılar arasında yer almak için bizi takip edin.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-ena-primary text-ena-text font-semibold hover:brightness-90 transition-all">
            ENA'ya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
