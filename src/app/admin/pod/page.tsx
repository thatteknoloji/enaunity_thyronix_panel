"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Shirt, Users, Clock, AlertTriangle, Key, Layers } from "lucide-react";
import { AdminModuleAccessPanel } from "@/components/admin/AdminModuleAccessPanel";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Stats = {
  activeLicensedDealers: number;
  trialCount: number;
  expiredCount: number;
  starterCount: number;
  proCount: number;
  eliteCount: number;
  editorPhaseActive: boolean;
};

export default function AdminPodPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pod/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 p-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">Tasarımcı Modülü</p>
        <h1 className="text-2xl font-bold text-ena-text">POD Creator Yönetimi</h1>
        <p className="text-sm text-ena-text-muted mt-1">Lisans altyapısı — editör fazı henüz aktif değil</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-500" size={28} />
        </div>
      ) : stats ? (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            POD Editor Fazı henüz aktif değil. Bu ekranda yalnızca lisans ve plan yönetimi yapılır.
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Aktif POD lisanslı bayi", value: stats.activeLicensedDealers, icon: Users },
              { label: "Trial POD lisans", value: stats.trialCount, icon: Clock },
              { label: "Süresi dolan POD lisans", value: stats.expiredCount, icon: AlertTriangle },
              { label: "POD Starter", value: stats.starterCount, icon: Layers },
              { label: "POD Pro", value: stats.proCount, icon: Layers },
              { label: "POD Elite", value: stats.eliteCount, icon: Shirt },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-ena-border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <item.icon size={18} className="text-emerald-600" />
                  <span className="text-2xl font-bold text-ena-text">{item.value}</span>
                </div>
                <p className="text-xs text-ena-text-muted">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={toAdminUrl("/admin/module-licenses?moduleKey=POD_CREATOR")}
              className="inline-flex items-center gap-2 rounded-lg border border-ena-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Key size={16} /> Modül Lisansları
            </Link>
            <Link
              href={toAdminUrl("/admin/module-plans")}
              className="inline-flex items-center gap-2 rounded-lg border border-ena-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Layers size={16} /> POD Planları
            </Link>
          </div>
        </>
      ) : null}

      <AdminModuleAccessPanel moduleKey="POD_CREATOR" />
    </div>
  );
}
