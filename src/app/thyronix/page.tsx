"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, Activity, Heart, Radio, Brain } from "lucide-react";
import DashboardContent from "./dashboard-content";
import HealthPage from "./health/page";
import AiToolsPage from "./ai-tools/page";

const tabs = [
  { id: "overview", label: "Genel Bakış", icon: LayoutDashboard },
  { id: "activity", label: "Aktivite", icon: Activity },
  { id: "health", label: "Sağlık", icon: Heart },
  { id: "feeds", label: "Feed Özeti", icon: Radio },
  { id: "ai", label: "AI Özeti", icon: Brain },
];

function timeAgo(date?: string | null) {
  if (!date) return "—";
  const d = Date.now() - new Date(date).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} g önce`;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/thyronix/dashboard").then((r) => r.json()).then((d) => { if (d.success) setData(d.data); });
  }, []);

  const d = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Kontrol Merkezi</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Kaynaklar, feedler ve senkronizasyonu tek ekrandan izleyin.</p>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Toplam Kaynak", val: d.totalSources ?? 0 },
            { label: "Toplam Ürün", val: d.totalProducts ?? 0 },
            { label: "Aktif Feed", val: d.activeFeeds ?? 0 },
            { label: "Son Sync", val: d.lastSync?.createdAt ? timeAgo(d.lastSync.createdAt) : "—", text: true },
            { label: "Feed Sağlığı", val: `${d.health?.feedHealthScore ?? 0}%` },
            { label: "Hatalar", val: d.health?.errorCount ?? 0, warn: (d.health?.errorCount ?? 0) > 0 },
            { label: "AI Kullanımı", val: d.aiUsage?.totalJobs ?? 0 },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-nexa-border bg-nexa-card p-3">
              <p className={`text-lg font-bold tabular-nums ${k.warn ? "text-nexa-warning" : "text-nexa-text"}`}>
                {k.text ? k.val : typeof k.val === "number" ? k.val.toLocaleString("tr-TR") : k.val}
              </p>
              <p className="text-[10px] text-nexa-text-secondary uppercase tracking-wide mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-0.5 border-b border-nexa-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-[1px] transition-colors ${
              activeTab === tab.id ? "border-nexa-primary text-nexa-primary" : "border-transparent text-nexa-text-secondary hover:text-nexa-text"
            }`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === "overview" && <DashboardContent />}
        {activeTab === "activity" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-5">
            <h3 className="font-semibold text-nexa-text mb-4">Aktivite Akışı</h3>
            {(d.recentSyncs || []).length === 0 ? (
              <p className="text-sm text-nexa-text-secondary py-8 text-center">Henüz aktivite yok.</p>
            ) : (
              <div className="space-y-2">
                {(d.recentSyncs || []).map((l: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-nexa-border text-sm">
                    <span className="text-nexa-text">{l.message || `${l.type} — ${l.productCount || 0} ürün`}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-nexa-text-secondary">{timeAgo(l.createdAt)}</span>
                      <span className={`w-2 h-2 rounded-full ${l.status === "success" ? "bg-nexa-success" : "bg-nexa-warning"}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "health" && <HealthPage />}
        {activeTab === "feeds" && (
          <div className="rounded-xl border border-nexa-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nexa-border bg-nexa-bg/50 text-nexa-text-secondary text-left">
                  <th className="px-4 py-3">Feed</th>
                  <th className="px-4 py-3">Kanal</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Ürün</th>
                  <th className="px-4 py-3">Son Yayın</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexa-border">
                {(d.feeds || []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-nexa-text-secondary">Henüz feed yok</td></tr>
                ) : (
                  (d.feeds || []).map((f: any) => (
                    <tr key={f.id} className="hover:bg-nexa-hover">
                      <td className="px-4 py-3 font-medium text-nexa-text">{f.name}</td>
                      <td className="px-4 py-3 text-nexa-text-secondary">{f.channel}</td>
                      <td className="px-4 py-3 text-nexa-text-secondary">{f.outputFormat}</td>
                      <td className="px-4 py-3 text-nexa-text">{f.productCount}</td>
                      <td className="px-4 py-3 text-nexa-text-secondary text-xs">{f.lastPublished ? new Date(f.lastPublished).toLocaleString("tr-TR") : "—"}</td>
                      <td className="px-4 py-3"><span className={f.status === "active" ? "text-nexa-success text-xs" : "text-nexa-warning text-xs"}>{f.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === "ai" && (
          d.plan?.limits?.aiEnabled ? (
            <AiToolsPage />
          ) : (
            <div className="rounded-xl border border-nexa-border bg-nexa-card p-10 text-center">
              <Brain size={40} className="mx-auto text-nexa-primary/30 mb-3" />
              <p className="text-nexa-text font-medium">AI özellikleri {d.plan?.key || "starter"} paketinde kapalı</p>
              <p className="text-sm text-nexa-text-secondary mt-2">Professional veya Enterprise plana yükseltin.</p>
              <a href="/thyronix/pricing" className="inline-block mt-4 text-sm text-nexa-primary hover:underline">Paketleri Gör</a>
            </div>
          )
        )}
      </div>
    </div>
  );
}
