"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Layers } from "lucide-react";

type Template = {
  id: string;
  name: string;
  category: string;
  printWidth: number;
  printHeight: number;
};

export default function DealerPodTemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pod/templates")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "Şablonlar alınamadı");
        setItems(d.data || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Hata"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">POD Şablonları</h1>
        <p className="text-sm text-ena-light mt-1">Tasarım stüdyosunda kullanabileceğiniz ürün şablonları.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-400" size={28} />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Layers size={18} className="text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{t.name}</p>
                  <p className="text-xs text-ena-light mt-1">{t.category}</p>
                  <p className="text-[11px] text-ena-light/70 mt-1">
                    {t.printWidth}×{t.printHeight} px
                  </p>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-ena-light col-span-2">Henüz aktif şablon yok.</p>
          )}
        </div>
      )}

      <Link href="/dealer/pod/designs?new=1" className="inline-flex text-sm text-emerald-400 hover:underline">
        Yeni tasarım başlat →
      </Link>
    </div>
  );
}
