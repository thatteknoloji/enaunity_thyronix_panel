"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Sparkles,
  Eye,
  HelpCircle,
  GitBranch,
  ExternalLink,
  Package,
} from "lucide-react";
import { UNIVERSE_SOURCE_OPTIONS } from "@/lib/page-factory/universe/universe-types";

type Project = { id: string; name: string };

type DashboardStats = {
  totalProducts: number;
  estimatedBlueprints: number;
  generatedBlueprints: number;
  geoCount: number;
  intentCount: number;
  faqCount: number;
  lastJob: {
    id: string;
    status: string;
    totalProducts: number;
    generatedBlueprints: number;
    createdAt: string;
  } | null;
};

type PreviewResult = {
  totalProducts: number;
  estimatedBlueprints: number;
  perProductMin: number;
  geoCount: number;
  intentCount: number;
  faqCount: number;
  duplicateCount: number;
  byPageType: Record<string, number>;
  sampleBlueprints: Array<{ title: string; slug: string; pageType: string; blueprintKind: string }>;
  warnings: string[];
};

type GenerateResult = {
  jobId: string;
  totalProducts: number;
  generatedBlueprints: number;
  updatedBlueprints: number;
  geoCount: number;
  intentCount: number;
  faqCount: number;
  errorCount: number;
  warnings: string[];
  pipelineJobId?: string;
  pipelineResult?: {
    processedBlueprints: number;
    aeoGenerated: number;
    draftsGenerated: number;
    gatesGenerated: number;
    pagesPublished: number;
    pagesUpdated: number;
  };
};

type Props = {
  projects: Project[];
  defaultProjectId?: string;
};

export function PageFactoryUniverseGeneratorTab({ projects, defaultProjectId }: Props) {
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [sourceType, setSourceType] = useState("ALL");
  const [minQuality, setMinQuality] = useState(0);
  const [limit, setLimit] = useState(100);
  const [includeGeo, setIncludeGeo] = useState(true);
  const [autoRunPipeline, setAutoRunPipeline] = useState(false);
  const [autoPublishInternal, setAutoPublishInternal] = useState(false);
  const [pipelineLimit, setPipelineLimit] = useState(100);
  const [minPublishScore, setMinPublishScore] = useState(70);
  const [productIds, setProductIds] = useState("");
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [publishedPages, setPublishedPages] = useState<Array<{ path: string; title: string }>>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  const loadStats = useCallback(async () => {
    if (!projectId) return;
    try {
      const r = await fetch(`/api/page-factory/universe/jobs?projectId=${projectId}`);
      const d = await r.json();
      if (d.success) setStats(d.data.stats);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const buildBody = (mode: string, dryRun = false) => ({
    projectId,
    sourceType,
    minQualityScore: minQuality,
    limit,
    includeGeo,
    mode,
    dryRun,
    autoRunPipeline,
    autoPublishInternal,
    pipelineLimit,
    minPublishScore,
    stopOnError: false,
    productIds: productIds.trim()
      ? productIds.split(/[,\s]+/).filter(Boolean)
      : undefined,
  });

  const runPreview = async () => {
    if (!projectId) {
      setError("Proje seçin");
      return;
    }
    setPreviewing(true);
    setError(null);
    setPreview(null);
    try {
      const r = await fetch("/api/page-factory/universe/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody("full")),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Preview başarısız");
      setPreview(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview başarısız");
    } finally {
      setPreviewing(false);
    }
  };

  const runGenerate = async (mode: string) => {
    if (!projectId) {
      setError("Proje seçin");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/page-factory/universe/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(mode)),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Generate başarısız");
      setResult(d.data);
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate başarısız");
    } finally {
      setLoading(false);
    }
  };

  const runPipelineForJob = async (jobId: string) => {
    setPipelineLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/page-factory/universe/jobs/${jobId}/run-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoPublishInternal,
          pipelineLimit,
          minPublishScore,
          stopOnError: false,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Pipeline başarısız");
      setResult((prev) =>
        prev
          ? {
              ...prev,
              pipelineJobId: d.data.jobId,
              pipelineResult: {
                processedBlueprints: d.data.processedBlueprints,
                aeoGenerated: d.data.aeoGenerated,
                draftsGenerated: d.data.draftsGenerated,
                gatesGenerated: d.data.gatesGenerated,
                pagesPublished: d.data.pagesPublished,
                pagesUpdated: d.data.pagesUpdated,
              },
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline başarısız");
    } finally {
      setPipelineLoading(false);
    }
  };

  const loadPublishedForJob = async (jobId: string) => {
    try {
      const r = await fetch(`/api/page-factory/universe/jobs/${jobId}/run-pipeline`);
      const d = await r.json();
      if (d.success) {
        setPublishedPages(
          (d.data.publishedPages || []).map((p: { path: string; title: string }) => ({
            path: p.path,
            title: p.title,
          }))
        );
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-600 p-2 text-white">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Universe Generator</h2>
            <p className="text-sm text-gray-600 mt-1">
              Ürünlerden otomatik SEO/GEO/AEO sayfa evreni üretir. Bu sistem ürün satmaz — sayfa üretir.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Toplam Ürün", value: stats.totalProducts, icon: Package },
            { label: "Tahmini Blueprint", value: stats.estimatedBlueprints, icon: Sparkles },
            { label: "Üretilen Blueprint", value: stats.generatedBlueprints, icon: CheckCircle2 },
            { label: "GEO Sayısı", value: stats.geoCount, icon: MapPin },
            { label: "Intent Sayısı", value: stats.intentCount, icon: Globe },
            { label: "FAQ Sayısı", value: stats.faqCount, icon: HelpCircle },
            {
              label: "Son Job",
              value: stats.lastJob ? stats.lastJob.status : "—",
              icon: RefreshCw,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                <Icon size={12} />
                {label}
              </div>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {typeof value === "number" ? value.toLocaleString("tr-TR") : value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Ayarlar</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block text-xs text-gray-600">
            Proje
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Seçin…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-600">
            Kaynak
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {UNIVERSE_SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-gray-600">
            Min Kalite
            <input
              type="number"
              min={0}
              max={100}
              value={minQuality}
              onChange={(e) => setMinQuality(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-gray-600">
            Batch Limit (max 1000)
            <input
              type="number"
              min={1}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-gray-600 md:col-span-2">
            Seçili Ürün ID&apos;leri (virgülle, boş = tümü)
            <input
              type="text"
              value={productIds}
              onChange={(e) => setProductIds(e.target.value)}
              placeholder="prod_abc, prod_xyz"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 pt-5">
            <input
              type="checkbox"
              checked={includeGeo}
              onChange={(e) => setIncludeGeo(e.target.checked)}
              className="rounded"
            />
            GEO expansion (Top 20 şehir)
          </label>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-800 flex items-center gap-1.5">
            <GitBranch size={14} /> Pipeline Auto Run
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRunPipeline}
                onChange={(e) => setAutoRunPipeline(e.target.checked)}
                className="rounded"
              />
              Blueprint üretince pipeline çalıştır
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoPublishInternal}
                onChange={(e) => setAutoPublishInternal(e.target.checked)}
                disabled={!autoRunPipeline}
                className="rounded"
              />
              Gate geçerse iç yayına al
            </label>
            <label className="block text-xs text-gray-600">
              Pipeline limit
              <input
                type="number"
                min={1}
                max={1000}
                value={pipelineLimit}
                onChange={(e) => setPipelineLimit(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              Min publish score
              <input
                type="number"
                min={0}
                max={100}
                value={minPublishScore}
                onChange={(e) => setMinPublishScore(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={runPreview}
            disabled={previewing || !projectId}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          >
            {previewing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            Preview Universe
          </button>
          <button
            type="button"
            onClick={() => runGenerate("full")}
            disabled={loading || !projectId}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Generate Universe
          </button>
          <button
            type="button"
            onClick={() => runGenerate("selected")}
            disabled={loading || !projectId || !productIds.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Generate Selected Products
          </button>
          <button
            type="button"
            onClick={() => runGenerate("geo_only")}
            disabled={loading || !projectId}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            <MapPin size={16} />
            Generate Geo Only
          </button>
          <button
            type="button"
            onClick={() => runGenerate("faq_only")}
            disabled={loading || !projectId}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            <HelpCircle size={16} />
            Generate FAQ Only
          </button>
        </div>
      </div>

      {preview && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Preview Sonucu</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Ürün:</span>{" "}
              <strong>{preview.totalProducts}</strong>
            </div>
            <div>
              <span className="text-gray-500">Tahmini Blueprint:</span>{" "}
              <strong>{preview.estimatedBlueprints}</strong>
            </div>
            <div>
              <span className="text-gray-500">Min/Ürün:</span>{" "}
              <strong>{preview.perProductMin}</strong>
            </div>
            <div>
              <span className="text-gray-500">Duplicate:</span>{" "}
              <strong>{preview.duplicateCount}</strong>
            </div>
          </div>
          {preview.sampleBlueprints.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-3">Tip</th>
                    <th className="py-2 pr-3">Başlık</th>
                    <th className="py-2">Slug</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleBlueprints.slice(0, 10).map((s, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-3 font-mono text-violet-600">{s.pageType}</td>
                      <td className="py-2 pr-3">{s.title}</td>
                      <td className="py-2 font-mono text-gray-600">{s.slug}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Üretim Tamamlandı
          </h3>
          <p className="text-sm text-emerald-800">
            Job <code className="text-xs">{result.jobId}</code> — {result.generatedBlueprints} blueprint
            ({result.updatedBlueprints} güncelleme) · GEO: {result.geoCount} · Intent: {result.intentCount} · FAQ:{" "}
            {result.faqCount}
          </p>
          {result.errorCount > 0 && (
            <p className="text-sm text-amber-700">{result.errorCount} ürün hata aldı (diğerleri devam etti)</p>
          )}
          {result.pipelineResult && (
            <p className="text-sm text-indigo-800">
              Pipeline: {result.pipelineResult.processedBlueprints} işlendi · AEO: {result.pipelineResult.aeoGenerated} ·
              Draft: {result.pipelineResult.draftsGenerated} · Gate: {result.pipelineResult.gatesGenerated} · Yayın:{" "}
              {result.pipelineResult.pagesPublished + result.pipelineResult.pagesUpdated}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => runPipelineForJob(result.jobId)}
              disabled={pipelineLoading}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              {pipelineLoading ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
              Bu job&apos;ı pipeline&apos;a gönder
            </button>
            <button
              type="button"
              onClick={() => loadPublishedForJob(result.jobId)}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
            >
              <ExternalLink size={14} />
              Yayınlanan sayfaları gör
            </button>
          </div>
          {publishedPages.length > 0 && (
            <ul className="text-xs text-emerald-900 space-y-1 pt-2">
              {publishedPages.map((p) => (
                <li key={p.path}>
                  <a href={p.path} target="_blank" rel="noreferrer" className="hover:underline font-mono">
                    {p.path}
                  </a>
                  <span className="text-gray-500"> — {p.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {stats?.lastJob && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Son job: <code className="text-xs">{stats.lastJob.id}</code> · {stats.lastJob.generatedBlueprints} blueprint ·{" "}
            {stats.lastJob.status}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => runPipelineForJob(stats.lastJob!.id)}
              disabled={pipelineLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              Pipeline&apos;a gönder
            </button>
            <button
              type="button"
              onClick={() => loadPublishedForJob(stats.lastJob!.id)}
              className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              Yayınlanan sayfalar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
