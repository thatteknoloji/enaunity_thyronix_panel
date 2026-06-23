"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Calculator,
  Sparkles,
  Trash2,
  Eye,
  AlertTriangle,
  Save,
} from "lucide-react";
import { DEFAULT_UNIVERSE_CONFIG, type UniverseConfig, type UniverseGeoLevel } from "@/lib/page-factory/types";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Industry = { id: string; name: string };
type Category = { id: string; name: string; industryId: string };
type Intent = { id: string; name: string };
type Province = { id: string; name: string; plateCode: string };
type BlueprintRow = {
  title: string;
  slug: string;
  geoPath: string;
  industryPath: string;
  intent: string;
  pageType: string;
  status: string;
};

type EstimateData = {
  estimatedTotal: number;
  previewBlueprints: BlueprintRow[];
  warnings: string[];
  estimate: {
    riskLevel: string;
    riskLabel: string;
    counts: Record<string, number>;
    formula: string;
    canGenerate: boolean;
  };
};

type Props = {
  projectId: string;
  sector: string;
  onGenerated?: () => void;
};

const GEO_LEVELS: { id: UniverseGeoLevel; label: string }[] = [
  { id: "province", label: "İl" },
  { id: "district", label: "İlçe" },
  { id: "neighborhood", label: "Mahalle" },
  { id: "village", label: "Köy" },
];

const RISK_COLORS: Record<string, string> = {
  safe: "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  critical: "text-red-600 bg-red-50 border-red-200",
  blocked: "text-red-700 bg-red-100 border-red-300",
};

export function BlueprintUniverseTab({ projectId, sector, onGenerated }: Props) {
  const [config, setConfig] = useState<UniverseConfig>({ ...DEFAULT_UNIVERSE_CONFIG });
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [savedBlueprints, setSavedBlueprints] = useState<BlueprintRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRefs = useCallback(async () => {
    try {
      const [indD, intD, geoD] = await Promise.all([
        fetchPageFactoryJson<{ items: Industry[] }>("/api/page-factory/industries?limit=50"),
        fetchPageFactoryJson<{ items: Intent[] }>("/api/page-factory/intents?limit=50"),
        fetchPageFactoryJson<{ items: Province[] }>("/api/page-factory/geo?level=province&country=TR&limit=100"),
      ]);
      if (indD.success) setIndustries(indD.data?.items || []);
      if (intD.success) setIntents(intD.data?.items || []);
      if (geoD.success) {
        setSavedBlueprints([]);
        setProvinces(geoD.data?.items || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Referans verileri yüklenemedi");
    }
  }, []);

  const loadCategories = useCallback(async (industryId: string) => {
    if (!industryId) {
      setCategories([]);
      return;
    }
    const d = await fetchPageFactoryJson<{ categories: { items: Category[] } }>(
      `/api/page-factory/industries?includeCategories=true&industryId=${industryId}&limit=100`
    );
    if (d.success && d.data?.categories?.items) {
      setCategories(d.data.categories.items);
    }
  }, []);

  const loadSavedBlueprints = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ items: BlueprintRow[] }>(
      `/api/page-factory/projects/${projectId}/blueprints?limit=20`
    );
    if (d.success) setSavedBlueprints(d.data?.items || []);
  }, [projectId]);

  useEffect(() => {
    loadRefs();
    loadSavedBlueprints();
  }, [loadRefs, loadSavedBlueprints]);

  useEffect(() => {
    if (config.selectedIndustryId) loadCategories(config.selectedIndustryId);
  }, [config.selectedIndustryId, loadCategories]);

  const toggleGeoLevel = (level: UniverseGeoLevel) => {
    setConfig((c) => {
      const has = c.selectedGeoLevels.includes(level);
      const selectedGeoLevels = has
        ? c.selectedGeoLevels.filter((l) => l !== level)
        : [...c.selectedGeoLevels, level];
      return { ...c, selectedGeoLevels: selectedGeoLevels.length ? selectedGeoLevels : [level] };
    });
  };

  const toggleId = (key: keyof UniverseConfig, id: string) => {
    setConfig((c) => {
      const arr = c[key] as string[];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...c, [key]: next };
    });
  };

  const runEstimate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const d = await fetchPageFactoryJson(`/api/page-factory/projects/${projectId}/universe/estimate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!d.success) throw new Error(d.error || "Tahmin başarısız");
      setEstimate(d.data as EstimateData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tahmin başarısız");
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async () => {
    if (!confirm("Blueprintler veritabanına kaydedilecek. Devam?")) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const d = await fetchPageFactoryJson(`/api/page-factory/projects/${projectId}/universe/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!d.success) throw new Error(d.error || "Generate başarısız");
      setSuccess(`${(d.data as { generated: number }).generated.toLocaleString("tr-TR")} blueprint kaydedildi`);
      await loadSavedBlueprints();
      onGenerated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate başarısız");
    } finally {
      setLoading(false);
    }
  };

  const runClear = async () => {
    if (!confirm("Tüm blueprint kayıtları silinecek. Emin misiniz?")) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson(`/api/page-factory/projects/${projectId}/blueprints`, { method: "DELETE" });
      if (!d.success) throw new Error(d.error || "Silinemedi");
      setSavedBlueprints([]);
      setSuccess(`${(d.data as { deleted: number }).deleted} blueprint silindi`);
      onGenerated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setLoading(false);
    }
  };

  const counts = estimate?.estimate.counts;
  const riskLevel = estimate?.estimate.riskLevel || "safe";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">Blueprint Universe V2</p>
        <p className="text-sm text-gray-500">GEO × sektör × niyet kombinasyonları — içerik üretimi yok</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Evren Ayarları</h3>

          <div>
            <label className="text-xs text-gray-500">Sektör</label>
            <select
              value={config.selectedIndustryId || ""}
              onChange={(e) => setConfig({ ...config, selectedIndustryId: e.target.value, selectedCategoryIds: [] })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Otomatik: {sector}</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Kategoriler ({config.selectedCategoryIds.length} seçili)</label>
            <div className="mt-1 max-h-24 overflow-y-auto rounded-lg border p-2 space-y-1">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={config.selectedCategoryIds.includes(c.id)} onChange={() => toggleId("selectedCategoryIds", c.id)} />
                  {c.name}
                </label>
              ))}
              {categories.length === 0 && <p className="text-xs text-gray-400">Sektör seçin veya tahmin sırasında tümü kullanılır</p>}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Niyetler ({config.selectedIntentIds.length} seçili)</label>
            <div className="mt-1 max-h-24 overflow-y-auto rounded-lg border p-2 space-y-1">
              {intents.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={config.selectedIntentIds.includes(i.id)} onChange={() => toggleId("selectedIntentIds", i.id)} />
                  {i.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">GEO Seviyeleri</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {GEO_LEVELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleGeoLevel(l.id)}
                  className={`rounded-lg px-3 py-1 text-xs border ${config.selectedGeoLevels.includes(l.id) ? "border-violet-400 bg-violet-50 text-violet-800" : "border-gray-200 text-gray-600"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">İller ({config.selectedProvinceIds.length} seçili — boş = tümü)</label>
            <div className="mt-1 max-h-28 overflow-y-auto rounded-lg border p-2 grid grid-cols-2 gap-1">
              {provinces.slice(0, 81).map((p) => (
                <label key={p.id} className="flex items-center gap-1 text-[10px] cursor-pointer truncate">
                  <input type="checkbox" checked={config.selectedProvinceIds.includes(p.id)} onChange={() => toggleId("selectedProvinceIds", p.id)} />
                  {p.plateCode} {p.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config.includeFaq} onChange={(e) => setConfig({ ...config, includeFaq: e.target.checked })} />
              FAQ dahil
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config.includeLocalModifiers} onChange={(e) => setConfig({ ...config, includeLocalModifiers: e.target.checked })} />
              Local modifier
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Generation limit</label>
              <input type="number" value={config.generationLimit} onChange={(e) => setConfig({ ...config, generationLimit: +e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Batch size</label>
              <input type="number" value={config.batchSize} onChange={(e) => setConfig({ ...config, batchSize: +e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {estimate && (
            <>
              <div className={`rounded-xl border p-4 ${RISK_COLORS[riskLevel] || RISK_COLORS.safe}`}>
                <p className="text-xs uppercase tracking-wide opacity-80">Tahmini Toplam Blueprint</p>
                <p className="text-3xl font-bold">{estimate.estimatedTotal.toLocaleString("tr-TR")}</p>
                <p className="text-sm mt-1">Risk: {estimate.estimate.riskLabel}</p>
                <p className="text-xs mt-2 opacity-70">{estimate.estimate.formula}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { k: "provinces", l: "İl" },
                  { k: "districts", l: "İlçe" },
                  { k: "neighborhoods", l: "Mahalle" },
                  { k: "categories", l: "Kategori" },
                  { k: "intents", l: "Niyet" },
                  { k: "geoNodes", l: "GEO Düğüm" },
                ].map(({ k, l }) => (
                  <div key={k} className="rounded-lg border border-gray-200 bg-white p-2 text-center">
                    <p className="text-lg font-bold text-gray-900">{counts?.[k] ?? 0}</p>
                    <p className="text-[10px] text-gray-500">{l}</p>
                  </div>
                ))}
              </div>

              {estimate.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                  {estimate.warnings.map((w) => (
                    <p key={w} className="flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{w}</p>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={loading} onClick={runEstimate} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
              Tahmin Et
            </button>
            <button type="button" disabled={loading || !estimate?.estimate.canGenerate} onClick={runGenerate} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Blueprintleri Kaydet
            </button>
            <button type="button" disabled={loading} onClick={runClear} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={14} /> Temizle
            </button>
          </div>
        </div>
      </div>

      {(estimate?.previewBlueprints?.length || savedBlueprints.length) ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-600 flex items-center gap-1">
              <Eye size={14} /> Blueprint Önizleme / Kayıtlı
            </p>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2 px-3">Başlık</th>
                  <th className="py-2 px-3">Slug</th>
                  <th className="py-2 px-3">GEO</th>
                  <th className="py-2 px-3">Sektör</th>
                  <th className="py-2 px-3">Niyet</th>
                  <th className="py-2 px-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {(savedBlueprints.length ? savedBlueprints : estimate?.previewBlueprints || []).slice(0, 30).map((bp, i) => (
                  <tr key={bp.slug || i} className="border-b border-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900 max-w-[200px] truncate">{bp.title}</td>
                    <td className="py-2 px-3 text-gray-500 font-mono truncate max-w-[120px]">{bp.slug}</td>
                    <td className="py-2 px-3 text-gray-600 truncate max-w-[140px]">{bp.geoPath}</td>
                    <td className="py-2 px-3 text-gray-600 truncate max-w-[100px]">{bp.industryPath}</td>
                    <td className="py-2 px-3">{bp.intent}</td>
                    <td className="py-2 px-3"><span className="rounded bg-gray-100 px-1.5 py-0.5">{bp.status || bp.pageType}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
