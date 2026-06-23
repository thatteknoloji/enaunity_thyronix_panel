"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type IndexItem = {
  id: string;
  title: string;
  path: string;
  slug: string;
  status: string;
  robots: string;
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  publishScore: number;
  blueprintType: string;
  generationSource: string;
  indexable: boolean;
  updatedAt: string;
};

type Props = { mode: "admin" | "dealer" };

export function PageFactoryPfIndex({ mode }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("PUBLISHED_INTERNAL");
  const [robots, setRobots] = useState("");
  const [items, setItems] = useState<IndexItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ pageSize: "50", page: "1" });
      if (query) q.set("query", query);
      if (status) q.set("status", status);
      if (robots) q.set("robots", robots);
      const d = await fetchPageFactoryJson(`/api/page-factory/published-pages?${q}`);
      if (!d.success) throw new Error(d.error);
      const data = d.data as { items: IndexItem[]; total: number };
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, status, robots]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Published Page Index</h1>
          <p className="text-sm text-gray-500 mt-1">
            İç yayınlanan sayfalar — {mode === "admin" ? "Admin" : "Dealer"} görünümü
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Başlık, path, slug ara..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Tüm status</option>
            <option value="PUBLISHED_INTERNAL">PUBLISHED_INTERNAL</option>
            <option value="STAGED">STAGED</option>
            <option value="UNPUBLISHED">UNPUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select value={robots} onChange={(e) => setRobots(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Tüm robots</option>
            <option value="index">index</option>
            <option value="noindex">noindex</option>
          </select>
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-white">
            <RefreshCw size={14} /> Yenile
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b px-4 py-3 text-sm text-gray-600">{total} kayıt</div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-violet-500" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Başlık</th>
                    <th className="px-4 py-2 text-left">Path</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Robots</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-right">Scores</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Kayıt yok</td></tr>
                  ) : items.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 max-w-[180px] truncate">{p.title}</td>
                      <td className="px-4 py-2 font-mono text-[10px]">
                        <a href={`/pf${p.path}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{p.path}</a>
                      </td>
                      <td className="px-4 py-2">{p.status}</td>
                      <td className="px-4 py-2">{p.robots}</td>
                      <td className="px-4 py-2">{p.blueprintType || "—"}</td>
                      <td className="px-4 py-2 text-right">{p.seoScore}/{p.aeoScore}/{p.geoScore}/{p.publishScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
