"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Shirt, Users, Clock, AlertTriangle, Key, Layers, Image, FolderKanban, Sparkles, Store } from "lucide-react";
import { AdminModuleAccessPanel } from "@/components/admin/AdminModuleAccessPanel";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Stats = {
  activeLicensedDealers: number;
  trialCount: number;
  expiredCount: number;
  starterCount: number;
  proCount: number;
  eliteCount: number;
  totalDesigns: number;
  totalProjects: number;
  totalMockups: number;
  storeReady: number;
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
        <p className="text-sm text-ena-text-muted mt-1">Tasarım stüdyosu V1 — lisans ve içerik istatistikleri</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-500" size={28} />
        </div>
      ) : stats ? (
        <>
          {stats.editorPhaseActive && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              POD Designer V1 aktif — tasarım yükleme, yerleştirme ve mockup üretimi çalışıyor.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Toplam Tasarım", value: stats.totalDesigns, icon: Image },
              { label: "Toplam Proje", value: stats.totalProjects, icon: FolderKanban },
              { label: "Toplam Mockup", value: stats.totalMockups, icon: Sparkles },
              { label: "Store Ready", value: stats.storeReady, icon: Store },
              { label: "Aktif POD lisanslı bayi", value: stats.activeLicensedDealers, icon: Users },
              { label: "Trial POD lisans", value: stats.trialCount, icon: Clock },
              { label: "Süresi dolan POD lisans", value: stats.expiredCount, icon: AlertTriangle },
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
            <Link href={toAdminUrl("/admin/pod/designs")} className="inline-flex items-center gap-2 rounded-lg border border-ena-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
              <Image size={16} /> Tasarımlar
            </Link>
            <Link href={toAdminUrl("/admin/pod/templates")} className="inline-flex items-center gap-2 rounded-lg border border-ena-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
              <Layers size={16} /> Şablonlar
            </Link>
            <Link href={toAdminUrl("/admin/module-licenses?moduleKey=POD_CREATOR")} className="inline-flex items-center gap-2 rounded-lg border border-ena-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
              <Key size={16} /> Modül Lisansları
            </Link>
          </div>
        </>
      ) : null}

      <AdminModuleAccessPanel moduleKey="POD_CREATOR" />
    </div>
  );
}
