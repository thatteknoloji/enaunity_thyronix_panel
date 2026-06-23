"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Store } from "lucide-react";

type Project = {
  id: string;
  status: string;
  mockupUrl: string;
  mockupThumbnailUrl: string;
  previewUrl: string;
  design: { title: string };
  template: { name: string; category: string };
};

export default function DealerPodStorePage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/pod/projects?status=STORE_READY&limit=50");
    const d = await r.json();
    if (d.success) setItems(d.data.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Store size={20} className="text-emerald-400" /> Mağaza Ürünleri
        </h1>
        <p className="text-sm text-ena-light/60 mt-1">Store ready — siparişe hazır mockup ürünler</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400" size={24} /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-8 text-center">
          <p className="text-sm text-ena-light/50">Henüz mağazaya eklenmiş ürün yok.</p>
          <Link href="/dealer/pod/designs?new=1" className="text-emerald-400 text-sm mt-2 inline-block hover:underline">
            Yeni proje oluştur →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-xl border border-emerald-500/20 bg-ena-card/40 overflow-hidden">
              <div className="aspect-square bg-black/30">
                {(p.mockupThumbnailUrl || p.previewUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.mockupThumbnailUrl || p.previewUrl} alt={p.design.title} className="w-full h-full object-contain" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-white">{p.design.title}</p>
                <p className="text-[10px] text-ena-light/50">{p.template.name} · {p.template.category}</p>
                <span className="text-[10px] text-emerald-400 mt-1 inline-block">STORE_READY</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
