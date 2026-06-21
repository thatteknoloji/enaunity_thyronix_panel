import { Shirt, Image, Package, Sparkles, TrendingUp, Wallet, BookOpen, Clock } from "lucide-react";

const COMING_SOON_CARDS = [
  { icon: Image, title: "Tasarımlarım", subtitle: "Yakında" },
  { icon: Package, title: "Ürün Oluştur", subtitle: "Ürün oluşturma yakında" },
  { icon: Sparkles, title: "Mockup Üret", subtitle: "Mockup üretimi yakında" },
  { icon: TrendingUp, title: "Satışlarım", subtitle: "Satış takibi yakında" },
  { icon: Wallet, title: "Kazançlarım", subtitle: "Kazanç takibi yakında" },
  { icon: BookOpen, title: "POD Başlangıç Rehberi", subtitle: "Yakında" },
];

export default function DealerPodPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-emerald-500/10 p-3 border border-emerald-500/20">
          <Shirt className="text-emerald-400" size={28} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1">Tasarımcı Modülü</p>
          <h1 className="text-2xl font-bold text-white">POD Creator</h1>
          <p className="text-sm text-ena-light mt-2 max-w-2xl">
            Tasarım yükleme, ürün oluşturma, mockup üretme, satış ve kazanç takibi özellikleri yakında burada aktif olacak.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3 text-sm text-amber-200/90">
        <Clock size={16} className="shrink-0 mt-0.5" />
        <p>
          POD Editor Fazı henüz aktif değil. Lisansınız tanımlı; editör ve mockup altyapısı açıldığında bu alandan devam edebilirsiniz.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COMING_SOON_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-ena-border bg-ena-card/40 p-5 opacity-80 cursor-not-allowed"
            aria-disabled
          >
            <card.icon size={20} className="text-emerald-400/70 mb-3" />
            <h2 className="text-sm font-semibold text-white">{card.title}</h2>
            <p className="text-xs text-ena-light/60 mt-1">{card.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
