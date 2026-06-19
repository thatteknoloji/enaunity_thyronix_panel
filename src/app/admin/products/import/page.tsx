"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductsTabs } from "@/components/admin/ProductsTabs";
import { toAdminUrl } from "@/lib/auth/admin-access";
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

type Step = "source" | "preview" | "categories" | "commit" | "done";

interface PreviewGroup {
  modelCode: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  variantCount: number;
  price: number;
  stock: number;
  errors: string[];
  warnings: string[];
  sampleVariants: { sku: string; barcode: string; price: number; stock: number; options: { group: string; value: string }[] }[];
}

interface PreviewData {
  preset: string;
  fileName: string;
  totalRows: number;
  groupCount: number;
  ungroupedCount: number;
  groups: PreviewGroup[];
  categoryValues: string[];
  previewJobId: string;
}

const PRESETS = [
  { id: "auto", label: "Otomatik Algıla", desc: "Sütun başlıklarından format tespit eder" },
  { id: "trendyol_tablo", label: "Trendyol Tablo", desc: "Model Kodu + varyant satırları (veriler_part1 formatı)" },
  { id: "hepsiburada", label: "Hepsiburada", desc: "HB export (TY tablo alias)" },
  { id: "generic", label: "Genel Excel/CSV", desc: "name, sku, barcode, price, stock" },
];

export default function BulkImportPage() {
  const [step, setStep] = useState<Step>("source");
  const [preset, setPreset] = useState("auto");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [commitResult, setCommitResult] = useState<{ created: number; updated: number; skipped: number; errors: string[]; productIds: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => {
      if (d.success || d.data) setCategories(d.data || []);
    }).catch(() => {});
  }, []);

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("preset", preset);
    try {
      const res = await fetch("/api/admin/products/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || "Önizleme hatası"); return; }
      setPreview(data.data);
      const mapping: Record<string, string> = {};
      for (const cat of data.data.categoryValues || []) {
        const match = categories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
        mapping[cat] = match?.name || cat;
      }
      setCategoryMapping(mapping);
      setStep("preview");
    } catch {
      toast.error("Dosya okunamadı");
    } finally {
      setLoading(false);
    }
  };

  const [importProgress, setImportProgress] = useState<{ progress: number; total: number } | null>(null);

  const pollImportJob = async (jobId: string): Promise<void> => {
    const maxAttempts = 600;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`/api/admin/products/import/jobs/${jobId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Job durumu okunamadı");

      const job = data.data;
      const progress = job.progress ?? job.addedCount ?? 0;
      const total = job.total ?? job.productCount ?? 0;
      setImportProgress({ progress, total });

      if (job.status === "COMPLETED") {
        setCommitResult({
          created: job.addedCount ?? 0,
          updated: job.updatedCount ?? 0,
          skipped: job.unchangedCount ?? 0,
          errors: job.errors ?? [],
          productIds: job.productIds ?? [],
        });
        setImportProgress(null);
        setStep("done");
        toast.success(`${job.addedCount ?? 0} yeni, ${job.updatedCount ?? 0} güncellendi`);
        return;
      }
      if (job.status === "FAILED") {
        throw new Error(job.errorMessage || "Import başarısız");
      }

      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Import zaman aşımına uğradı — Import Geçmişi'nden durumu kontrol edin");
  };

  const handleCommit = async () => {
    if (!preview) return;
    setLoading(true);
    setStep("commit");
    setImportProgress(null);
    try {
      const res = await fetch("/api/admin/products/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewJobId: preview.previewJobId, categoryMapping }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || "İçe aktarma hatası"); setStep("categories"); return; }

      if (data.data?.queued) {
        toast.success("Büyük import kuyruğa alındı — arka planda işleniyor");
        await pollImportJob(data.data.jobId);
        return;
      }

      setCommitResult(data.data);
      setStep("done");
      toast.success(`${data.data.created} yeni, ${data.data.updated} güncellendi`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "İçe aktarma başarısız");
      setStep("categories");
    } finally {
      setLoading(false);
    }
  };

  const errorCount = preview?.groups.reduce((s, g) => s + g.errors.length, 0) || 0;
  const okGroups = preview?.groups.filter((g) => g.errors.length === 0).length || 0;

  return (
    <div className="max-w-4xl">
      <ProductsTabs />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Toplu Ürün Yükle</h1>
      <p className="text-sm text-gray-500 mb-6">
        Model Kodu = parent ürün · Her satır = varyant · Başlık/açıklama upsert ile güncellenir
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs text-gray-500">
        {(["source", "preview", "categories", "done"] as Step[]).map((s, i) => (
          <span key={s} className={`flex items-center gap-1 ${step === s || (step === "commit" && s === "categories") ? "text-gray-900 font-semibold" : ""}`}>
            {i > 0 && <ChevronRight size={12} />}
            {s === "source" ? "1. Kaynak" : s === "preview" ? "2. Önizleme" : s === "categories" ? "3. Kategori" : "4. Tamam"}
          </span>
        ))}
      </div>

      {/* Step 1: Source */}
      {step === "source" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Kaynak Format</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${preset === p.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <p className="text-sm font-medium text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-gray-300 cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600">{file ? file.name : "Excel, CSV veya XML seçin"}</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv, .xml</p>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.xml" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button className="w-full mt-4" disabled={!file || loading} onClick={handlePreview}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-1" /> Analiz ediliyor...</> : "Önizleme Oluştur"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold">{preview.totalRows}</p><p className="text-xs text-gray-500">Satır</p></div>
              <div className="p-3 bg-blue-50 rounded-lg"><p className="text-xl font-bold text-blue-700">{preview.groupCount}</p><p className="text-xs text-blue-600">Parent Ürün</p></div>
              <div className="p-3 bg-green-50 rounded-lg"><p className="text-xl font-bold text-green-700">{okGroups}</p><p className="text-xs text-green-600">Hazır</p></div>
              <div className="p-3 bg-red-50 rounded-lg"><p className="text-xl font-bold text-red-600">{errorCount}</p><p className="text-xs text-red-500">Hata</p></div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Parent başlık: gruptaki en sık ürün adı · Açıklama: en uzun metin · Upsert ile güncellenir
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Model Kodu</th>
                  <th className="px-3 py-2 text-left">Parent Başlık</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-right">Varyant</th>
                  <th className="px-3 py-2 text-left">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.groups.map((g) => (
                  <tr key={g.modelCode} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-mono text-gray-700">{g.modelCode}</td>
                    <td className="px-3 py-2 text-gray-900 max-w-[200px] truncate">{g.name}</td>
                    <td className="px-3 py-2 text-gray-600">{g.category}</td>
                    <td className="px-3 py-2 text-right">{g.variantCount}</td>
                    <td className="px-3 py-2">
                      {g.errors.length ? (
                        <span className="text-red-600 flex items-center gap-1"><AlertCircle size={12} /> {g.errors[0]}</span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle size={12} /> OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("source")}><ChevronLeft size={14} className="mr-1" /> Geri</Button>
            <Button onClick={() => setStep("categories")} disabled={okGroups === 0}>
              Kategori Eşleme <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Category mapping */}
      {step === "categories" && preview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Kategori Eşleme</h2>
            <p className="text-xs text-gray-500 mb-4">Dosyadaki kategori → mağaza kategorisi (değiştirilebilir)</p>
            {preview.categoryValues.length === 0 ? (
              <p className="text-sm text-gray-400">Kategori sütunu boş — varsayılan kullanılacak</p>
            ) : (
              <div className="space-y-2">
                {preview.categoryValues.map((src) => (
                  <div key={src} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-48 truncate" title={src}>{src}</span>
                    <span className="text-gray-300">→</span>
                    <select
                      className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
                      value={categoryMapping[src] || src}
                      onChange={(e) => setCategoryMapping({ ...categoryMapping, [src]: e.target.value })}
                    >
                      <option value={src}>{src} (olduğu gibi)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("preview")}><ChevronLeft size={14} className="mr-1" /> Geri</Button>
            <Button onClick={handleCommit} disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-1" /> İçe aktarılıyor...</> : `${okGroups} ürünü içe aktar`}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Committing */}
      {step === "commit" && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Loader2 size={40} className="mx-auto text-gray-400 animate-spin mb-4" />
          <p className="text-sm text-gray-600">
            {importProgress
              ? `İşleniyor: ${importProgress.progress} / ${importProgress.total} ürün grubu`
              : "Ürünler ve varyantlar kaydediliyor..."}
          </p>
          {importProgress && importProgress.total > 0 && (
            <div className="mt-4 mx-auto max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 transition-all duration-500"
                style={{ width: `${Math.min(100, (importProgress.progress / importProgress.total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && commitResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <CheckCircle size={32} className="text-green-600 mb-3" />
            <h2 className="text-lg font-bold text-gray-900">İçe Aktarma Tamamlandı</h2>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-white rounded-lg"><p className="text-2xl font-bold text-green-600">{commitResult.created}</p><p className="text-xs">Yeni</p></div>
              <div className="text-center p-3 bg-white rounded-lg"><p className="text-2xl font-bold text-blue-600">{commitResult.updated}</p><p className="text-xs">Güncellenen</p></div>
              <div className="text-center p-3 bg-white rounded-lg"><p className="text-2xl font-bold text-amber-600">{commitResult.skipped}</p><p className="text-xs">Atlanan</p></div>
            </div>
            {commitResult.errors.length > 0 && (
              <div className="mt-4 text-xs text-red-600 max-h-32 overflow-y-auto">
                {commitResult.errors.slice(0, 20).map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={toAdminUrl("/admin/products")}><Button>Ürün Listesi</Button></Link>
            <Link href={toAdminUrl("/admin/products/import/history")}><Button variant="outline">Import Geçmişi</Button></Link>
            {commitResult.productIds.length > 0 && (
              <Button variant="outline" onClick={() => {
                sessionStorage.setItem("importProductIds", JSON.stringify(commitResult.productIds));
                toast.success(`${commitResult.productIds.length} ürün seçildi — listede toplu işlem yapabilirsin`);
                window.location.href = toAdminUrl("/admin/products");
              }}>
                Toplu İşlem İçin Seç ({commitResult.productIds.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => { setStep("source"); setFile(null); setPreview(null); setCommitResult(null); }}>
              Yeni Yükleme
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
