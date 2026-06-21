"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Analytics = {
  cards: {
    licensedUsers: number;
    logins24h: number;
    importsTotal: number;
    importsToday: number;
    imports24h: number;
    activeDevices: number;
  };
  charts: { daily: { day: string; count: number }[]; weekly: { week: string; count: number }[]; monthly: { month: string; count: number }[] };
  recentImports: Array<{ id: string; userId: string; url: string; sourcePlatform: string; createdAt: string }>;
};

export default function AdminLinkSlashAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/linkslash/analytics");
    const d = await r.json();
    if (d.success) setData(d.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = data?.cards;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={toAdminUrl("/admin/linkslash")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={22} /> LinkSlash Analytics</h1>
        </div>
      </div>

      {cards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {[
            { label: "Lisanslı kullanıcı", value: cards.licensedUsers },
            { label: "Son 24s giriş (cihaz)", value: cards.logins24h },
            { label: "Toplam kayıtlı link", value: cards.importsTotal },
            { label: "Bugün kayıt", value: cards.importsToday },
            { label: "24s import", value: cards.imports24h },
            { label: "Aktif cihaz", value: cards.activeDevices },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {data?.charts.daily.length ? (
        <div className="mb-6 rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Günlük import (7 gün)</h2>
          <div className="flex items-end gap-1 h-24">
            {data.charts.daily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-cyan-500/80 rounded-t" style={{ height: `${Math.max(8, d.count * 12)}px` }} title={String(d.count)} />
                <span className="text-[9px] text-gray-400">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold">Son import logları</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr><th className="px-4 py-2 text-left">Platform</th><th className="px-4 py-2 text-left">URL</th><th className="px-4 py-2 text-left">Kullanıcı</th><th className="px-4 py-2 text-right">Tarih</th></tr>
          </thead>
          <tbody className="divide-y">
            {(data?.recentImports || []).map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2">{r.sourcePlatform}</td>
                <td className="px-4 py-2 max-w-xs truncate text-xs">{r.url}</td>
                <td className="px-4 py-2 text-xs font-mono">{r.userId.slice(0, 8)}…</td>
                <td className="px-4 py-2 text-right text-xs text-gray-400">{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
