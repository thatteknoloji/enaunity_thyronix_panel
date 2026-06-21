import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { MarketplaceCard } from "@/lib/modules/marketplace";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
  TRIAL: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  EXPIRED: "bg-red-500/10 text-red-400 border-red-500/20",
  PURCHASABLE: "bg-gray-500/10 text-gray-300 border-gray-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ADMIN_ONLY: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  COMING_SOON: "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

const ACCENT: Record<string, string> = {
  cyan: "from-cyan-500/10 to-ena-card border-cyan-500/20",
  violet: "from-violet-500/10 to-ena-card border-violet-500/20",
  blue: "from-blue-500/10 to-ena-card border-blue-500/20",
  emerald: "from-emerald-500/10 to-ena-card border-emerald-500/20",
};

const KEY_COLOR: Record<string, string> = {
  LINKSLASH: "cyan",
  HIVE: "violet",
  THYRONIX: "blue",
  POD_CREATOR: "emerald",
};

export function ModuleMarketplaceCard({ module: m }: { module: MarketplaceCard }) {
  const accent = ACCENT[KEY_COLOR[m.moduleKey] || "blue"] || ACCENT.blue;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 flex flex-col ${accent}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{m.label}</h3>
          <p className="text-xs text-ena-light mt-1">{m.description}</p>
        </div>
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${STATUS_STYLES[m.displayStatus] || STATUS_STYLES.PURCHASABLE}`}>
          {m.statusLabel}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm mb-4 flex-1">
        <div>
          <dt className="text-ena-light/60 text-xs">Paket</dt>
          <dd className="text-white font-medium">{m.planName || m.planKey || "—"}</dd>
        </div>
        <div>
          <dt className="text-ena-light/60 text-xs">Bitiş</dt>
          <dd className="text-white font-medium text-xs">
            {m.endsAt ? new Date(m.endsAt).toLocaleDateString("tr-TR") : "—"}
          </dd>
        </div>
      </dl>

      <Link
        href={m.ctaHref}
        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
          m.canEnter
            ? "bg-white/10 hover:bg-white/15 text-white"
            : "bg-ena-primary/90 hover:bg-ena-primary text-white"
        }`}
      >
        {m.canEnter ? <ArrowRight size={14} /> : <ArrowUpRight size={14} />}
        {m.ctaLabel}
      </Link>
    </div>
  );
}
