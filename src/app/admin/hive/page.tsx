"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ExternalLink, Activity, Server } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Tab = "overview" | "workspaces" | "licenses" | "gateway" | "logs" | "health";

async function fetchJson(url: string) {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data;
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || "text-gray-900"}`}>{value}</p>
    </div>
  );
}

export default function AdminHivePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      switch (t) {
        case "overview":
          setOverview(await fetchJson("/api/admin/hive/overview"));
          break;
        case "workspaces":
          setWorkspaces(await fetchJson("/api/admin/hive/workspaces"));
          break;
        case "licenses":
          setLicenses(await fetchJson("/api/admin/hive/licenses"));
          break;
        case "gateway":
          setLinks(await fetchJson("/api/admin/hive/gateway-links"));
          break;
        case "logs":
          setOverview(await fetchJson("/api/admin/hive/overview"));
          break;
        case "health":
          setHealth(await fetchJson("/api/admin/hive/health"));
          break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Genel Bakış" },
    { key: "workspaces", label: "Çalışma Alanları" },
    { key: "licenses", label: "Lisanslar" },
    { key: "gateway", label: "Geçit" },
    { key: "logs", label: "Kayıtlar" },
    { key: "health", label: "Sistem Sağlığı" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HIVE Yönetim Merkezi</h1>
          <p className="mt-1 text-sm text-gray-500">Workspace, lisans ve gateway gözetimi</p>
        </div>
        <Link href="/gateway/hive" className="ml-auto text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <ExternalLink size={12} /> HIVE Gateway
        </Link>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => load(tab)} className="text-xs underline">Tekrar dene</button>
        </div>
      )}

      <div className="flex justify-end mb-3">
        <button type="button" onClick={() => load(tab)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <RefreshCw size={12} /> Yenile
        </button>
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Yükleniyor...</div>}

      {!loading && tab === "overview" && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Toplam Lisans" value={overview.totalLicenses} />
            <StatCard label="Aktif" value={overview.activeLicenses} accent="text-emerald-600" />
            <StatCard label="Trial" value={overview.trialLicenses} accent="text-blue-600" />
            <StatCard label="Beklemede" value={overview.pendingLicenses} accent="text-amber-600" />
            <StatCard label="Workspaces" value={overview.workspaceCount} />
            <StatCard label="Health" value={overview.healthStatus} accent={overview.healthStatus === "healthy" ? "text-emerald-600" : "text-amber-600"} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-700">Son Girişler</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bayi</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Workspace</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tarih</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {(overview.recentSessions || []).map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.dealerId || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.workspaceId || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.lastLoginAt).toLocaleString("tr-TR")}</td>
                  </tr>
                ))}
                {(overview.recentSessions || []).length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Henüz oturum kaydı yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === "workspaces" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bayi</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Workspace</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Oluşturulma</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {workspaces.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 text-xs text-gray-600">{w.dealerName}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{w.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{w.status}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(w.createdAt).toLocaleString("tr-TR")}</td>
                </tr>
              ))}
              {workspaces.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Workspace yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "licenses" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bayi</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Modül</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bitiş</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {licenses.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.dealerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.moduleKey}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.planKey || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.status}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{l.endsAt ? new Date(l.endsAt).toLocaleDateString("tr-TR") : "—"}</td>
                </tr>
              ))}
              {licenses.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Lisans yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "gateway" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ENA Kullanıcı</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">External</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Son Giriş</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {links.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.enaUser?.email || l.enaUserId}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.externalUser?.email || l.externalEmail || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.status}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{l.lastLoginAt ? new Date(l.lastLoginAt).toLocaleString("tr-TR") : "—"}</td>
                </tr>
              ))}
              {links.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Gateway link yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "logs" && overview && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Session Bridge Logları</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ENA User</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hive User</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Workspace</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Son Giriş</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {(overview.recentSessions || []).map((s: any) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.enaUserId}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.hiveUserId}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.workspaceId || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.lastLoginAt).toLocaleString("tr-TR")}</td>
                </tr>
              ))}
              {(overview.recentSessions || []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Log kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "health" && health && (
        <div className="grid md:grid-cols-2 gap-4">
          <StatCard label="Durum" value={health.status} accent={health.reachable ? "text-emerald-600" : "text-red-600"} />
          <StatCard label="Latency" value={`${health.latency}ms`} />
          <div className="md:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-700 font-semibold"><Server size={16} /> Health Detayı</div>
            <p><span className="text-gray-500">Reachable:</span> {health.reachable ? "Evet" : "Hayır"}</p>
            <p><span className="text-gray-500">Base URL:</span> <code className="text-xs bg-gray-100 px-1 rounded">{health.baseUrl}</code></p>
            <p><span className="text-gray-500">Proxy Mode:</span> {health.proxyMode}</p>
            {health.httpStatus != null && <p><span className="text-gray-500">HTTP:</span> {health.httpStatus}</p>}
            {health.error && <p className="text-red-600">{health.error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
