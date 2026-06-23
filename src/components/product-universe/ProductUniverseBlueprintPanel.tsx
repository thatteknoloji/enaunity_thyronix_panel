"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, Save, Layers } from "lucide-react";
import { ProductUniverseAeoSection } from "./ProductUniverseAeoSection";
import { ProductUniverseContentDraftSection } from "./ProductUniverseContentDraftSection";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Project = { id: string; name: string };

type BlueprintDraft = {
  kind: string;
  title: string;
  pageType: string;
  hierarchyLevel: number;
  clusterPath: string;
  slug: string;
  metadata: Record<string, unknown>;
};

type Props = {
  productId: string;
  productName: string;
  qualityScore: number;
  projects: Project[];
  mode: "admin" | "dealer";
  defaultProjectId?: string;
};

export function ProductUniverseBlueprintPanel({
  productId,
  productName,
  qualityScore,
  projects,
  mode,
  defaultProjectId = "",
}: Props) {
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [includeProductPage, setIncludeProductPage] = useState(true);
  const [includeCategoryPage, setIncludeCategoryPage] = useState(true);
  const [includeIntentPages, setIncludeIntentPages] = useState(true);
  const [includeFaqPage, setIncludeFaqPage] = useState(true);
  const [includeGeoFusion, setIncludeGeoFusion] = useState(false);
  const [minQualityScore, setMinQualityScore] = useState(70);
  const [maxGenerate, setMaxGenerate] = useState(mode === "admin" ? 500 : 100);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    drafts: BlueprintDraft[];
    warnings: string[];
    duplicateWarnings: string[];
    canSave: boolean;
    previewOnly: boolean;
    estimatedTotal: number;
  } | null>(null);
  const [savedBlueprints, setSavedBlueprints] = useState<Array<{
    id: string;
    title: string;
    pageType: string;
    hierarchyLevel: number;
    metadata: Record<string, unknown> & {
      aeo?: { aeoQualityScore?: number; version?: string };
      contentDraft?: { publishScore?: number; draftId?: string; version?: string };
      contentStatus?: string;
    };
  }>>([]);

  const loadSaved = useCallback(async () => {
    if (!projectId) return;
    const d = await fetchPageFactoryJson<{ items: typeof savedBlueprints }>(
      `/api/product-universe/blueprints?projectId=${projectId}&productId=${productId}&limit=50`
    );
    if (d.success) setSavedBlueprints(d.data?.items || []);
  }, [projectId, productId]);

  useEffect(() => {
    if (projectId) loadSaved();
  }, [projectId, loadSaved]);

  useEffect(() => {
    if (defaultProjectId && !projectId) setProjectId(defaultProjectId);
  }, [defaultProjectId, projectId]);

  const buildBody = (dryRun: boolean) => ({
    projectId,
    includeProductPage,
    includeCategoryPage,
    includeIntentPages,
    includeFaqPage,
    includeGeoFusion,
    minQualityScore,
    maxGenerate,
    dryRun,
  });

  const handlePreview = async () => {
    if (!projectId) {
      setError("Proje seçin");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson(`/api/product-universe/products/${productId}/blueprints/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(true)),
      });
      if (!d.success) throw new Error(d.error || "Önizleme başarısız");
      setPreview(d.data as typeof preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!projectId) {
      setError("Proje seçin");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson<{ warnings?: string[] }>(
        `/api/product-universe/products/${productId}/blueprints/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody(false)),
        }
      );
      if (!d.success) throw new Error(d.error || "Kayıt başarısız");
      await loadSaved();
      setPreview((prev) =>
        prev
          ? {
              ...prev,
              warnings: [...(prev.warnings || []), ...(d.data?.warnings || [])],
            }
          : null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Layers size={14} className="text-violet-600" />
        <span>Product Universe V2 · Blueprint Bridge</span>
        <span className={`ml-auto font-medium ${qualityScore >= 70 ? "text-emerald-600" : qualityScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
          Kalite: {qualityScore}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] text-gray-500">Page Factory Projesi</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="">— Seçin —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500">Min Kalite Skoru</label>
          <input
            type="number"
            min={0}
            max={100}
            value={minQualityScore}
            onChange={(e) => setMinQualityScore(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">Max Generate</label>
          <input
            type="number"
            min={1}
            max={mode === "admin" ? 1000 : 200}
            value={maxGenerate}
            onChange={(e) => setMaxGenerate(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={includeProductPage} onChange={(e) => setIncludeProductPage(e.target.checked)} />
          Product page
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={includeCategoryPage} onChange={(e) => setIncludeCategoryPage(e.target.checked)} />
          Category page
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={includeIntentPages} onChange={(e) => setIncludeIntentPages(e.target.checked)} />
          Intent pages
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={includeFaqPage} onChange={(e) => setIncludeFaqPage(e.target.checked)} />
          FAQ page
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={includeGeoFusion} onChange={(e) => setIncludeGeoFusion(e.target.checked)} />
          GEO fusion
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading || !projectId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 text-violet-700 px-3 py-2 text-xs font-medium hover:bg-violet-200 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          Önizle
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !projectId || qualityScore < minQualityScore}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 text-white px-3 py-2 text-xs font-medium hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Blueprintleri Kaydet
        </button>
      </div>

      {preview && (
        <div className="rounded-lg border border-violet-100 bg-violet-50/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-violet-800">
            Önizleme — {preview.estimatedTotal} blueprint
            {preview.previewOnly && " (kayıt yapılamaz)"}
          </p>
          {preview.warnings?.map((w) => (
            <p key={w} className="text-[10px] text-amber-700">{w}</p>
          ))}
          {preview.duplicateWarnings?.map((w) => (
            <p key={w} className="text-[10px] text-orange-600">{w}</p>
          ))}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {preview.drafts.map((d) => (
              <div key={`${d.pageType}-${d.slug}`} className="text-[10px] bg-white rounded px-2 py-1.5 border border-gray-100">
                <p className="font-medium text-gray-900">{d.title}</p>
                <p className="text-gray-500">{d.pageType} · L{d.hierarchyLevel} · {d.slug}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {savedBlueprints.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Kayıtlı Blueprintler ({savedBlueprints.length})</p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {savedBlueprints.map((bp) => (
              <div key={bp.id} className="text-[10px] bg-gray-50 rounded px-2 py-1.5">
                <p className="font-medium">{bp.title}</p>
                <p className="text-gray-500">{bp.pageType} · skor {String(bp.metadata.qualityScore ?? "—")}</p>
                <ProductUniverseAeoSection
                  blueprintId={bp.id}
                  blueprintTitle={bp.title}
                  initialAeoScore={bp.metadata.aeo?.aeoQualityScore ?? null}
                  hasAeo={bp.metadata.aeo?.version === "AEO_LAYER_V1"}
                />
                <ProductUniverseContentDraftSection
                  blueprintId={bp.id}
                  blueprintTitle={bp.title}
                  draftId={(bp.metadata.contentDraft as { draftId?: string })?.draftId}
                  initialPublishScore={bp.metadata.contentDraft?.publishScore ?? null}
                  draftStatus={bp.metadata.contentStatus || null}
                  gateStatus={(bp.metadata.publishGate as { status?: string })?.status ?? null}
                  gateScore={(bp.metadata.publishGate as { score?: number })?.score ?? null}
                  hasDraft={bp.metadata.contentDraft?.version === "PAGE_FACTORY_V3"}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        {productName} — içerik üretilmez, yalnızca PageFactoryBlueprint kaydı oluşturulur.
      </p>
    </div>
  );
}
