"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw, Link2, Shield, Activity, Puzzle } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { AdminModuleAccessPanel } from "@/components/admin/AdminModuleAccessPanel";
import LinkSlashAppShell from "@/components/linkslash/LinkSlashAppShell";

type Tab = "overview" | "licenses" | "app";

type Overview = {
  health: {
    api: string;
    moduleKey: string;
    routes: Record<string, string>;
  };
  stats: {
    capturesPending: number;
    capturesSynced: number;
    capturesTotal: number;
    cloudLinks: number;
    plans: number;
    licenses: number;
    licensesActive: number;
  };
  recentCaptures: Array<{
    id: string;
    url: string;
    title: string;
    domain: string;
    sourceType: string;
    status: string;
    createdAt: string;
  }>;
};

export default function AdminLinkSlashPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/linkslash/overview");
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Yüklenemedi");
      setOverview(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "overview") loadOverview();
  }, [tab, loadOverview]);

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: "overview", label: "Durum & Extension", icon: Activity },
    { id: "licenses", label: "Lisanslar", icon: Shield },
    { id: "app", label: "Uygulama", icon: Puzzle },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LinkSlash Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">Extension capture kuyruğu, lisanslar ve uygulama erişimi</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={loadOverview} className="text-xs font-medium underline">
                Tekrar dene
              </button>
            </div>
          )}

          {loading && <div className="text-center py-12 text-gray-400">Yükleniyor...</div>}

          {!loading && overview && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Bekleyen Capture", value: overview.stats.capturesPending, color: "text-amber-600" },
                  { label: "Cloud Link", value: overview.stats.cloudLinks, color: "text-cyan-600" },
                  { label: "Senkronize", value: overview.stats.capturesSynced, color: "text-emerald-600" },
                  { label: "Aktif Lisans", value: overview.stats.licensesActive, color: "text-blue-600" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Link2 size={16} className="text-cyan-600" />
                    Chrome Extension Kurulum
                  </h2>
                  <button type="button" onClick={loadOverview} className="text-xs text-gray-500 hover:text-gray-700">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Chrome → <code className="bg-gray-100 px-1 rounded">chrome://extensions</code></li>
                  <li>Geliştirici modu açık → &quot;Paketlenmemiş öğe yükle&quot;</li>
                  <li>
                    Klasör:{" "}
                    <code className="bg-gray-100 px-1 rounded break-all">
                      {typeof window !== "undefined" ? window.location.origin : ""}/linkslash/extension/
                    </code>
                  </li>
                  <li>Kullanıcı enaunity.com.tr&apos;de giriş yapmalı + LINKSLASH lisansı olmalı</li>
                </ol>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="/linkslash/extension/manifest.json"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink size={12} /> Manifest
                  </a>
                  <a
                    href="/api/linkslash/proxy/health"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink size={12} /> Proxy Health
                  </a>
                  <a
                    href="/dealer/linkslash"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs text-white hover:bg-cyan-500"
                  >
                    <ExternalLink size={12} /> Uygulamayı Aç
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">Son Extension Capture Kayıtları</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Başlık</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Domain</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kaynak</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overview.recentCaptures.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-medium text-gray-900 max-w-[200px] truncate">{row.title || row.url}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{row.domain || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{row.sourceType}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              row.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">
                          {new Date(row.createdAt).toLocaleString("tr-TR")}
                        </td>
                      </tr>
                    ))}
                    {overview.recentCaptures.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          Henüz extension capture kaydı yok
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "licenses" && <AdminModuleAccessPanel moduleKey="LINKSLASH" />}

      {tab === "app" && (
        <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
          <LinkSlashAppShell src="/linkslash/index.html" title="LinkSlash Admin" />
        </div>
      )}
    </div>
  );
}
