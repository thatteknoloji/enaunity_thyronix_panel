"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Layers,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import { BLUEPRINT_TYPE_OPTIONS } from "@/lib/product-universe/blueprint-batch-types";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Project = { id: string; name: string };

type PreviewResult = {
  totalCandidates: number;
  eligibleProducts: number;
  skippedProducts: number;
  estimatedBlueprints: number;
  duplicateCount: number;
  byBlueprintType: Record<string, number>;
  sampleBlueprints: Array<{
    productName: string;
    blueprintType: string;
    title: string;
    slug: string;
    qualityScore: number;
    priorityScore: number;
  }>;
  warnings: string[];
};

type GenerateResult = {
  jobId: string;
  generatedCount: number;
  skippedCount: number;
  duplicateCount: number;
  errorCount: number;
  warnings: string[];
  dryRun: boolean;
};

type BatchJob = {
  id: string;
  projectId: string | null;
  status: string;
  totalCandidates: number;
  generatedCount: number;
  skippedCount: number;
  duplicateCount: number;
  errorCount: number;
  createdAt: string;
};

type Props = {
  projects: Project[];
  mode: "admin" | "dealer";
};

export function ProductUniverseBlueprintBatchPanel({ projects, mode }: Props) {
  const [projectId, setProjectId] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [minQuality, setMinQuality] = useState(70);
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [limit, setLimit] = useState(mode === "admin" ? 100 : 50);
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [blueprintTypes, setBlueprintTypes] = useState<string[]>([
    "product_detail",
    "product_faq",
  ]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildBody = (dryRun: boolean) => ({
    projectId: projectId || undefined,
    sourceType: sourceType || undefined,
    category: category || undefined,
    brand: brand || undefined,
    minQualityScore: minQuality,
    onlyWithImages,
    onlyInStock,
    limit,
    duplicateMode,
    blueprintTypes,
    dryRun,
  });

  const loadJobs = useCallback(async () => {
    try {
      const r = await fetch("/api/product-universe/blueprints/batch/jobs?limit=10");
      const d = await r.json();
      if (d.success) setJobs(d.data.items || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const r = await fetch("/api/product-universe/blueprints/batch/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(true)),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Önizleme başarısız");
      setPreview(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async (dryRun: boolean) => {
    if (!dryRun && !projectId) {
      setError("Üretim için proje seçin");
      return;
    }
    setLoading(true);
    setError(null);
    if (!dryRun) setResult(null);
    try {
      const r = await fetch("/api/product-universe/blueprints/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(dryRun)),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Üretim başarısız");
      setResult(d.data);
      if (!dryRun) await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Üretim başarısız");
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (t: string) => {
    setBlueprintTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-violet-50/50 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Layers size={16} className="text-violet-600" />
          Blueprint Batch V1
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          BLUEPRINT_READY ürünleri PageFactoryBlueprint evrenine toplu aktar
        </p>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Proje">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">— Seçin —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Kaynak Tipi">
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Tümü</option>
              <option value="TRENDYOL">Trendyol</option>
              <option value="CSV">CSV</option>
              <option value="XLSX">XLSX</option>
              <option value="MANUAL">Manuel</option>
            </select>
          </Field>
          <Field label="Kategori">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Kategori filtresi"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Marka">
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Marka filtresi"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Min Kalite">
            <input
              type="number"
              min={70}
              max={100}
              value={minQuality}
              onChange={(e) => setMinQuality(parseInt(e.target.value, 10) || 70)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label={`Limit (max ${mode === "admin" ? 5000 : 500})`}>
            <input
              type="number"
              min={1}
              max={mode === "admin" ? 5000 : 500}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10) || 100)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Duplicate">
            <select
              value={duplicateMode}
              onChange={(e) => setDuplicateMode(e.target.value as "skip" | "update")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="skip">Atla (skip)</option>
              <option value="update">Güncelle (update)</option>
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={onlyWithImages} onChange={(e) => setOnlyWithImages(e.target.checked)} />
            Sadece görselli
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
            Sadece stokta olanlar
          </label>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">Blueprint türleri</p>
          <div className="flex flex-wrap gap-2">
            {BLUEPRINT_TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  blueprintTypes.includes(t)
                    ? "bg-violet-100 border-violet-300 text-violet-800"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={runPreview}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            Önizle
          </button>
          <button
            type="button"
            disabled={loading || !projectId}
            onClick={() => runGenerate(false)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Üret
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={loadJobs}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Jobs
          </button>
        </div>

        {preview && (
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-700">Dry-run Önizleme (DB&apos;ye yazılmaz)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <Stat label="Aday" value={preview.totalCandidates} />
              <Stat label="Uygun" value={preview.eligibleProducts} />
              <Stat label="Tahmini BP" value={preview.estimatedBlueprints} />
              <Stat label="Duplicate" value={preview.duplicateCount} color="amber" />
            </div>
            {Object.keys(preview.byBlueprintType).length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(preview.byBlueprintType).map(([k, v]) => (
                  <span key={k} className="rounded bg-white border px-2 py-0.5">{k}: {v}</span>
                ))}
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div className="text-xs text-amber-700 space-y-1">
                {preview.warnings.map((w) => (
                  <p key={w} className="flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5" /> {w}
                  </p>
                ))}
              </div>
            )}
            {preview.sampleBlueprints.length > 0 && (
              <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded-lg bg-white">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-gray-500">
                      <th className="py-2 px-2">Ürün</th>
                      <th className="py-2 px-2">Tip</th>
                      <th className="py-2 px-2">Başlık</th>
                      <th className="py-2 px-2">Kalite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleBlueprints.map((s, i) => (
                      <tr key={`${s.slug}-${i}`} className="border-t">
                        <td className="py-1.5 px-2 truncate max-w-[120px]">{s.productName}</td>
                        <td className="py-1.5 px-2">{s.blueprintType}</td>
                        <td className="py-1.5 px-2 truncate max-w-[160px]">{s.title}</td>
                        <td className="py-1.5 px-2">{s.qualityScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {result && !result.dryRun && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 size={16} />
              Batch tamamlandı — Job {result.jobId}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Stat label="Üretilen" value={result.generatedCount} color="emerald" />
              <Stat label="Atlanan" value={result.skippedCount} />
              <Stat label="Duplicate" value={result.duplicateCount} color="amber" />
              <Stat label="Hata" value={result.errorCount} color="red" />
            </div>
          </div>
        )}

        {jobs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Job Geçmişi</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-2">ID</th>
                    <th className="py-2 pr-2">Durum</th>
                    <th className="py-2 pr-2">Aday</th>
                    <th className="py-2 pr-2">Üretilen</th>
                    <th className="py-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="border-b border-gray-50">
                      <td className="py-2 pr-2 font-mono">{j.id.slice(0, 8)}…</td>
                      <td className="py-2 pr-2">{j.status}</td>
                      <td className="py-2 pr-2">{j.totalCandidates}</td>
                      <td className="py-2 pr-2">{j.generatedCount}</td>
                      <td className="py-2">{new Date(j.createdAt).toLocaleString("tr-TR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "emerald" | "amber" | "red";
}) {
  const cls =
    color === "emerald" ? "text-emerald-700" : color === "amber" ? "text-amber-700" : color === "red" ? "text-red-700" : "text-gray-900";
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-2">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
