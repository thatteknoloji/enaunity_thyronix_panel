"use client";

import { useEffect, useState } from "react";
import { Activity, Clock, Check, AlertTriangle, RefreshCw } from "lucide-react";

type SyncLog = {
  id: string;
  type: string;
  status: string;
  message: string | null;
  duration: number | null;
  createdAt: string;
  details?: {
    created?: number;
    updated?: number;
    missing?: number;
    priceChanged?: number;
    stockChanged?: number;
  } | null;
};

type ReportData = {
  sources?: { total?: number; active?: number; error?: number };
  products?: { total?: number };
  feeds?: { total?: number };
  issues?: { zeroPrice?: number; zeroStock?: number };
};

export default function ThyronixMonitoringPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/thyronix/sync/logs?limit=20").then((r) => r.json()),
      fetch("/api/thyronix/reports").then((r) => r.json()),
    ])
      .then(([logRes, reportRes]) => {
        if (logRes.success) setLogs(logRes.data || []);
        if (reportRes.success) setReport(reportRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const syncLogs = logs.filter((l) => l.type === "source-sync");
  const lastSync = syncLogs[0];
  const failed = syncLogs.filter((l) => l.status === "error").length;
  const avgDuration =
    syncLogs.length > 0
      ? Math.round(
          syncLogs.reduce((sum, l) => sum + (l.duration || 0), 0) / syncLogs.length / 1000
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-nexa-text">Monitoring</h1>
          <p className="text-sm text-nexa-text-secondary mt-1">Senkron geçmişi ve sistem özeti</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-nexa-border px-3 py-2 text-xs text-nexa-text-secondary hover:text-nexa-text"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yenile
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Aktif kaynak",
            val: report?.sources?.active ?? "—",
            color: "text-nexa-success",
            bg: "bg-nexa-success/10",
          },
          {
            label: "Hatalı kaynak",
            val: report?.sources?.error ?? 0,
            color: (report?.sources?.error || 0) > 0 ? "text-nexa-danger" : "text-nexa-text",
            bg: (report?.sources?.error || 0) > 0 ? "bg-nexa-danger/10" : "bg-nexa-card",
          },
          {
            label: "Toplam ürün",
            val: report?.products?.total?.toLocaleString("tr-TR") ?? "—",
            color: "text-nexa-primary",
            bg: "bg-nexa-primary/10",
          },
          {
            label: "Ort. sync süresi",
            val: avgDuration > 0 ? `${avgDuration}s` : "—",
            color: "text-nexa-text",
            bg: "bg-nexa-card",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border border-nexa-border ${s.bg} p-4`}>
            <p className="text-xs text-nexa-text-secondary">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {lastSync && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4 text-sm">
          <p className="font-semibold text-nexa-text mb-1">Son senkronizasyon</p>
          <p className="text-nexa-text-secondary">
            {new Date(lastSync.createdAt).toLocaleString("tr-TR")} ·{" "}
            {lastSync.status === "success" ? (
              <span className="text-nexa-success inline-flex items-center gap-1"><Check size={14} /> Başarılı</span>
            ) : (
              <span className="text-nexa-danger inline-flex items-center gap-1"><AlertTriangle size={14} /> Hata</span>
            )}
            {lastSync.duration ? ` · ${Math.round(lastSync.duration / 1000)}s` : ""}
          </p>
          {lastSync.details && (
            <p className="text-xs text-nexa-text-secondary mt-2">
              Yeni: {lastSync.details.created ?? 0} · Güncelleme: {lastSync.details.updated ?? 0} · Kaynakta yok:{" "}
              {lastSync.details.missing ?? 0}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <div className="p-5 border-b border-nexa-border flex items-center gap-2">
          <Activity size={16} className="text-nexa-primary" />
          <h2 className="font-semibold text-nexa-text text-sm">Senkron geçmişi</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-nexa-text-secondary animate-pulse">Yükleniyor…</p>
        ) : syncLogs.length === 0 ? (
          <p className="p-6 text-sm text-nexa-text-secondary">Henüz senkron kaydı yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nexa-border bg-nexa-bg/50">
                <th className="px-4 py-2 text-left text-nexa-text-secondary">Zaman</th>
                <th className="px-4 py-2 text-left text-nexa-text-secondary">Durum</th>
                <th className="px-4 py-2 text-left text-nexa-text-secondary">Mesaj</th>
                <th className="px-4 py-2 text-right text-nexa-text-secondary">Süre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexa-border">
              {syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-nexa-hover">
                  <td className="px-4 py-2 text-nexa-text-secondary whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(log.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {log.status === "success" ? (
                      <span className="text-xs text-nexa-success">Başarılı</span>
                    ) : (
                      <span className="text-xs text-nexa-danger">Hata</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-nexa-text max-w-md truncate">{log.message || "—"}</td>
                  <td className="px-4 py-2 text-right text-nexa-text-secondary">
                    {log.duration ? `${Math.round(log.duration / 1000)}s` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(report?.issues?.zeroPrice || report?.issues?.zeroStock) ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-semibold mb-1">Kalite uyarıları</p>
          <p className="text-xs">
            Sıfır fiyat: {report?.issues?.zeroPrice ?? 0} · Sıfır stok: {report?.issues?.zeroStock ?? 0}
          </p>
        </div>
      ) : null}

      {failed > 0 && (
        <p className="text-xs text-nexa-text-secondary">
          Son 20 kayıtta {failed} hatalı senkronizasyon var. Detay için{" "}
          <a href="/thyronix/sync" className="text-nexa-primary hover:underline">Sync</a> sayfasına bakın.
        </p>
      )}
    </div>
  );
}
