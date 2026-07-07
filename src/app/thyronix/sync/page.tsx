"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Activity, AlertTriangle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

type SyncLog = {
  id: string;
  type: string;
  message: string | null;
  status: string;
  productCount: number | null;
  duration: number | null;
  createdAt: string;
  details?: {
    created?: number;
    updated?: number;
    missingFromSource?: number;
    priceChanged?: number;
    stockChanged?: number;
    samples?: {
      missingSamples?: Array<{ id: string; name: string }>;
      priceSamples?: Array<{ name: string; before: number; after: number }>;
    };
  } | null;
};

type MissingProduct = {
  id: string;
  name: string;
  externalId: string;
  barcode: string | null;
  source?: { name: string };
  updatedAt: string;
};

export default function ThyronixSyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [missing, setMissing] = useState<MissingProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, missingRes] = await Promise.all([
        fetch("/api/thyronix/sync/logs?limit=40"),
        fetch("/api/thyronix/products/missing-from-source"),
      ]);
      const logsData = await logsRes.json();
      const missingData = await missingRes.json();
      if (logsData.success) setLogs(logsData.data);
      if (missingData.success) setMissing(missingData.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const success = logs.filter((l) => l.status === "success").length;
  const error = logs.filter((l) => l.status === "error").length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteApproved = async () => {
    const ids = [...selected];
    if (!ids.length) return toast.error("Silinecek ürün seçin");
    if (!confirm(`${ids.length} ürünü sistemden kalıcı olarak silmek istiyor musunuz?`)) return;
    const res = await fetch("/api/thyronix/products/missing-from-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids, action: "delete" }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`${data.data.deleted} ürün silindi`);
      setSelected(new Set());
      load();
    } else {
      toast.error(data.error || "Silme hatası");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexa-text">Sync</h1>
          <p className="text-sm text-nexa-text-secondary mt-1">Senkronizasyon raporları ve kaynaktan düşen ürünler</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 border border-nexa-border rounded-lg text-sm hover:bg-nexa-hover"
        >
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
          <p className="text-2xl font-bold text-nexa-success">{success}</p>
          <p className="text-xs text-nexa-text-secondary mt-1">Başarılı sync</p>
        </div>
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
          <p className="text-2xl font-bold text-nexa-danger">{error}</p>
          <p className="text-xs text-nexa-text-secondary mt-1">Hatalı</p>
        </div>
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
          <p className="text-2xl font-bold text-amber-400">{missing.length}</p>
          <p className="text-xs text-nexa-text-secondary mt-1">Kaynakta yok (onay bekliyor)</p>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <h2 className="font-semibold text-sm text-nexa-text">Kaynaktan düşen ürünler</h2>
            </div>
            <button
              onClick={handleDeleteApproved}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-600/90 text-white disabled:opacity-40"
            >
              <Trash2 size={12} /> Seçilenleri sil ({selected.size})
            </button>
          </div>
          <p className="px-4 py-2 text-xs text-nexa-text-secondary border-b border-amber-500/10">
            Çıktı XML&apos;de stok 0 görünür. Sistemden kaldırmak için seçip onaylayın.
          </p>
          <div className="max-h-64 overflow-y-auto divide-y divide-nexa-border/50">
            {missing.map((p) => (
              <label key={p.id} className="flex items-center gap-3 px-4 py-2 hover:bg-nexa-hover/30 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="rounded"
                />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-nexa-text-secondary shrink-0">{p.source?.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <div className="px-4 py-3 border-b border-nexa-border flex items-center gap-2">
          <Activity size={16} className="text-nexa-primary" />
          <h2 className="font-semibold text-sm">Sync geçmişi</h2>
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-nexa-text-secondary text-sm">Yükleniyor...</p>
        ) : logs.length === 0 ? (
          <p className="px-4 py-12 text-center text-nexa-text-secondary text-sm">Henüz kayıt yok</p>
        ) : (
          <div className="divide-y divide-nexa-border">
            {logs.map((log) => (
              <div key={log.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-nexa-hover/30 text-left"
                >
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded uppercase ${
                      log.status === "success" ? "bg-nexa-success/10 text-nexa-success" : "bg-nexa-danger/10 text-nexa-danger"
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="flex-1 text-xs text-nexa-text truncate">{log.message}</span>
                  <span className="text-[10px] text-nexa-text-secondary">
                    {new Date(log.createdAt).toLocaleString("tr-TR")}
                  </span>
                  {log.details ? (expanded === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                </button>
                {expanded === log.id && log.details && (
                  <div className="px-4 pb-3 text-xs text-nexa-text-secondary grid grid-cols-2 md:grid-cols-5 gap-2 bg-nexa-bg/30">
                    <span>Yeni: {log.details.created ?? 0}</span>
                    <span>Güncelleme: {log.details.updated ?? 0}</span>
                    <span>Kaynakta yok: {log.details.missingFromSource ?? 0}</span>
                    <span>Fiyat: {log.details.priceChanged ?? 0}</span>
                    <span>Stok: {log.details.stockChanged ?? 0}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
