"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, Upload, Package, Sparkles, Image as ImageIcon, Layers, AlertTriangle,
  CheckCircle2, RefreshCw, X, ChevronRight,
} from "lucide-react";

const SOURCE_TYPES = [
  { value: "CSV", label: "CSV" },
  { value: "XLSX", label: "XLSX" },
  { value: "TRENDYOL", label: "Trendyol Export" },
  { value: "MANUAL", label: "Manuel" },
];

type Stats = { total: number; analyzed: number; withImages: number; clusters: number; lowQuality: number };
type Product = {
  id: string;
  rawName: string;
  normalizedName: string;
  brand: string;
  categoryPath: string;
  status: string;
  qualityScore: number;
  entityCount: number;
  imageCount: number;
};
type Job = {
  id: string;
  fileName: string;
  sourceType: string;
  status: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  createdAt: string;
};
type Project = { id: string; name: string };
type ProductDetail = Product & {
  descriptionRaw: string;
  descriptionClean: string;
  entities: Array<{ id: string; type: string; value: string; confidence: number }>;
  attributes: Array<{ id: string; key: string; value: string; unit?: string | null }>;
  images: Array<{ id: string; sourceUrl: string; status: string; sortOrder: number }>;
  contentDNA?: {
    primaryEntity: string;
    targetKeyword: string;
    intent: string;
    audience: string;
    pageAngle: string;
    faqSeedsJson: string;
    internalLinkHintsJson: string;
    schemaHintsJson: string;
  } | null;
  blueprintPreview?: unknown;
};

type Props = { mode: "admin" | "dealer" };

export function ProductUniverseShell({ mode }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("CSV");
  const [projectId, setProjectId] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [selected, setSelected] = useState<ProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [q, setQ] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, jobRes, projRes] = await Promise.all([
        fetch(`/api/product-universe/products?page=1&limit=30${q ? `&q=${encodeURIComponent(q)}` : ""}`),
        fetch("/api/product-universe/import/jobs?limit=10"),
        fetch("/api/page-factory/projects"),
      ]);
      const prodData = await prodRes.json();
      const jobData = await jobRes.json();
      const projData = await projRes.json();

      if (prodData.success) {
        setProducts(prodData.data.items || []);
        setStats(prodData.data.stats || null);
      }
      if (jobData.success) setJobs(jobData.data.items || []);
      if (projData.success) setProjects(projData.data || []);
    } catch {
      setError("Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", sourceType);
      fd.append("dryRun", String(dryRun));
      if (projectId) fd.append("projectId", projectId);
      const r = await fetch("/api/product-universe/import", { method: "POST", body: fd });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Import başarısız");
      setResult(d.data);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import başarısız");
    } finally {
      setImporting(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/product-universe/products/${id}`);
      const d = await r.json();
      if (d.success) setSelected(d.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const reanalyze = async (id: string) => {
    await fetch(`/api/product-universe/products/${id}/analyze`, { method: "POST" });
    await openDetail(id);
    await loadData();
  };

  const statusColor = (status: string) => {
    if (status === "BLUEPRINT_READY") return "text-emerald-600 bg-emerald-50";
    if (status === "REJECTED") return "text-red-600 bg-red-50";
    if (status === "ANALYZED") return "text-blue-600 bg-blue-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
          AI Page Factory · Product Universe V1
        </p>
        <h1 className="text-xl font-bold text-gray-900">
          {mode === "admin" ? "Product Universe" : "Ürün Evreni"}
        </h1>
        <p className="text-sm text-gray-500">
          Ürün import, entity çıkarımı, Content DNA ve blueprint planlama altyapısı
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Kpi icon={Package} label="Toplam Ürün" value={stats.total} />
          <Kpi icon={Sparkles} label="Analiz Edilmiş" value={stats.analyzed} />
          <Kpi icon={ImageIcon} label="Görselli" value={stats.withImages} />
          <Kpi icon={Layers} label="Cluster" value={stats.clusters} />
          <Kpi icon={AlertTriangle} label="Düşük Kalite" value={stats.lowQuality} />
        </div>
      )}

      <form onSubmit={handleImport} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800">Ürün Import</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <label className="text-xs text-gray-500">Proje (opsiyonel)</label>
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
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Dry-run
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-500">Dosya (CSV / XLSX / JSON)</label>
            <input
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 w-full text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={importing || !file}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {dryRun ? "Dry-run Başlat" : "Import Başlat"}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <CheckCircle2 size={18} />
            Import tamamlandı
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <Stat label="Toplam" value={result.totalRows as number} />
            <Stat label="Eklenen" value={result.insertedRows as number} />
            <Stat label="Güncellenen" value={result.updatedRows as number} />
            <Stat label="Atlanan" value={result.skippedRows as number} />
            <Stat label="Hata" value={result.errorRows as number} />
          </div>
          {(result.warnings as string[])?.length > 0 && (
            <div className="text-xs text-amber-700">
              {(result.warnings as string[]).slice(0, 5).map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Son Import Jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="py-2 pr-3">Dosya</th>
                <th className="py-2 pr-3">Tip</th>
                <th className="py-2 pr-3">Durum</th>
                <th className="py-2 pr-3">Satır</th>
                <th className="py-2">+/~/-</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-gray-50">
                  <td className="py-2 pr-3">{j.fileName}</td>
                  <td className="py-2 pr-3">{j.sourceType}</td>
                  <td className="py-2 pr-3">{j.status}</td>
                  <td className="py-2 pr-3">{j.totalRows}</td>
                  <td className="py-2">{j.insertedRows}/{j.updatedRows}/{j.errorRows}</td>
                </tr>
              ))}
              {!jobs.length && (
                <tr><td colSpan={5} className="py-4 text-center text-gray-400">Henüz import yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-sm font-semibold text-gray-800">Ürün Listesi</h2>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara..."
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
            />
            <button onClick={loadData} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-violet-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2 pr-3">Ürün</th>
                  <th className="py-2 pr-3">Kategori</th>
                  <th className="py-2 pr-3">Marka</th>
                  <th className="py-2 pr-3">Entity</th>
                  <th className="py-2 pr-3">Görsel</th>
                  <th className="py-2 pr-3">Kalite</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 pr-3 max-w-[200px] truncate">{p.normalizedName || p.rawName}</td>
                    <td className="py-2 pr-3 max-w-[120px] truncate">{p.categoryPath || "—"}</td>
                    <td className="py-2 pr-3">{p.brand || "—"}</td>
                    <td className="py-2 pr-3">{p.entityCount}</td>
                    <td className="py-2 pr-3">{p.imageCount}</td>
                    <td className="py-2 pr-3">
                      <span className={`font-medium ${p.qualityScore >= 70 ? "text-emerald-600" : p.qualityScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                        {p.qualityScore}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2">
                      <button onClick={() => openDetail(p.id)} className="text-violet-600 hover:text-violet-800">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!products.length && (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">Henüz ürün yok — import başlatın</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{selected?.normalizedName || "Yükleniyor..."}</h3>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            {detailLoading && !selected ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
            ) : selected ? (
              <div className="p-6 space-y-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => reanalyze(selected.id)}
                    className="inline-flex items-center gap-1 text-xs rounded-lg bg-violet-100 text-violet-700 px-3 py-1.5"
                  >
                    <RefreshCw size={12} /> Yeniden Analiz
                  </button>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(selected.status)}`}>
                    {selected.status} · Skor {selected.qualityScore}
                  </span>
                </div>

                <Section title="Açıklama">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Raw</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">{selected.descriptionRaw || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Clean</p>
                      <p className="text-xs text-gray-800 whitespace-pre-wrap max-h-32 overflow-y-auto">{selected.descriptionClean || "—"}</p>
                    </div>
                  </div>
                </Section>

                <Section title={`Entities (${selected.entities?.length || 0})`}>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.entities?.map((e) => (
                      <span key={e.id} className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                        {e.type}: {e.value}
                      </span>
                    ))}
                  </div>
                </Section>

                <Section title={`Attributes (${selected.attributes?.length || 0})`}>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.attributes?.map((a) => (
                      <span key={a.id} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {a.key}: {a.value}{a.unit ? ` ${a.unit}` : ""}
                      </span>
                    ))}
                  </div>
                </Section>

                <Section title={`Görseller (${selected.images?.length || 0})`}>
                  <div className="grid grid-cols-4 gap-2">
                    {selected.images?.map((img) => (
                      <div key={img.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.sourceUrl} alt="" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 text-[8px] bg-black/50 text-white px-1">{img.status}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {selected.contentDNA && (
                  <Section title="Content DNA">
                    <div className="space-y-2 text-xs">
                      <p><strong>Primary:</strong> {selected.contentDNA.primaryEntity}</p>
                      <p><strong>Keyword:</strong> {selected.contentDNA.targetKeyword}</p>
                      <p><strong>Intent:</strong> {selected.contentDNA.intent}</p>
                      <p><strong>Audience:</strong> {selected.contentDNA.audience}</p>
                      <p><strong>Angle:</strong> {selected.contentDNA.pageAngle}</p>
                      <div>
                        <strong>FAQ Seeds:</strong>
                        <ul className="list-disc ml-4 mt-1">
                          {(JSON.parse(selected.contentDNA.faqSeedsJson) as string[]).map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Internal Links:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(JSON.parse(selected.contentDNA.internalLinkHintsJson) as string[]).map((l) => (
                            <span key={l} className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{l}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Section>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        <Icon size={14} className="text-violet-600" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 mb-2">{title}</h4>
      {children}
    </div>
  );
}
