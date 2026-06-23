"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PartnerAdminShell } from "@/components/partners/PartnerAdminShell";

type Template = {
  id: string;
  name: string;
  category: string;
  baseImageUrl: string;
  printWidth: number;
  printHeight: number;
  status: string;
};

export default function AdminPodTemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pod/templates")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PartnerAdminShell title="POD Ürün Şablonları" description="Cam tablo, poster, kupa, tişört">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={24} /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <div key={t.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="aspect-[4/3] rounded-lg bg-gray-100 mb-3 overflow-hidden">
                {t.baseImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.baseImageUrl} alt={t.name} className="w-full h-full object-cover" />
                )}
              </div>
              <p className="font-medium text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-500">{t.category} · {t.printWidth}×{t.printHeight} cm</p>
              <span className="text-[10px] text-emerald-600">{t.status}</span>
            </div>
          ))}
        </div>
      )}
    </PartnerAdminShell>
  );
}
