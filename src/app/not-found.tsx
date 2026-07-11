import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeInfo, Compass, House, PackageSearch, Search, Sparkles } from "lucide-react";
import SmartSearch from "@/components/ui/smart-search";
import { getSiteSettings } from "@/lib/site-settings/service";

const fallbackLinks = [
  { label: "Ana sayfa", href: "/", description: "Marka vitrinine dön" },
  { label: "Katalog", href: "/catalog", description: "Tüm ürünleri tara" },
  { label: "Bayi paneli", href: "/dealer", description: "Sipariş ve mağaza alanı" },
  { label: "Ürünler", href: "/products", description: "Lisanslı ürünleri görüntüle" },
  { label: "Destek", href: "/products/support", description: "Yardım ve iletişim" },
];

export default async function NotFound() {
  const settings = await getSiteSettings();
  const quickLinks = settings.resolvedNotFoundQuickLinks.length ? settings.resolvedNotFoundQuickLinks : fallbackLinks;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-ena-primary/15 blur-3xl" />
        <div className="absolute left-[-6rem] top-[18rem] h-72 w-72 rounded-full bg-white/6 blur-3xl" />
        <div className="absolute right-[-8rem] bottom-[-6rem] h-[26rem] w-[26rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(229,9,20,0.08),transparent_25%)]" />
      </div>

      <section className="relative mx-auto grid min-h-[calc(100dvh-8rem)] max-w-7xl gap-8 px-4 py-12 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-16">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65 backdrop-blur-xl">
            <Sparkles size={12} className="text-ena-primary" />
            Premium 404 recovery
          </div>

          <div className="space-y-5">
            <div className="flex items-end gap-4">
              <h1 className="text-7xl font-black tracking-[-0.08em] text-white md:text-[8.75rem]">404</h1>
              <div className="mb-3 hidden h-px flex-1 bg-gradient-to-r from-white/30 via-white/5 to-transparent md:block" />
            </div>
            <div className="max-w-2xl space-y-4">
              <p className="text-2xl font-semibold leading-tight tracking-[-0.03em] text-white md:text-4xl">
                {settings.resolvedNotFoundTitle}
              </p>
              <p className="max-w-xl text-base leading-8 text-white/70 md:text-lg">{settings.resolvedNotFoundSubtitle}</p>
              <p className="max-w-xl text-sm leading-7 text-white/55 md:text-base">{settings.resolvedNotFoundBody}</p>
            </div>
          </div>

          <div className="max-w-2xl rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              <Search size={14} />
              Hızlı arama
            </div>
            <SmartSearch
              variant="hero"
              autoFocus
              placeholder={settings.resolvedNotFoundSearchPlaceholder}
            />
            <p className="mt-3 text-sm leading-6 text-white/55">{settings.resolvedNotFoundHint}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-ena-primary px-4 py-3 text-sm font-semibold text-white transition-transform hover:brightness-110 active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              Ana sayfaya dön
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
            >
              Kataloğa git
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <aside className="space-y-5 lg:pl-6">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              <Compass size={14} />
              Kısa yollar
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickLinks.slice(0, 6).map((item) => (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className="group flex min-h-[116px] flex-col justify-between rounded-[24px] border border-white/10 bg-black/20 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ena-primary/15 text-ena-primary">
                      <House size={16} />
                    </span>
                    <span className="text-xs font-medium text-white/35 group-hover:text-white/55">Hızlı geçiş</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                <PackageSearch size={14} />
                Bu link eski olabilir
              </div>
              <p className="text-sm leading-6 text-white/70">
                Google’dan gelen, taşınmış veya silinmiş sayfaları burada yumuşak şekilde karşılıyoruz.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                <BadgeInfo size={14} />
                Admin notu
              </div>
              <p className="text-sm leading-6 text-white/70">
                {settings.resolvedNotFoundFooterNote}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
