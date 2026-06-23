"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  GitBranch,
  Globe,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import { MAPPING_FIELD_DEFS } from "@/lib/product-universe/import-types";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

const SOURCE_TYPES = [
  { value: "TRENDYOL_EXCEL", label: "Trendyol Excel" },
  { value: "SUPPLIER_EXCEL", label: "Tedarikçi Excel" },
  { value: "CSV", label: "CSV" },
  { value: "JSON", label: "JSON" },
  { value: "XLSX", label: "XLSX" },
  { value: "MANUAL", label: "Manuel Katalog" },
];

type Project = { id: string; name: string };

type PreviewData = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningCount: number;
  duplicateInFile: number;
  duplicateInDb: number;
  imageUrlCount: number;
  productsWithImages: number;
  productsWithDescription: number;
  averageQualityScore: number;
  blueprintReadyEstimate: number;
  analyzedEstimate: number;
  rejectedEstimate: number;
  columns: string[];
  columnSamples: Record<string, string[]>;
  columnMapping: Record<string, string>;
  previewRows: Array<{
    rowIndex: number;
    rawName: string;
    brand: string;
    stockCode: string;
    qualityScore: number;
    status: string;
    imageCount: number;
    descriptionClean: string;
    rowWarnings: string[];
  }>;
  warnings: string[];
  errors: Array<{ row: number; message: string }>;
};

type CommitResult = {
  jobId: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  importedProductIds?: string[];
  warnings: string[];
  errors?: string[];
  sampleProducts: Array<{ rawName: string; qualityScore?: number; status?: string }>;
  automation?: {
    universeJobId?: string;
    generatedBlueprints?: number;
    pipelineJobId?: string;
    pipelineResult?: {
      processedBlueprints: number;
      draftsGenerated: number;
      gatesGenerated: number;
      pagesPublished: number;
      pagesUpdated: number;
    };
    warnings: string[];
  } | null;
};

type Template = { id: string; name: string; sourceType: string; mappingJson: string };

type Props = {
  projects: Project[];
  mode: "admin" | "dealer";
  onComplete?: () => void;
};

const STEPS = ["Dosya", "Mapping", "Önizleme", "Ayarlar", "Sonuç"];

export function ProductUniverseImportWizard({ projects, mode, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("CSV");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [columns, setColumns] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");

  const [projectId, setProjectId] = useState("");
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update" | "create_new">("skip");
  const [runAnalysis, setRunAnalysis] = useState(true);
  const [autoGenerateUniverse, setAutoGenerateUniverse] = useState(false);
  const [autoRunPipeline, setAutoRunPipeline] = useState(false);
  const [autoPublishInternal, setAutoPublishInternal] = useState(false);
  const [pipelineLimit, setPipelineLimit] = useState(100);
  const [minPublishScore, setMinPublishScore] = useState(70);
  const [includeGeo, setIncludeGeo] = useState(false);
  const [minQuality, setMinQuality] = useState<number | "">("");
  const [limit, setLimit] = useState(mode === "admin" ? 1000 : 500);
  const [columnSamples, setColumnSamples] = useState<Record<string, string[]>>({});

  const loadTemplates = useCallback(async () => {
    try {
      const d = await fetchPageFactoryJson<Template[]>("/api/product-universe/import/templates");
      if (d.success) setTemplates(d.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const runPreview = async (mapping?: Record<string, string>) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (mapping) fd.append("mapping", JSON.stringify(mapping));
      const d = await fetchPageFactoryJson<PreviewData>("/api/product-universe/excel/preview", { method: "POST", body: fd });
      if (!d.success) throw new Error(d.error || "Önizleme başarısız");
      setPreview(d.data || null);
      setColumns(d.data?.columns || []);
      setColumnMapping(d.data?.columnMapping || {});
      setColumnSamples(d.data?.columnSamples || {});
      return d.data || null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme başarısız");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleFileNext = async () => {
    const data = await runPreview();
    if (data) setStep(1);
  };

  const handleMappingNext = async () => {
    const data = await runPreview(columnMapping);
    if (data) setStep(2);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      setError("Şablon adı girin");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson("/api/product-universe/import/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName, sourceType, mapping: columnMapping }),
      });
      if (!d.success) throw new Error(d.error || "Şablon kaydedilemedi");
      setTemplateName("");
      await loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şablon kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (t: Template) => {
    try {
      const mapping = JSON.parse(t.mappingJson);
      setColumnMapping(mapping);
      setSourceType(t.sourceType || sourceType);
    } catch {
      setError("Şablon mapping geçersiz");
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    if ((autoGenerateUniverse || autoRunPipeline || autoPublishInternal) && !projectId) {
      setError("Otomasyon için Page Factory projesi seçin");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sourceType", sourceType);
      fd.append("mapping", JSON.stringify(columnMapping));
      fd.append("duplicateMode", duplicateMode);
      fd.append("runAnalysis", String(runAnalysis));
      fd.append("limit", String(limit));
      fd.append("dryRun", "false");
      fd.append("autoGenerateUniverse", String(autoGenerateUniverse));
      fd.append("autoRunPipeline", String(autoRunPipeline));
      fd.append("autoPublishInternal", String(autoPublishInternal));
      fd.append("pipelineLimit", String(pipelineLimit));
      fd.append("minPublishScore", String(minPublishScore));
      fd.append("includeGeo", String(includeGeo));
      fd.append("stopOnError", "false");
      if (minQuality !== "") fd.append("minQuality", String(minQuality));
      if (projectId) fd.append("projectId", projectId);
      const d = await fetchPageFactoryJson<CommitResult>("/api/product-universe/excel/commit", { method: "POST", body: fd });
      if (!d.success) throw new Error(d.error || "Import başarısız");
      setResult(d.data || null);
      setStep(4);
      onComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import başarısız");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    window.open("/api/product-universe/import/template", "_blank");
  };

  const fieldOptions = MAPPING_FIELD_DEFS.map((f) => ({
    value: f.key,
    label: f.label,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Excel Import</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Excel/CSV/Trendyol → Product Universe → Universe → Pipeline → Published Page
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={14} />
            Örnek Excel indir
          </button>
        </div>
        <div className="flex gap-1 mt-4">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 text-center text-[10px] font-medium py-1.5 rounded ${
                i === step
                  ? "bg-violet-600 text-white"
                  : i < step
                    ? "bg-violet-100 text-violet-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500">Kaynak Tipi</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Dosya (.xlsx / .xls / .csv / .json)</label>
                <input
                  type="file"
                  accept=".csv,.json,.xlsx,.xls"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setPreview(null);
                    setResult(null);
                    setStep(0);
                  }}
                  className="mt-1 w-full text-sm"
                />
              </div>
            </div>
            {file && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <FileSpreadsheet size={14} />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <button
              type="button"
              disabled={!file || loading}
              onClick={handleFileNext}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              Kolonları Algıla
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Zorunlu minimum: <strong>Ürün Adı</strong> veya <strong>SKU</strong>. Fiyat/stok yoksa uyarı verilir.
            </p>
            {templates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {templates.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-100 rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="py-2 px-3">Excel Kolonu</th>
                    <th className="py-2 px-3">Örnek Değerler</th>
                    <th className="py-2 px-3">Sistem Önerisi</th>
                    <th className="py-2 px-3">Eşleşen Alan</th>
                  </tr>
                </thead>
                <tbody>
                  {(columns.length ? columns : Object.keys(columnMapping)).map((col) => {
                    const samples = columnSamples[col] || [];
                    const suggested = columnMapping[col] || "_skip";
                    const suggestedLabel =
                      fieldOptions.find((f) => f.value === suggested)?.label || "Yok say";
                    return (
                    <tr key={col} className="border-t border-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-800">{col}</td>
                      <td className="py-2 px-3 text-gray-500 max-w-[180px]">
                        {samples.length ? (
                          <ul className="space-y-0.5">
                            {samples.map((s) => (
                              <li key={s} className="truncate" title={s}>{s}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-violet-600">{suggestedLabel}</td>
                      <td className="py-2 px-3">
                        <select
                          value={columnMapping[col] || "_skip"}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({ ...prev, [col]: e.target.value }))
                          }
                          className="w-full rounded border border-gray-200 px-2 py-1.5"
                        >
                          {fieldOptions.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <input
                type="text"
                placeholder="Şablon adı"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm flex-1 min-w-[160px]"
              />
              <button
                type="button"
                onClick={saveTemplate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Save size={14} />
                Şablon Kaydet
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                <ChevronLeft size={16} /> Geri
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleMappingNext}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                Dry-run Önizleme
              </button>
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-center">
              <MiniStat label="Toplam" value={preview.totalRows} />
              <MiniStat label="Geçerli" value={preview.validRows} />
              <MiniStat label="Hatalı" value={preview.errorRows} color="red" />
              <MiniStat label="Uyarı" value={preview.warningCount ?? 0} color="amber" />
              <MiniStat label="Dup (dosya)" value={preview.duplicateInFile} color="amber" />
              <MiniStat label="Dup (DB)" value={preview.duplicateInDb} color="amber" />
              <MiniStat label="Görselli ürün" value={preview.productsWithImages ?? 0} />
              <MiniStat label="Açıklamalı" value={preview.productsWithDescription ?? 0} />
              <MiniStat label="Ort. kalite" value={preview.averageQualityScore ?? 0} />
              <MiniStat label="BLUEPRINT_READY" value={preview.blueprintReadyEstimate} color="emerald" />
              <MiniStat label="ANALYZED" value={preview.analyzedEstimate} color="blue" />
              <MiniStat label="REJECTED" value={preview.rejectedEstimate} color="red" />
            </div>
            {preview.warnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 space-y-1">
                {preview.warnings.slice(0, 6).map((w) => (
                  <p key={w} className="flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}
            <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Ürün</th>
                    <th className="py-2 px-2">Kalite</th>
                    <th className="py-2 px-2">Durum</th>
                    <th className="py-2 px-2">Görsel</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((r) => (
                    <tr key={r.rowIndex} className="border-t border-gray-50">
                      <td className="py-1.5 px-2">{r.rowIndex}</td>
                      <td className="py-1.5 px-2 max-w-[200px] truncate">{r.rawName}</td>
                      <td className="py-1.5 px-2">{r.qualityScore}</td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusCls(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">{r.imageCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400">İlk 20 satır gösteriliyor. Dry-run DB&apos;ye yazmaz.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                <ChevronLeft size={16} /> Geri
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white"
              >
                Import Ayarları <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500">Proje {autoGenerateUniverse ? "(zorunlu)" : "(opsiyonel)"}</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">— Seçin —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Duplicate Davranışı</label>
                <select
                  value={duplicateMode}
                  onChange={(e) => setDuplicateMode(e.target.value as typeof duplicateMode)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="skip">Atla (skip)</option>
                  <option value="update">Güncelle (update)</option>
                  <option value="create_new">Yeni oluştur (create_new)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Commit limiti (satır)</label>
                <input
                  type="number"
                  min={1}
                  max={mode === "admin" ? 50000 : 10000}
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value, 10) || 1000)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Min kalite skoru (opsiyonel)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="örn. 40"
                  value={minQuality}
                  onChange={(e) =>
                    setMinQuality(e.target.value === "" ? "" : parseInt(e.target.value, 10) || "")
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={runAnalysis} onChange={(e) => setRunAnalysis(e.target.checked)} />
                  Entity + DNA + kalite analizi
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-800 flex items-center gap-1.5">
                <GitBranch size={14} /> Import Sonrası Otomasyon
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoGenerateUniverse}
                    onChange={(e) => {
                      setAutoGenerateUniverse(e.target.checked);
                      if (!e.target.checked) {
                        setAutoRunPipeline(false);
                        setAutoPublishInternal(false);
                      }
                    }}
                  />
                  Ürünleri sayfa evrenine gönder
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoRunPipeline}
                    disabled={!autoGenerateUniverse}
                    onChange={(e) => {
                      setAutoRunPipeline(e.target.checked);
                      if (!e.target.checked) setAutoPublishInternal(false);
                    }}
                  />
                  Pipeline çalıştır (AEO → Draft → Gate)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoPublishInternal}
                    disabled={!autoRunPipeline}
                    onChange={(e) => setAutoPublishInternal(e.target.checked)}
                  />
                  Gate geçerse iç yayına al
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={includeGeo}
                    disabled={!autoGenerateUniverse}
                    onChange={(e) => setIncludeGeo(e.target.checked)}
                  />
                  <Globe size={14} className="text-gray-500" /> GEO expansion (Top 20 şehir)
                </label>
                <div>
                  <label className="text-xs text-gray-500">Pipeline limit</label>
                  <input
                    type="number"
                    min={1}
                    max={mode === "admin" ? 1000 : 100}
                    value={pipelineLimit}
                    disabled={!autoRunPipeline}
                    onChange={(e) => setPipelineLimit(parseInt(e.target.value, 10) || 100)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Min publish score</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={minPublishScore}
                    disabled={!autoRunPipeline}
                    onChange={(e) => setMinPublishScore(parseInt(e.target.value, 10) || 70)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                <ChevronLeft size={16} /> Geri
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCommit}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Import Commit
              </button>
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 size={20} />
              Import tamamlandı — Job {result.jobId}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <MiniStat label="Toplam" value={result.totalRows} />
              <MiniStat label="Eklenen" value={result.insertedRows} color="emerald" />
              <MiniStat label="Güncellenen" value={result.updatedRows} color="blue" />
              <MiniStat label="Atlanan" value={result.skippedRows} />
              <MiniStat label="Hata" value={result.errorRows} color="red" />
            </div>
            {result.automation && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900 space-y-1">
                <p className="font-medium flex items-center gap-1.5">
                  <GitBranch size={14} /> Otomasyon sonucu
                </p>
                {result.automation.universeJobId && (
                  <p>Universe job: <code className="text-xs">{result.automation.universeJobId}</code> — {result.automation.generatedBlueprints ?? 0} blueprint</p>
                )}
                {result.automation.pipelineJobId && (
                  <p>Pipeline job: <code className="text-xs">{result.automation.pipelineJobId}</code></p>
                )}
                {result.automation.pipelineResult && (
                  <p>
                    Pipeline: {result.automation.pipelineResult.processedBlueprints} işlendi · Draft:{" "}
                    {result.automation.pipelineResult.draftsGenerated} · Gate:{" "}
                    {result.automation.pipelineResult.gatesGenerated} · Yayın:{" "}
                    {(result.automation.pipelineResult.pagesPublished ?? 0) +
                      (result.automation.pipelineResult.pagesUpdated ?? 0)}
                  </p>
                )}
                {result.automation.warnings?.map((w) => (
                  <p key={w} className="text-xs text-amber-700">{w}</p>
                ))}
              </div>
            )}
            {result.sampleProducts?.length > 0 && (
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-medium text-gray-700">Örnek ürünler:</p>
                {result.sampleProducts.map((p) => (
                  <p key={p.rawName}>
                    {p.rawName} — skor {p.qualityScore} ({p.status})
                  </p>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setFile(null);
                setPreview(null);
                setResult(null);
              }}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Yeni Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "red" | "amber" | "emerald" | "blue";
}) {
  const cls =
    color === "red"
      ? "text-red-700"
      : color === "amber"
        ? "text-amber-700"
        : color === "emerald"
          ? "text-emerald-700"
          : color === "blue"
            ? "text-blue-700"
            : "text-gray-900";
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

function statusCls(status: string) {
  if (status === "BLUEPRINT_READY") return "bg-emerald-100 text-emerald-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "ANALYZED") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}
