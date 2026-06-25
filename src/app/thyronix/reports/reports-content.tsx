"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, Package, AlertTriangle, Link2, Radio, Brain, RefreshCw, Copy } from "lucide-react";

const TABS = [
  { id: "overview", label: "Genel", icon: BarChart3 },
  { id: "duplicates", label: "Duplicate Analizi", icon: Copy },
  { id: "sources", label: "Kaynak Performansı", icon: Link2 },
  { id: "feeds", label: "Feed Performansı", icon: Radio },
  { id: "ai", label: "AI Kullanımı", icon: Brain },
  { id: "sync", label: "Sync Başarı Oranı", icon: RefreshCw },
];

export default function ThyronixReportsPage() {
  const [data, setData] = useState<any>(null);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetch("/api/thyronix/reports").then((r) => r.json()).then((d) => { if (d.success) setData(d.data); setLoading(false); });
    fetch("/api/thyronix/products/duplicates?field=all&limit=20").then((r) => r.json()).then((d) => { if (d.success) setDuplicateData(d.data); });
  }, []);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 rounded-xl bg-nexa-card"/><div className="h-40 rounded-xl bg-nexa-card"/></div>;
  if (!data) return <p className="text-nexa-text-secondary">Veri yüklenemedi</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Raporlar</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Kaynak, feed ve AI performans metrikleri</p>
      </div>

      <div className="flex gap-1 border-b border-nexa-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-[1px] ${tab === t.id ? "border-nexa-primary text-nexa-primary" : "border-transparent text-nexa-text-secondary"}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Package, label: "Toplam Ürün", val: data.products.total.toLocaleString() },
              { icon: Link2, label: "Aktif Kaynak", val: `${data.sources.active}/${data.sources.total}` },
              { icon: Radio, label: "Aktif Feed", val: `${data.feeds.active}/${data.feeds.total}` },
              { icon: AlertTriangle, label: "Hatalı Ürün", val: data.products.errors },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-nexa-border bg-nexa-card p-4">
                <c.icon size={16} className="text-nexa-primary mb-2" />
                <p className="text-xl font-bold text-nexa-text">{c.val}</p>
                <p className="text-[10px] text-nexa-text-secondary">{c.label}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
              <p className="text-2xl font-bold text-nexa-warning">{data.duplicates?.totalGroups?.toLocaleString?.("tr-TR") ?? 0}</p>
              <p className="mt-1 text-[10px] text-nexa-text-secondary">Toplam duplicate grup</p>
            </div>
            <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
              <p className="text-2xl font-bold text-nexa-primary">{data.duplicates?.totalAffectedProducts?.toLocaleString?.("tr-TR") ?? 0}</p>
              <p className="mt-1 text-[10px] text-nexa-text-secondary">Etkilenen kayıt</p>
            </div>
            <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
              <p className="text-sm font-semibold text-nexa-text">Alan Dağılımı</p>
              <div className="mt-2 space-y-1.5 text-xs text-nexa-text-secondary">
                {(data.duplicates?.byField || []).map((item: any) => (
                  <div key={item.field} className="flex items-center justify-between">
                    <span>{item.field}</span>
                    <span>{item.groupCount?.toLocaleString?.("tr-TR") ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
            <div className="p-5 border-b border-nexa-border"><h2 className="font-semibold text-nexa-text text-sm">Kategori Dağılımı</h2></div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-nexa-border">
                {(data.categories || []).map((c: any, i: number) => (
                  <tr key={i}><td className="px-4 py-2 text-nexa-text">{c.name}</td><td className="px-4 py-2 text-right font-medium">{c.count.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "sources" && (
        <div className="rounded-xl border border-nexa-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
              <th className="px-4 py-3 text-left text-nexa-text-secondary">Kaynak</th>
              <th className="px-4 py-3 text-right text-nexa-text-secondary">Ürün</th>
              <th className="px-4 py-3 text-right text-nexa-text-secondary">Durum</th>
              <th className="px-4 py-3 text-right text-nexa-text-secondary">Son Sync</th>
            </tr></thead>
            <tbody className="divide-y divide-nexa-border">
              {(data.sourcePerformance || data.sources.list || []).map((s: any, i: number) => (
                <tr key={i} className="hover:bg-nexa-hover">
                  <td className="px-4 py-3 text-nexa-text">{s.name}</td>
                  <td className="px-4 py-3 text-right">{s.productCount?.toLocaleString?.() ?? s.productCount}</td>
                  <td className="px-4 py-3 text-right"><span className={s.status === "active" ? "text-nexa-success text-xs" : "text-nexa-warning text-xs"}>{s.status}</span></td>
                  <td className="px-4 py-3 text-right text-xs text-nexa-text-secondary">{s.lastSync ? new Date(s.lastSync).toLocaleString("tr-TR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "duplicates" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
              <p className="text-2xl font-bold text-nexa-warning">{duplicateData?.summary?.groupCount?.toLocaleString?.("tr-TR") ?? 0}</p>
              <p className="mt-1 text-[10px] text-nexa-text-secondary">Duplicate grup</p>
            </div>
            <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
              <p className="text-2xl font-bold text-nexa-primary">{duplicateData?.summary?.affectedProducts?.toLocaleString?.("tr-TR") ?? 0}</p>
              <p className="mt-1 text-[10px] text-nexa-text-secondary">Etkilenen kayıt</p>
            </div>
            <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
              <p className="text-2xl font-bold text-nexa-text">{duplicateData?.summary?.crossSourceGroups?.toLocaleString?.("tr-TR") ?? 0}</p>
              <p className="mt-1 text-[10px] text-nexa-text-secondary">Çok kaynaklı grup</p>
            </div>
          </div>

          <div className="rounded-xl border border-nexa-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nexa-border bg-nexa-bg/50">
                  <th className="px-4 py-3 text-left text-nexa-text-secondary">Alan</th>
                  <th className="px-4 py-3 text-left text-nexa-text-secondary">Değer</th>
                  <th className="px-4 py-3 text-right text-nexa-text-secondary">Kayıt</th>
                  <th className="px-4 py-3 text-right text-nexa-text-secondary">Kaynak</th>
                  <th className="px-4 py-3 text-right text-nexa-text-secondary">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border">
                {(duplicateData?.groups || []).map((group: any) => (
                  <tr key={`${group.field}-${group.value}`} className="hover:bg-nexa-hover">
                    <td className="px-4 py-3 text-xs text-nexa-text-secondary">{group.fieldLabel}</td>
                    <td className="px-4 py-3 text-nexa-text font-mono text-xs">{group.value}</td>
                    <td className="px-4 py-3 text-right">{group.count?.toLocaleString?.("tr-TR") ?? group.count}</td>
                    <td className="px-4 py-3 text-right text-xs text-nexa-text-secondary">{group.sourceCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/thyronix/processing?tab=duplicates&field=${encodeURIComponent(group.field)}`} className="text-xs text-nexa-primary hover:underline">
                        İncele
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!duplicateData?.groups || duplicateData.groups.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-nexa-text-secondary">
                      Duplicate grup bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "feeds" && (
        <div className="rounded-xl border border-nexa-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
              <th className="px-4 py-3 text-left text-nexa-text-secondary">Feed</th>
              <th className="px-4 py-3 text-right text-nexa-text-secondary">Kanal</th>
              <th className="px-4 py-3 text-right text-nexa-text-secondary">Ürün</th>
              <th className="px-4 py-3 text-right text-nexa-text-secondary">Son Yayın</th>
            </tr></thead>
            <tbody className="divide-y divide-nexa-border">
              {(data.feedPerformance || []).map((f: any) => (
                <tr key={f.id} className="hover:bg-nexa-hover">
                  <td className="px-4 py-3 text-nexa-text">{f.name}</td>
                  <td className="px-4 py-3 text-right text-nexa-text-secondary">{f.channel}</td>
                  <td className="px-4 py-3 text-right">{f.productCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-nexa-text-secondary">{f.lastPublished ? new Date(f.lastPublished).toLocaleString("tr-TR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ai" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-5">
            <Brain size={18} className="text-nexa-primary mb-2" />
            <p className="text-2xl font-bold text-nexa-text">{data.aiUsage?.totalJobs ?? 0}</p>
            <p className="text-xs text-nexa-text-secondary">Toplam AI İşi</p>
          </div>
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-5">
            <TrendingUp size={18} className="text-nexa-success mb-2" />
            <p className="text-2xl font-bold text-nexa-text">{data.aiUsage?.completed ?? 0}</p>
            <p className="text-xs text-nexa-text-secondary">Tamamlanan</p>
          </div>
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-5">
            <AlertTriangle size={18} className="text-nexa-warning mb-2" />
            <p className="text-2xl font-bold text-nexa-text">{data.aiUsage?.failed ?? 0}</p>
            <p className="text-xs text-nexa-text-secondary">Başarısız</p>
          </div>
        </div>
      )}

      {tab === "sync" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-8 text-center">
            <p className="text-4xl font-bold text-nexa-primary">{data.syncStats?.successRate ?? 0}%</p>
            <p className="text-sm text-nexa-text-secondary mt-2">Sync Başarı Oranı</p>
            <p className="text-xs text-nexa-text-secondary mt-4">{data.syncStats?.success ?? 0} başarılı / {data.syncStats?.total ?? 0} toplam</p>
          </div>
          {(data.syncStats?.recent || []).length > 0 && (
            <div className="rounded-xl border border-nexa-border bg-nexa-card p-5 space-y-2">
              <h3 className="font-semibold text-sm text-nexa-text">Son Sync Kayıtları</h3>
              {data.syncStats.recent.map((l: any, i: number) => (
                <div key={i} className="flex justify-between text-sm p-2 rounded-lg border border-nexa-border">
                  <span>{l.message || l.type}</span>
                  <span className={l.status === "success" ? "text-nexa-success text-xs" : "text-nexa-warning text-xs"}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
