"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Loader2,
  Play,
  RefreshCw,
  Link2,
} from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type BridgeStatus = {
  activeSourceCount: number;
  totalThyronixProducts: number;
  bridgedProductCount: number;
  blueprintReadyCount: number;
  analyzedCount: number;
  rejectedCount: number;
  sources: Array<{
    id: string;
    name: string;
    status: string;
    productCount: number;
    lastSync: string | null;
  }>;
  lastJob: {
    id: string;
    status: string;
    fileName: string;
    totalRows: number;
    insertedRows: number;
    updatedRows: number;
    errorRows: number;
    dryRun: boolean;
    createdAt: string;
  } | null;
};

type ImportResult = {
  jobId: string;
  totalRows: number;
  processedRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  hasMore: boolean;
  nextCursor: string | null;
  warnings: string[];
  sampleProducts: Array<{
    rawName: string;
    qualityScore?: number;
    status?: string;
  }>;
};

export function ProductUniverseThyronixBridgePanel() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [analyze, setAnalyze] = useState(true);
  const [minStock, setMinStock] = useState(0);
  const [limit, setLimit] = useState(1000);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson<BridgeStatus>("/api/product-universe/thyronix/status");
      if (!d.success) throw new Error(d.error || "Durum yüklenemedi");
      setStatus(d.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Durum yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const runImport = async (opts?: { all?: boolean }) => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      let cursor: string | null = null;
      let aggregate: ImportResult | null = null;
      let batches = 0;
      const maxBatches = opts?.all ? 200 : 1;

      do {
        const d = await fetchPageFactoryJson<ImportResult>("/api/product-universe/thyronix/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onlyActiveSources: true,
            dryRun,
            limit: opts?.all ? 1000 : limit,
            minStock,
            analyze,
            cursor,
          }),
        });
        if (!d.success) throw new Error(d.error || "Import başarısız");

        const batch = d.data as ImportResult;
        if (!aggregate) {
          aggregate = { ...batch };
        } else {
          aggregate.processedRows += batch.processedRows;
          aggregate.insertedRows += batch.insertedRows;
          aggregate.updatedRows += batch.updatedRows;
          aggregate.skippedRows += batch.skippedRows;
          aggregate.errorRows += batch.errorRows;
          aggregate.warnings = [...aggregate.warnings, ...batch.warnings];
          aggregate.hasMore = batch.hasMore;
          aggregate.nextCursor = batch.nextCursor;
        }

        cursor = batch.hasMore ? batch.nextCursor : null;
        batches++;
        if (!opts?.all) break;
      } while (cursor && batches < maxBatches);

      setResult(aggregate);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import başarısız");
    } finally {
      setRunning(false);
    }
  };

  if (loading && !status) {
    return <div className="py-12 text-center text-sm text-gray-500 animate-pulse">Thyronix köprü durumu yükleniyor…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700">Thyronix → Product Universe</p>
          <h2 className="text-lg font-bold text-gray-900">Thyronix Köprüsü V3</h2>
          <p className="text-sm text-gray-500 mt-1">
            Thyronix XML ürünlerini Product Universe&apos;e aktarır. Konum: Admin → Product Universe → <strong>Thyronix Köprüsü</strong> sekmesi
          </p>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi label="Aktif Kaynak" value={status.activeSourceCount} />
          <Kpi label="Thyronix Ürün" value={status.totalThyronixProducts} />
          <Kpi label="PU Aktarılan" value={status.bridgedProductCount} accent="violet" />
          <Kpi label="Blueprint Ready" value={status.blueprintReadyCount} accent="emerald" />
          <Kpi label="Analyzed" value={status.analyzedCount} accent="blue" />
          <Kpi label="Rejected" value={status.rejectedCount} accent="red" />
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Import Kontrolleri</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Dry-run (DB yazmaz)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={analyze} onChange={(e) => setAnalyze(e.target.checked)} />
            Analiz zinciri çalıştır
          </label>
          <div>
            <label className="text-xs text-gray-500">Min stok</label>
            <input
              type="number"
              min={0}
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Batch limit</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={limit}
              onChange={(e) => setLimit(Math.min(5000, Number(e.target.value) || 1000))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={running}
            onClick={() => runImport()}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {dryRun ? `Dry Run (${limit})` : `İlk ${limit} ürünü aktar`}
          </button>
          <button
            type="button"
            disabled={running || dryRun}
            title={dryRun ? "Önce Dry-run kutusunu kapatın" : "Tüm aktif Thyronix kaynaklarını batch halinde aktarır"}
            onClick={() => runImport({ all: true })}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
            Tüm aktif kaynakları aktar (batch)
          </button>
        </div>
        {dryRun && (
          <p className="text-xs text-amber-700">
            Dry-run açıkken veritabanına yazılmaz. Gerçek aktarım için Dry-run&apos;u kapatın; &quot;Tüm aktif kaynakları aktar&quot; butonu da Dry-run kapalıyken aktif olur.
          </p>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <CheckCircle2 size={18} />
            Bridge işlemi tamamlandı {dryRun ? "(dry-run)" : ""}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
            <Stat label="Toplam" value={result.totalRows} />
            <Stat label="İşlenen" value={result.processedRows} />
            <Stat label="Eklenen" value={result.insertedRows} />
            <Stat label="Güncellenen" value={result.updatedRows} />
            <Stat label="Atlanan" value={result.skippedRows} />
            <Stat label="Hata" value={result.errorRows} />
          </div>
          {result.hasMore && (
            <p className="text-xs text-amber-700">
              Daha fazla ürün var — &quot;Tüm aktif kaynakları aktar&quot; ile devam edin veya cursor: {result.nextCursor}
            </p>
          )}
          {result.sampleProducts?.length > 0 && (
            <div className="text-xs text-gray-700 space-y-1">
              {result.sampleProducts.slice(0, 5).map((p) => (
                <p key={p.rawName}>
                  {p.rawName} — skor {p.qualityScore ?? "—"} / {p.status ?? "—"}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {status?.lastJob && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <h3 className="font-semibold text-gray-800 mb-2">Son Bridge Job</h3>
          <p className="text-gray-600">
            {status.lastJob.fileName} · {status.lastJob.status} · +{status.lastJob.insertedRows} / ~{status.lastJob.updatedRows} / !{status.lastJob.errorRows}
            {status.lastJob.dryRun ? " · dry-run" : ""}
          </p>
        </div>
      )}

      {status && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Link2 size={16} className="text-cyan-600" />
            <h3 className="text-sm font-semibold text-gray-800">Aktif Thyronix Kaynakları</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-2">Kaynak</th>
                  <th className="px-4 py-2">Durum</th>
                  <th className="px-4 py-2 text-right">Ürün</th>
                  <th className="px-4 py-2">Son Sync</th>
                </tr>
              </thead>
              <tbody>
                {status.sources.map((s) => (
                  <tr key={s.id} className="border-t border-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-2">{s.status}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.productCount.toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {s.lastSync ? new Date(s.lastSync).toLocaleString("tr-TR") : "—"}
                    </td>
                  </tr>
                ))}
                {!status.sources.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      Aktif Thyronix kaynağı yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "violet" | "emerald" | "red" | "blue";
}) {
  const color =
    accent === "emerald" ? "text-emerald-600" : accent === "red" ? "text-red-600" : accent === "violet" ? "text-violet-600" : accent === "blue" ? "text-blue-600" : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-semibold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}
