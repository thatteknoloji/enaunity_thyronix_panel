"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { PodAdminShell } from "@/components/pod/PodAdminShell";
import { toAdminUrl } from "@/lib/auth/admin-access";

type ProfileCard = {
  id: string;
  name: string;
  category: string;
  catalogId?: string;
  pricingRuleCode: string;
  mockupType: string;
  formulaHint: string;
  status: string;
  fixedSizeCount: number;
  studioHref: string;
};

export default function AdminPodTemplatesPage() {
  const [items, setItems] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pod/profiles", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PodAdminShell
      title="POD Ürün Şablonları"
      description="Ürün profilleri, fiyat katalogları ve stüdyo bağlantıları"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category}</p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {p.status === "active" ? "Aktif" : "Beta"}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <dt className="text-gray-400">Katalog</dt>
                  <dd className="font-medium">{p.catalogId || "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Fiyat modu</dt>
                  <dd className="font-medium">{p.formulaHint}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Hazır ebat</dt>
                  <dd className="font-medium">{p.fixedSizeCount}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Mockup</dt>
                  <dd className="font-medium truncate">{p.mockupType}</dd>
                </div>
              </dl>
              <Link
                href={toAdminUrl(p.studioHref)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Stüdyoda Aç <ExternalLink size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </PodAdminShell>
  );
}
