"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { AdminModuleAccessPanel } from "@/components/admin/AdminModuleAccessPanel";

type Tab = "sources" | "feeds" | "rules" | "logs" | "exclusions" | "licenses";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    paused: "bg-amber-50 text-amber-700",
    error: "bg-ena-primary/5 text-ena-primary",
    draft: "bg-gray-50 text-gray-600",
    completed: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] || "bg-gray-50 text-gray-600"}`}>{status}</span>;
}

async function fetchJson(url: string) {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data;
}

export default function AdminThyronixPage() {
  const [tab, setTab] = useState<Tab>("sources");
  const [sources, setSources] = useState<any[]>([]);
  const [feeds, setFeeds] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    const data = await fetchJson("/api/thyronix/sources");
    setSources(data);
  }, []);

  const loadFeeds = useCallback(async () => {
    const data = await fetchJson("/api/admin/thyronix-feeds");
    setFeeds(data);
  }, []);

  const loadRules = useCallback(async () => {
    const data = await fetchJson("/api/admin/thyronix-rules");
    setRules(data);
  }, []);

  const loadLogs = useCallback(async () => {
    const data = await fetchJson("/api/admin/thyronix-logs");
    setLogs(data.items || []);
  }, []);

  const loadExclusions = useCallback(async () => {
    const data = await fetchJson("/api/admin/thyronix-exclusions");
    setExclusions(data);
  }, []);

  const refreshTab = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      switch (t) {
        case "sources": await loadSources(); break;
        case "feeds": await loadFeeds(); break;
        case "rules": await loadRules(); break;
        case "logs": await loadLogs(); break;
        case "exclusions": await loadExclusions(); break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [loadSources, loadFeeds, loadRules, loadLogs, loadExclusions]);

  useEffect(() => {
    refreshTab(tab);
  }, [tab, refreshTab]);

  useEffect(() => {
    Promise.all([loadSources(), loadFeeds(), loadRules(), loadLogs(), loadExclusions()]).catch(() => {});
  }, [loadSources, loadFeeds, loadRules, loadLogs, loadExclusions]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">THYRONIX Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">Kaynak, besleme, kural ve senkronizasyon merkezi</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {(["sources", "feeds", "rules", "logs", "exclusions", "licenses"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t === "sources" ? "Kaynaklar" : t === "feeds" ? "Beslemeler" : t === "rules" ? "Kurallar" : t === "logs" ? "Loglar" : t === "exclusions" ? "Hariç Tutulanlar" : "Lisanslar"}
          </button>
        ))}
      </div>

      {error && tab !== "licenses" && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => refreshTab(tab)} className="text-xs font-medium underline">Tekrar dene</button>
        </div>
      )}

      {loading && tab !== "licenses" && <div className="text-center py-12 text-gray-400">Yükleniyor...</div>}

      {tab === "licenses" && <AdminModuleAccessPanel moduleKey="THYRONIX" />}

      {!loading && tab === "sources" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Kaynaklar</h2>
            <div className="flex gap-2">
              <Link href="/thyronix" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><ExternalLink size={12} /> THYRONIX&apos;a Git</Link>
              <button type="button" onClick={() => refreshTab("sources")} className="text-xs text-gray-500 hover:text-gray-700"><RefreshCw size={12} /></button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ad</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tür</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ürün</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Son Senk.</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{s.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">{s.productCount || 0}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">{s.lastSync ? new Date(s.lastSync).toLocaleString("tr-TR") : "—"}</td>
                </tr>
              ))}
              {sources.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henüz kaynak yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "feeds" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Beslemeler</h2>
            <button type="button" onClick={() => refreshTab("feeds")} className="text-xs text-gray-500 hover:text-gray-700"><RefreshCw size={12} /></button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ad</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kaynak</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kanal</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ürün</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aralık</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Son Yayın</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {feeds.map((f: any) => (
                <tr key={f.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{f.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {f.sourceId ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{f.source?.name || "Kaynak feedi"}</span>
                        <span className="text-[11px] text-gray-500">{f.source?.type || "source"} · bağlı</span>
                      </div>
                    ) : (
                      "Tüm kaynaklar"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{f.channel}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">{f.productCount || 0}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">{f.schedule || 24} saat</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">{f.lastPublished ? new Date(f.lastPublished).toLocaleString("tr-TR") : "—"}</td>
                </tr>
              ))}
              {feeds.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Henüz besleme yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "rules" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Kurallar</h2>
            <button type="button" onClick={() => refreshTab("rules")} className="text-xs text-gray-500 hover:text-gray-700"><RefreshCw size={12} /></button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ad</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Alan</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Koşul</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aksiyon</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.field}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.operator} {r.value}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.action}{r.actionValue ? `: ${r.actionValue}` : ""}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henüz kural yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "logs" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Senkronizasyon Logları</h2>
            <button type="button" onClick={() => refreshTab("logs")} className="text-xs text-gray-500 hover:text-gray-700"><RefreshCw size={12} /></button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tarih</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tür</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ürün</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mesaj</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-right text-xs text-gray-600">{l.productCount ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{l.message || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henüz log yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "exclusions" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Hariç Tutulanlar</h2>
            <button type="button" onClick={() => refreshTab("exclusions")} className="text-xs text-gray-500 hover:text-gray-700"><RefreshCw size={12} /></button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tür</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Değer</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sebep</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {exclusions.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-600">{e.type}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-900">{e.value}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{e.reason || "—"}</td>
                </tr>
              ))}
              {exclusions.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Henüz hariç tutulan yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
