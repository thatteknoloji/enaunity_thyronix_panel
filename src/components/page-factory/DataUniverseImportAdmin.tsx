"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

const IMPORT_TYPES = [
  { value: "province", label: "İl" },
  { value: "district", label: "İlçe" },
  { value: "neighborhood", label: "Mahalle / Semt" },
  { value: "village", label: "Köy / Belde" },
  { value: "street", label: "Cadde / Sokak" },
];

type Job = {
  id: string;
  type: string;
  status: string;
  fileName: string;
  dryRun: boolean;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  createdAt: string;
  completedAt: string | null;
};

type ImportResult = {
  jobId: string;
  dryRun: boolean;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  errors: Array<{ row: number; message: string }>;
};

export function DataUniverseImportAdmin() {
  const [type, setType] = useState("district");
  const [dryRun, setDryRun] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<(Job & { metadata?: { errors?: Array<{ row: number; message: string }> } }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ items: Job[] }>("/api/admin/page-factory/data/import/jobs?limit=15");
    if (d.success) setJobs(d.data?.items || []);
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const loadJobDetail = async (id: string) => {
    const d = await fetchPageFactoryJson(`/api/admin/page-factory/data/import/jobs/${id}`);
    if (d.success) setSelectedJob(d.data as typeof selectedJob);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Dosya seçin");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      fd.append("dryRun", String(dryRun));
      const d = await fetchPageFactoryJson<ImportResult>("/api/admin/page-factory/data/import", { method: "POST", body: fd });
      if (!d.success) throw new Error(d.error || "Import başarısız");
      setResult(d.data || null);
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={toAdminUrl("/admin/page-factory/data")} className="text-gray-500 hover:text-gray-800">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">Data Universe V2</p>
          <h1 className="text-xl font-bold text-gray-900">Bulk Import</h1>
          <p className="text-sm text-gray-500">CSV, JSON veya XLSX — dry-run, dedup ve job raporu</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-gray-500">Veri Tipi</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {IMPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Dry-run (kaydetmeden doğrula)
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">Dosya (CSV / JSON / XLSX)</label>
          <input
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 w-full text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            İlçe için: il/plateCode + ilce/name · Mahalle için: il + ilce + mahalle/name
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {dryRun ? "Dry-run Başlat" : "Import Başlat"}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <CheckCircle2 size={18} />
            {result.dryRun ? "Dry-run tamamlandı" : "Import tamamlandı"}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <Stat label="Toplam" value={result.totalRows} />
            <Stat label="Eklenen" value={result.insertedRows} />
            <Stat label="Güncellenen" value={result.updatedRows} />
            <Stat label="Atlanan" value={result.skippedRows} />
            <Stat label="Hata" value={result.errorRows} />
          </div>
          {result.errors?.length > 0 && (
            <div className="rounded-lg bg-white border border-red-100 p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                <AlertCircle size={14} /> Hatalar
              </p>
              {result.errors.slice(0, 20).map((err) => (
                <p key={`${err.row}-${err.message}`} className="text-xs text-red-600">
                  Satır {err.row}: {err.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-violet-600" />
          Import Job Geçmişi
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="py-2 pr-3">Dosya</th>
                <th className="py-2 pr-3">Tip</th>
                <th className="py-2 pr-3">Durum</th>
                <th className="py-2 pr-3">Satır</th>
                <th className="py-2 pr-3">+/~/-</th>
                <th className="py-2">Detay</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 pr-3 font-medium text-gray-800">{j.fileName}</td>
                  <td className="py-2 pr-3">{j.type}{j.dryRun ? " (dry)" : ""}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="py-2 pr-3">{j.totalRows}</td>
                  <td className="py-2 pr-3 text-gray-600">
                    {j.insertedRows}/{j.updatedRows}/{j.errorRows}
                  </td>
                  <td className="py-2 pr-3 text-gray-500">{new Date(j.createdAt).toLocaleString("tr-TR")}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => loadJobDetail(j.id)}
                      className="text-violet-600 hover:underline"
                    >
                      Görüntüle
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">
                    Henüz import job yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedJob && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Job Detayı — {selectedJob.fileName}</h3>
            <button type="button" onClick={() => setSelectedJob(null)} className="text-xs text-gray-500 hover:text-gray-800">
              Kapat
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <p><span className="text-gray-500">Tip:</span> {selectedJob.type}</p>
            <p><span className="text-gray-500">Durum:</span> {selectedJob.status}</p>
            <p><span className="text-gray-500">Dry-run:</span> {selectedJob.dryRun ? "Evet" : "Hayır"}</p>
            <p><span className="text-gray-500">Tamamlanma:</span> {selectedJob.completedAt ? new Date(selectedJob.completedAt).toLocaleString("tr-TR") : "—"}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Stat label="Toplam" value={selectedJob.totalRows} />
            <Stat label="Eklenen" value={selectedJob.insertedRows} />
            <Stat label="Güncellenen" value={selectedJob.updatedRows} />
            <Stat label="Atlanan" value={selectedJob.skippedRows} />
            <Stat label="Hata" value={selectedJob.errorRows} />
          </div>
          {selectedJob.metadata?.errors && selectedJob.metadata.errors.length > 0 && (
            <div className="rounded-lg bg-white border border-red-100 p-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-red-700 mb-2">Hata örnekleri</p>
              {selectedJob.metadata.errors.slice(0, 30).map((err) => (
                <p key={`${err.row}-${err.message}`} className="text-xs text-red-600">
                  Satır {err.row}: {err.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white border border-gray-100 p-3 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[10px] uppercase text-gray-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-red-100 text-red-800",
    RUNNING: "bg-amber-100 text-amber-800",
    PENDING: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${colors[status] || colors.PENDING}`}>
      {status}
    </span>
  );
}
