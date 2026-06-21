"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Layers,
  GitBranch,
  FileStack,
  Calculator,
  Plus,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { PRODUCTION_TYPES, type ProductionType } from "@/lib/page-factory/types";
import { AdminModuleAccessPanel } from "@/components/admin/AdminModuleAccessPanel";

type Dashboard = {
  totalProjects: number;
  totalBlueprints: number;
  totalClusters: number;
  estimatedPageCount: number;
  totalTopologyNodes: number;
  projects: Array<{
    id: string;
    name: string;
    sector: string;
    country: string;
    productionType: string;
    status: string;
    metadataJson: string;
    _count: { blueprints: number; topologies: number };
  }>;
};

type ProjectDetail = Dashboard["projects"][0] & {
  topologies?: Array<{ topologyType: string; nodeCount: number; metadataJson: string }>;
  blueprints?: Array<{ title: string; pageType: string; hierarchyLevel: number; clusterPath: string; metadataJson: string }>;
  metadata?: {
    estimatedPageCount?: number;
    estimate?: { totalPages: number; formula: string; breakdown: Record<string, number>; note: string };
    sampleClusterPaths?: string[];
    clusterCount?: number;
  };
};

const PRODUCTION_LABELS: Record<ProductionType, string> = {
  GEO: "GEO",
  SEO: "SEO",
  GEO_SEO: "GEO + SEO",
  FAQ: "FAQ",
  BLOG: "BLOG",
  PRODUCT: "PRODUCT",
  SERVICE: "SERVICE",
  MIXED: "MIXED",
};

type Props = { showLicensePanel?: boolean };

export function PageFactoryShell({ showLicensePanel = false }: Props) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProjectDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sector: "",
    country: "TR",
    language: "tr",
    productionType: "GEO_SEO" as ProductionType,
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/page-factory/dashboard");
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Yüklenemedi");
      setDashboard(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const loadProject = async (id: string) => {
    const r = await fetch(`/api/page-factory/projects/${id}`);
    const d = await r.json();
    if (d.success) setSelected(d.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/page-factory/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Oluşturulamadı");
      setForm({ name: "", sector: "", country: "TR", language: "tr", productionType: "GEO_SEO" });
      await loadDashboard();
      await loadProject(d.data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async (id: string) => {
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`/api/page-factory/projects/${id}/generate`, { method: "POST" });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Plan üretilemedi");
      setSelected(d.data);
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan üretilemedi");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 mb-1">ENA Engine</p>
        <h1 className="text-2xl font-bold text-gray-900">AI Page Factory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sayfa evreni planlama — topology, cluster, blueprint. Faz 1: içerik üretimi yok.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-violet-500" size={28} />
        </div>
      ) : dashboard ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Toplam Proje", value: dashboard.totalProjects, icon: Layers, color: "text-violet-600" },
              { label: "Toplam Blueprint", value: dashboard.totalBlueprints, icon: FileStack, color: "text-blue-600" },
              { label: "Toplam Cluster", value: dashboard.totalClusters, icon: GitBranch, color: "text-emerald-600" },
              {
                label: "Tahmini Sayfa Sayısı",
                value: dashboard.estimatedPageCount.toLocaleString("tr-TR"),
                icon: Calculator,
                color: "text-amber-600",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <item.icon size={18} className={item.color} />
                  <span className="text-xl font-bold text-gray-900">{item.value}</span>
                </div>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Plus size={16} className="text-violet-600" /> Yeni Proje
              </h2>
              <div>
                <label className="text-xs text-gray-500">Proje Adı</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Örn: Cam Tablo GEO Ağı"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Sektör / Ürün Kökü</label>
                <input
                  required
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Örn: Cam Tablo"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Ülke</label>
                  <input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Dil</label>
                  <input
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Üretim Türü</label>
                <select
                  value={form.productionType}
                  onChange={(e) => setForm({ ...form, productionType: e.target.value as ProductionType })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {PRODUCTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PRODUCTION_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {creating ? "Oluşturuluyor…" : "Proje Oluştur"}
              </button>
            </form>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Projeler</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {dashboard.projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => loadProject(p.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-left hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {p.sector} · {PRODUCTION_LABELS[p.productionType as ProductionType] || p.productionType} · {p.status}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                  </button>
                ))}
                {dashboard.projects.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Henüz proje yok</p>
                )}
              </div>
            </div>
          </div>

          {selected && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-sm text-gray-500">{selected.sector} · {selected.country.toUpperCase()}</p>
                </div>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleGenerate(selected.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Topology + Cluster + Blueprint Üret
                </button>
              </div>

              {selected.metadata?.estimate && (
                <div className="rounded-lg bg-white border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Page Estimator</p>
                  <p className="text-2xl font-bold text-amber-600">
                    Tahmini: {selected.metadata.estimate.totalPages.toLocaleString("tr-TR")} sayfa
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Formül: {selected.metadata.estimate.formula}</p>
                  <p className="text-xs text-gray-400 mt-2">{selected.metadata.estimate.note}</p>
                </div>
              )}

              {selected.metadata?.sampleClusterPaths && selected.metadata.sampleClusterPaths.length > 0 && (
                <div className="rounded-lg bg-white border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Cluster Engine — örnek yollar</p>
                  <ul className="space-y-1 text-xs text-gray-700 font-mono">
                    {selected.metadata.sampleClusterPaths.map((path) => (
                      <li key={path} className="truncate">{path}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.topologies && selected.topologies.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selected.topologies.map((t) => (
                    <div key={t.topologyType} className="rounded-lg bg-white border border-gray-200 p-3">
                      <p className="text-xs font-semibold uppercase text-violet-700">{t.topologyType}</p>
                      <p className="text-lg font-bold text-gray-900">{t.nodeCount} düğüm</p>
                    </div>
                  ))}
                </div>
              )}

              {selected.blueprints && selected.blueprints.length > 0 && (
                <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase text-gray-600">Blueprint Engine (şablon — içerik yok)</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {selected.blueprints.slice(0, 12).map((bp, i) => (
                      <div key={i} className="px-4 py-2 text-xs">
                        <p className="font-medium text-gray-900">{bp.title}</p>
                        <p className="text-gray-500">{bp.pageType} · L{bp.hierarchyLevel}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      {showLicensePanel && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Modül Lisansları</h2>
          <AdminModuleAccessPanel moduleKey="AI_PAGE_FACTORY" />
        </div>
      )}
    </div>
  );
}
