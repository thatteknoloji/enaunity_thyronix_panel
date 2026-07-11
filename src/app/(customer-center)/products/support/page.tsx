"use client";

import Link from "next/link";
import { LifeBuoy, Mail, MessageSquare, FileText } from "lucide-react";

const TOPICS = [
  { title: "Lisans & Paket", desc: "Lisans yenileme, paket yükseltme ve deneme süresi", href: "/products/licenses", icon: FileText },
  { title: "Ödeme & Fatura", desc: "Ödeme sorunları, havale bildirimi ve faturalar", href: "/products/payments", icon: MessageSquare },
  { title: "Ürün Erişimi", desc: "THYRONIX veya HIVE giriş sorunları", href: "/products", icon: LifeBuoy },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-ena-card p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Destek Merkezi</h2>
        <p className="text-sm text-ena-light mb-4">
          Ürün lisansları, ödemeler ve erişim konularında yardım alın.
        </p>
        <a
          href="mailto:support@enaunity.com?subject=Müşteri%20Merkezi%20Destek"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ena-primary text-white text-sm font-medium hover:brightness-90"
        >
          <Mail size={16} /> support@enaunity.com
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TOPICS.map((topic) => (
          <Link
            key={topic.href}
            href={topic.href}
            className="rounded-xl border border-white/10 bg-ena-card/50 p-5 hover:border-ena-primary/30 transition-colors"
          >
            <topic.icon className="text-ena-primary mb-3" size={24} />
            <h3 className="font-semibold text-white">{topic.title}</h3>
            <p className="text-xs text-ena-light mt-1">{topic.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
