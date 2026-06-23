"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shirt,
  Image,
  FolderKanban,
  Sparkles,
  Package,
  Store,
  Plus,
  Loader2,
} from "lucide-react";

type Stats = {
  designs: number;
  projects: number;
  mockups: number;
  storeReady: number;
};

const NAV = [
  { href: "/dealer/pod/designs", icon: Image, title: "Tasarımlarım", desc: "PNG/SVG yükle ve yönet" },
  { href: "/dealer/pod/designs?new=1", icon: Plus, title: "Yeni Proje", desc: "Tasarım stüdyosu" },
  { href: "/dealer/pod/projects", icon: FolderKanban, title: "Projelerim", desc: "Yerleştirme ve mockup" },
  { href: "/dealer/pod/store", icon: Store, title: "Mağaza Ürünleri", desc: "Store ready ürünler" },
];

export default function DealerPodPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/pod/designs?limit=1").then((r) => r.json()),
      fetch("/api/pod/projects?limit=1").then((r) => r.json()),
      fetch("/api/pod/projects?status=STORE_READY&limit=1").then((r) => r.json()),
    ]).then(([designs, projects, store]) => {
      const mockups = projects.success ? projects.data.items?.filter((p: { mockupUrl?: string }) => p.mockupUrl).length : 0;
      setStats({
        designs: designs.success ? designs.data.total : 0,
        projects: projects.success ? projects.data.total : 0,
        mockups: projects.success ? projects.data.total : 0,
        storeReady: store.success ? store.data.total : 0,
      });
    });
  }, []);

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
            Tasarım yükle, ürün seç, konumlandır, mockup üret ve mağazaya hazırla.
          </p>
        </div>
      </div>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Tasarım", value: stats.designs, icon: Image },
            { label: "Proje", value: stats.projects, icon: FolderKanban },
            { label: "Mockup", value: stats.mockups, icon: Sparkles },
            { label: "Store Ready", value: stats.storeReady, icon: Package },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-ena-border bg-ena-card/40 p-4">
              <s.icon size={16} className="text-emerald-400/80 mb-2" />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-ena-light/60">{s.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-emerald-400" size={20} /></div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {NAV.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-ena-border bg-ena-card/40 p-5 hover:border-emerald-500/30 transition-colors"
          >
            <card.icon size={20} className="text-emerald-400 mb-3" />
            <h2 className="text-sm font-semibold text-white">{card.title}</h2>
            <p className="text-xs text-ena-light/60 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
