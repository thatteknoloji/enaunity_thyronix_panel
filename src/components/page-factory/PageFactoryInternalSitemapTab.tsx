"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Map, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Project = { id: string; name: string };

type Stats = {
  total: number;
  active: number;
  stale: number;
  error: number;
  totalUrls: number;
  indexableUrls: number;
};

type SitemapItem = {
  id: string;
  projectId: string | null;
  sitemapType: string;
  path: string;
  urlCount: number;
  status: string;
  generatedAt: string | null;
  updatedAt: string;
};

type Props = {
  projects: Project[];
  mode: "admin" | "dealer";
  defaultProjectId?: string;
};

export function PageFactoryInternalSitemapTab({ projects, mode, defaultProjectId }: Props) {
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<SitemapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ stats: "true", limit: "30" });
      if (projectId) q.set("projectId", projectId);
      const d = await fetchPageFactoryJson(`/api/page-factory/internal-sitemaps?${q}`);
      if (!d.success) throw new Error(d.error);
      const data = d.data as { stats: Stats; items: SitemapItem[] };
      setStats(data.stats);
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  const generate = async (all = false) => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const d = await fetchPageFactoryJson("/api/page-factory/internal-sitemaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: all ? "generate-all" : "generate",
          projectId: projectId || undefined,
        }),
      });
      if (!d.success) throw new Error(d.error);
      setMessage(all ? "Tüm sitemapler üretildi" : `Sitemap üretildi — ${(d.data as { totalUrls: number }).totalUrls} URL`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Üretim başarısız");
    } finally {
      setLoading(false);
    }
  };

  const markStale = async () => {
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson("/api/page-factory/internal-sitemaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-stale", projectId: projectId || undefined }),
      });
      if (!d.success) throw new Error(d.error);
      setMessage(`${(d.data as { updated: number }).updated} sitemap stale işaretlendi`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setLoading(false);
    }
  };

  const validate = async (id: string) => {
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson(`/api/page-factory/internal-sitemaps/${id}/validate`, { method: "POST" });
      if (!d.success) throw new Error(d.error);
      const v = d.data as { valid: boolean; issues: string[] };
      setMessage(v.valid ? "Sitemap geçerli" : `Sorunlar: ${v.issues.join(", ")}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validate başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-blue-50/50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Map size={16} className="text-blue-600" />
            Internal Sitemap
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            PUBLISHED_INTERNAL + index sayfalarından JSON sitemap üret
          </p>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Proje</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="">Tümü</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          {mode === "admin" && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => generate(false)} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Sitemap Üret
              </button>
              <button type="button" onClick={() => generate(true)} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                Tüm Sitemapleri Üret
              </button>
              <button type="button" onClick={markStale} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-50">
                <ShieldAlert size={14} /> Stale İşaretle
              </button>
              <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50">
                <RefreshCw size={14} /> Yenile
              </button>
              <a href="/pf-sitemap/internal.json" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50">
                JSON Görüntüle
              </a>
            </div>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Toplam Sitemap" value={stats.total} />
          <StatCard label="Aktif" value={stats.active} color="text-emerald-600" />
          <StatCard label="Stale" value={stats.stale} color="text-amber-600" />
          <StatCard label="Error" value={stats.error} color="text-red-600" />
          <StatCard label="Toplam URL" value={stats.totalUrls} />
          <StatCard label="Indexlenebilir URL" value={stats.indexableUrls} color="text-blue-600" />
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b px-6 py-3 text-sm font-semibold">Sitemap Kayıtları</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Path</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">URL</th>
                <th className="px-4 py-2 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henüz sitemap yok</td></tr>
              ) : items.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{s.sitemapType}</td>
                  <td className="px-4 py-2 font-mono text-[10px]">{s.path}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 ${s.status === "ACTIVE" ? "text-emerald-600" : s.status === "STALE" ? "text-amber-600" : "text-red-600"}`}>
                      {s.status === "ACTIVE" ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{s.urlCount}</td>
                  <td className="px-4 py-2 text-right">
                    {mode === "admin" && (
                      <button type="button" onClick={() => validate(s.id)} className="text-blue-600 hover:underline">Validate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${color || "text-gray-900"}`}>{value}</p>
    </div>
  );
}
