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
  Pencil,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import { PRODUCTION_TYPES, type ProductionType } from "@/lib/page-factory/types";
import { AdminModuleAccessPanel } from "@/components/admin/AdminModuleAccessPanel";
import { BlueprintUniverseTab } from "@/components/page-factory/BlueprintUniverseTab";
import { PublishGateReviewTab } from "@/components/page-factory/PublishGateReviewTab";
import { PageFactoryPipelineTab } from "@/components/page-factory/PageFactoryPipelineTab";
import { PageFactoryPublishedPagesTab } from "@/components/page-factory/PageFactoryPublishedPagesTab";
import { PageFactoryInternalSitemapTab } from "@/components/page-factory/PageFactoryInternalSitemapTab";
import { ContentDraftPreviewModal } from "@/components/page-factory/ContentDraftPreviewModal";

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
  blueprints?: Array<{ id: string; title: string; pageType: string; hierarchyLevel: number; clusterPath: string; metadataJson: string }>;
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
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", sector: "", country: "TR", language: "tr", productionType: "GEO_SEO" as ProductionType });
  const [deleting, setDeleting] = useState(false);
  const [projectTab, setProjectTab] = useState<"overview" | "universe">("overview");
  const [blueprintSourceFilter, setBlueprintSourceFilter] = useState<"all" | "PRODUCT_UNIVERSE_V2">("all");
  const [aeoFilter, setAeoFilter] = useState<"all" | "missing" | "ready" | "low">("all");
  const [aeoMinScore, setAeoMinScore] = useState(0);
  const [aeoBulkLoading, setAeoBulkLoading] = useState(false);
  const [draftBulkLoading, setDraftBulkLoading] = useState(false);
  const [draftStats, setDraftStats] = useState<{
    totalBlueprints: number;
    totalDrafts: number;
    readyToPublish: number;
    needsReview: number;
    rejected: number;
    withoutDraft: number;
    avgPublishScore: number;
    avgAeoScore: number;
  } | null>(null);
  const [draftPreview, setDraftPreview] = useState<{ open: boolean; data: any; title: string }>({
    open: false,
    data: null,
    title: "",
  });
  const [shellView, setShellView] = useState<"projects" | "review" | "pipeline" | "published" | "sitemap">("projects");
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
    if (d.success) {
      setSelected(d.data);
      setEditing(false);
      setProjectTab("overview");
      setEditForm({
        name: d.data.name,
        sector: d.data.sector,
        country: d.data.country,
        language: d.data.language,
        productionType: d.data.productionType,
      });
      const statsR = await fetch(`/api/page-factory/projects/${id}/draft-stats`);
      const statsD = await statsR.json();
      if (statsD.success) setDraftStats(statsD.data);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch(`/api/page-factory/projects/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Güncellenemedi");
      setEditing(false);
      await loadDashboard();
      await loadProject(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Güncellenemedi");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu proje ve tüm topology/blueprint kayıtları silinecek. Emin misiniz?")) return;
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch(`/api/page-factory/projects/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Silinemedi");
      if (selected?.id === id) setSelected(null);
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setDeleting(false);
    }
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

      <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setShellView("projects")}
          className={`px-4 py-1.5 text-xs font-medium rounded-md ${shellView === "projects" ? "bg-violet-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Projeler
        </button>
        <button
          type="button"
          onClick={() => setShellView("review")}
          className={`px-4 py-1.5 text-xs font-medium rounded-md ${shellView === "review" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Publish Gate / Review Queue
        </button>
        <button
          type="button"
          onClick={() => setShellView("pipeline")}
          className={`px-4 py-1.5 text-xs font-medium rounded-md ${shellView === "pipeline" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Pipeline
        </button>
        <button
          type="button"
          onClick={() => setShellView("published")}
          className={`px-4 py-1.5 text-xs font-medium rounded-md ${shellView === "published" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Published Pages
        </button>
        <button
          type="button"
          onClick={() => setShellView("sitemap")}
          className={`px-4 py-1.5 text-xs font-medium rounded-md ${shellView === "sitemap" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Internal Sitemap
        </button>
      </div>

      {shellView === "review" ? (
        <PublishGateReviewTab projectId={selected?.id} />
      ) : shellView === "pipeline" ? (
        loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-violet-500" size={28} />
          </div>
        ) : dashboard ? (
          <PageFactoryPipelineTab
            projects={dashboard.projects.map((p) => ({ id: p.id, name: p.name }))}
            mode={showLicensePanel ? "admin" : "dealer"}
          />
        ) : null
      ) : shellView === "published" ? (
        loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-violet-500" size={28} />
          </div>
        ) : dashboard ? (
          <PageFactoryPublishedPagesTab
            projects={dashboard.projects.map((p) => ({ id: p.id, name: p.name }))}
            mode={showLicensePanel ? "admin" : "dealer"}
          />
        ) : null
      ) : shellView === "sitemap" ? (
        loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-violet-500" size={28} />
          </div>
        ) : dashboard ? (
          <PageFactoryInternalSitemapTab
            projects={dashboard.projects.map((p) => ({ id: p.id, name: p.name }))}
            mode={showLicensePanel ? "admin" : "dealer"}
          />
        ) : null
      ) : loading ? (
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
                  <div key={p.id} className="flex items-center gap-1 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => loadProject(p.id)}
                      className="flex flex-1 items-center justify-between px-3 py-2.5 text-left min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {p.sector} · {PRODUCTION_LABELS[p.productionType as ProductionType] || p.productionType} · {p.status}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-gray-400 shrink-0 ml-2" />
                    </button>
                    <button
                      type="button"
                      title="Sil"
                      disabled={deleting}
                      onClick={() => handleDelete(p.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
                  <p className="text-sm text-gray-500">{selected.sector} · {selected.country.toUpperCase()} · {selected.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {editing ? <X size={14} /> : <Pencil size={14} />}
                    {editing ? "İptal" : "Düzenle"}
                  </button>
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => handleGenerate(selected.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Plan Üret
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(selected.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Sil
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="rounded-lg bg-white border border-gray-200 p-4 grid gap-3 sm:grid-cols-2">
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Proje adı" className="rounded-lg border px-3 py-2 text-sm" />
                  <input value={editForm.sector} onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })} placeholder="Sektör" className="rounded-lg border px-3 py-2 text-sm" />
                  <input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} placeholder="Ülke" className="rounded-lg border px-3 py-2 text-sm" />
                  <select value={editForm.productionType} onChange={(e) => setEditForm({ ...editForm, productionType: e.target.value as ProductionType })} className="rounded-lg border px-3 py-2 text-sm">
                    {PRODUCTION_TYPES.map((t) => (
                      <option key={t} value={t}>{PRODUCTION_LABELS[t]}</option>
                    ))}
                  </select>
                  <button type="button" onClick={handleUpdate} disabled={creating} className="sm:col-span-2 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white">
                    {creating ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Eye size={14} /> Görüntüleme modu — {selected._count?.blueprints ?? 0} blueprint, {selected._count?.topologies ?? 0} topology
                </div>
              )}

              <div className="flex gap-1 bg-white/80 p-1 rounded-lg w-fit border border-violet-100">
                <button
                  type="button"
                  onClick={() => setProjectTab("overview")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md ${projectTab === "overview" ? "bg-violet-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  Genel Bakış
                </button>
                <button
                  type="button"
                  onClick={() => setProjectTab("universe")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md ${projectTab === "universe" ? "bg-violet-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  Blueprint Evreni
                </button>
              </div>

              {projectTab === "universe" ? (
                <BlueprintUniverseTab
                  projectId={selected.id}
                  sector={selected.sector}
                  onGenerated={() => {
                    loadProject(selected.id);
                    loadDashboard();
                  }}
                />
              ) : (
              <>
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

              {draftStats && (
                <div className="rounded-lg bg-white border border-violet-200 p-4">
                  <p className="text-xs font-semibold uppercase text-violet-700 mb-3">Content Drafts (PAGE_FACTORY_V3)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><p className="text-gray-500">Blueprint</p><p className="font-bold text-gray-900">{draftStats.totalBlueprints}</p></div>
                    <div><p className="text-gray-500">Draft üretilmiş</p><p className="font-bold text-gray-900">{draftStats.totalDrafts}</p></div>
                    <div><p className="text-gray-500">Ready to publish</p><p className="font-bold text-emerald-600">{draftStats.readyToPublish}</p></div>
                    <div><p className="text-gray-500">Needs review</p><p className="font-bold text-amber-600">{draftStats.needsReview}</p></div>
                    <div><p className="text-gray-500">Rejected</p><p className="font-bold text-red-600">{draftStats.rejected}</p></div>
                    <div><p className="text-gray-500">Draft yok</p><p className="font-bold text-gray-600">{draftStats.withoutDraft}</p></div>
                    <div><p className="text-gray-500">Ort. AEO</p><p className="font-bold text-cyan-700">{draftStats.avgAeoScore}</p></div>
                    <div><p className="text-gray-500">Ort. Publish</p><p className="font-bold text-violet-700">{draftStats.avgPublishScore}</p></div>
                  </div>
                </div>
              )}

              {selected.blueprints && selected.blueprints.length > 0 && (
                <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-semibold uppercase text-gray-600">Blueprint Engine (şablon — içerik yok)</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={blueprintSourceFilter}
                        onChange={(e) => setBlueprintSourceFilter(e.target.value as "all" | "PRODUCT_UNIVERSE_V2")}
                        className="text-[10px] rounded border border-gray-200 px-2 py-1"
                      >
                        <option value="all">Tüm blueprintler</option>
                        <option value="PRODUCT_UNIVERSE_V2">Product Universe Blueprintleri</option>
                      </select>
                      <select
                        value={aeoFilter}
                        onChange={(e) => setAeoFilter(e.target.value as typeof aeoFilter)}
                        className="text-[10px] rounded border border-gray-200 px-2 py-1"
                      >
                        <option value="all">AEO: Tümü</option>
                        <option value="missing">AEO yok</option>
                        <option value="ready">AEO hazır</option>
                        <option value="low">Düşük kalite</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={aeoMinScore}
                        onChange={(e) => setAeoMinScore(Number(e.target.value))}
                        placeholder="Min AEO"
                        className="text-[10px] w-16 rounded border border-gray-200 px-2 py-1"
                      />
                      <button
                        type="button"
                        disabled={aeoBulkLoading || !selected.id}
                        onClick={async () => {
                          setAeoBulkLoading(true);
                          try {
                            const r = await fetch("/api/aeo/blueprints/bulk-generate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                projectId: selected.id,
                                generationSource: "PRODUCT_UNIVERSE_V2",
                                aeoStatus: aeoFilter === "all" ? undefined : aeoFilter,
                                minAeoScore: aeoMinScore || undefined,
                                limit: 100,
                                dryRun: false,
                              }),
                            });
                            const d = await r.json();
                            if (!d.success) throw new Error(d.error);
                            await loadProject(selected.id);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Toplu AEO başarısız");
                          } finally {
                            setAeoBulkLoading(false);
                          }
                        }}
                        className="text-[10px] inline-flex items-center gap-1 rounded bg-cyan-600 text-white px-2 py-1 disabled:opacity-50"
                      >
                        {aeoBulkLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        Toplu AEO Üret
                      </button>
                      <button
                        type="button"
                        disabled={draftBulkLoading || !selected.id}
                        onClick={async () => {
                          setDraftBulkLoading(true);
                          try {
                            const r = await fetch("/api/page-factory/blueprints/drafts/bulk-generate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                projectId: selected.id,
                                generationSource: "PRODUCT_UNIVERSE_V2",
                                onlyWithoutDraft: true,
                                limit: 100,
                                dryRun: false,
                              }),
                            });
                            const d = await r.json();
                            if (!d.success) throw new Error(d.error);
                            await loadProject(selected.id);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Toplu draft başarısız");
                          } finally {
                            setDraftBulkLoading(false);
                          }
                        }}
                        className="text-[10px] inline-flex items-center gap-1 rounded bg-violet-600 text-white px-2 py-1 disabled:opacity-50"
                      >
                        {draftBulkLoading ? <Loader2 size={10} className="animate-spin" /> : <FileStack size={10} />}
                        Toplu Draft Oluştur
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {selected.blueprints
                      .filter((bp) => {
                        if (blueprintSourceFilter !== "all") {
                          try {
                            const m = JSON.parse(bp.metadataJson || "{}") as { generationSource?: string };
                            if (m.generationSource !== blueprintSourceFilter) return false;
                          } catch {
                            return false;
                          }
                        }
                        try {
                          const m = JSON.parse(bp.metadataJson || "{}") as { aeo?: { version?: string; aeoQualityScore?: number } };
                          const hasAeo = m.aeo?.version === "AEO_LAYER_V1";
                          const score = m.aeo?.aeoQualityScore ?? 0;
                          if (aeoFilter === "missing" && hasAeo) return false;
                          if (aeoFilter === "ready" && !hasAeo) return false;
                          if (aeoFilter === "low" && (!hasAeo || score >= 50)) return false;
                          if (aeoMinScore > 0 && score < aeoMinScore) return false;
                        } catch {
                          if (aeoFilter !== "all" && aeoFilter !== "missing") return false;
                        }
                        return true;
                      })
                      .slice(0, 20)
                      .map((bp) => {
                        let aeoStatus = "Yok";
                        let aeoScore: number | null = null;
                        let draftStatus = "Yok";
                        let publishScore: number | null = null;
                        try {
                          const m = JSON.parse(bp.metadataJson || "{}") as {
                            aeo?: { version?: string; aeoQualityScore?: number };
                            contentDraft?: { publishScore?: number; version?: string };
                            contentStatus?: string;
                          };
                          if (m.aeo?.version === "AEO_LAYER_V1") {
                            aeoScore = m.aeo.aeoQualityScore ?? null;
                            aeoStatus = (aeoScore ?? 0) < 50 ? "Düşük kalite" : "Hazır";
                          }
                          if (m.contentDraft?.version === "PAGE_FACTORY_V3") {
                            publishScore = m.contentDraft.publishScore ?? null;
                            draftStatus = m.contentStatus || "DRAFT_GENERATED";
                          }
                        } catch { /* skip */ }
                        return (
                          <div key={bp.id} className="px-4 py-2 text-xs space-y-1">
                            <p className="font-medium text-gray-900">{bp.title}</p>
                            <p className="text-gray-500">
                              {bp.pageType} · L{bp.hierarchyLevel}
                              <span className="ml-2 text-cyan-700">AEO: {aeoStatus}{aeoScore != null ? ` (${aeoScore})` : ""}</span>
                              <span className="ml-2 text-violet-700">Draft: {draftStatus}{publishScore != null ? ` (${publishScore})` : ""}</span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 hover:bg-violet-100"
                                onClick={async () => {
                                  const r = await fetch(`/api/page-factory/blueprints/${bp.id}/draft/preview`, { method: "POST" });
                                  const d = await r.json();
                                  if (d.success) setDraftPreview({ open: true, data: d.data, title: bp.title });
                                }}
                              >
                                Draft Önizle
                              </button>
                              <button
                                type="button"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-violet-600 text-white hover:bg-violet-500"
                                onClick={async () => {
                                  await fetch(`/api/page-factory/blueprints/${bp.id}/draft/generate`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ dryRun: false }),
                                  });
                                  await loadProject(selected!.id);
                                }}
                              >
                                Draft Oluştur
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          )}
        </>
      ) : null}

      {shellView === "projects" && showLicensePanel && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Modül Lisansları</h2>
          <AdminModuleAccessPanel moduleKey="AI_PAGE_FACTORY" />
        </div>
      )}

      <ContentDraftPreviewModal
        open={draftPreview.open}
        onClose={() => setDraftPreview({ open: false, data: null, title: "" })}
        data={draftPreview.data}
        title={draftPreview.title}
      />
    </div>
  );
}
