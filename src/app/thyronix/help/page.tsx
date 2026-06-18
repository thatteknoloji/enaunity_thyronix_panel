"use client";

import Link from "next/link";
import { HelpCircle, BookOpen, MessageCircle, ExternalLink } from "lucide-react";

const FAQ = [
  { q: "İlk feedimi nasıl oluştururum?", a: "Hızlı Başlangıç sihirbazını kullanın veya Kaynaklar → Feed Merkezi akışını izleyin." },
  { q: "XML kaynağı nasıl test edilir?", a: "Kaynaklar sayfasında XML sekmesinden URL girin ve Test Et butonuna tıklayın." },
  { q: "Otomatik sync nasıl açılır?", a: "Professional veya Enterprise pakette Otomasyon Merkezi'nden etkinleştirin." },
  { q: "Ekip üyesi nasıl eklenir?", a: "Ekip sayfasından OWNER veya MANAGER rolüyle yeni kullanıcı davet edin." },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text flex items-center gap-2">
          <HelpCircle size={24} className="text-nexa-primary" /> Yardım Merkezi
        </h1>
        <p className="text-sm text-nexa-text-secondary mt-1">THYRONIX kullanım kılavuzu ve sık sorulan sorular</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: BookOpen, title: "Hızlı Başlangıç", href: "/thyronix/getting-started", desc: "15 dakikada ilk feed" },
          { icon: MessageCircle, title: "Kontrol Listesi", href: "/thyronix/checklist", desc: "Kurulum adımlarını takip edin" },
          { icon: ExternalLink, title: "Sistem Sağlığı", href: "/thyronix/system-health", desc: "Kaynak ve feed durumu" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="rounded-xl border border-nexa-border bg-nexa-card p-5 hover:border-nexa-primary/30 transition-colors">
            <c.icon size={20} className="text-nexa-primary mb-3" />
            <p className="font-semibold text-nexa-text text-sm">{c.title}</p>
            <p className="text-xs text-nexa-text-secondary mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
        <h2 className="font-semibold text-nexa-text">Sık Sorulan Sorular</h2>
        {FAQ.map((f, i) => (
          <div key={i} className="border-b border-nexa-border pb-4 last:border-0 last:pb-0">
            <p className="text-sm font-medium text-nexa-text">{f.q}</p>
            <p className="text-sm text-nexa-text-secondary mt-1">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6">
        <p className="text-sm text-nexa-text-secondary">
          Destek için <a href="mailto:destek@thatteknoloji.com" className="text-nexa-primary hover:underline">destek@thatteknoloji.com</a> adresine yazın veya bayi yöneticinize ulaşın.
        </p>
      </div>
    </div>
  );
}
