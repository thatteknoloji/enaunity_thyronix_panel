"use client";

import Link from "next/link";
import { FolderKanban, Image, Layers, Package, Plus, Sparkles } from "lucide-react";
import type { PodUiRole } from "@/lib/pod-core/pod-ui-bridge";
import { podBasePath } from "@/lib/pod-core/pod-ui-bridge";

type Stats = {
  designs: number;
  projects: number;
  storeReady: number;
};

type Props = {
  role: PodUiRole;
  stats: Stats | null;
};

const DEALER_NAV = [
  { href: "/dealer/pod/designs", icon: Image, title: "Tasarımlarım", desc: "Kayıtlı POD Core projeleri" },
  { href: "/dealer/pod/designs?new=1", icon: Plus, title: "Yeni Tasarım", desc: "POD Core tasarım stüdyosu" },
  { href: "/dealer/pod/templates", icon: Layers, title: "Ürün Şablonları", desc: "Cam tablo, halı, perde…" },
  { href: "/dealer/pod/production", icon: Package, title: "Üretim Dosyası", desc: "Production pack oluştur" },
];

export function PodUnifiedDashboard({ role, stats }: Props) {
  const base = podBasePath(role);
  const nav = role === "dealer" ? DEALER_NAV : [];

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-emerald-500/10 p-3 border border-emerald-500/20">
          <Sparkles className="text-emerald-400" size={28} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1">
            POD Creator
          </p>
          <h1 className="text-2xl font-bold text-white">POD Creator</h1>
          <p className="text-sm text-ena-light mt-2 max-w-2xl">
            Ürün profili seç, tasarla, fiyatlandır ve production pack üret — admin ile aynı POD Core motoru.
          </p>
        </div>
      </div>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Tasarım", value: stats.designs, icon: Image },
            { label: "Proje", value: stats.projects, icon: FolderKanban },
            { label: "Store Ready", value: stats.storeReady, icon: Package },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-ena-border bg-ena-card/40 p-4">
              <s.icon size={16} className="text-emerald-400/80 mb-2" />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-ena-light/60">{s.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-ena-border bg-ena-card/30 p-4 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition"
          >
            <item.icon size={18} className="text-emerald-400 mb-2" />
            <p className="font-medium text-white group-hover:text-emerald-300">{item.title}</p>
            <p className="text-xs text-ena-light/60 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>

      <Link
        href={`${base}/designs?new=1`}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        <Plus size={16} /> Yeni tasarım oluştur
      </Link>
    </div>
  );
}
