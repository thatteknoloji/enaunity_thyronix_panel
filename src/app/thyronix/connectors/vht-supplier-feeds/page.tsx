"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  Play,
  Link2,
} from "lucide-react";
import toast from "react-hot-toast";

type FeedRow = {
  code: string;
  name: string;
  supplier: string;
  inputFormat: string;
  hasUrl: boolean;
  urlMasked: string | null;
};

type FeedStatus = {
  total: number;
  configured: number;
  missing: string[];
  feeds: FeedRow[];
};

type SeedResult = {
  code: string;
  id: string;
  count?: number;
  error?: string;
};

export default function VhtSupplierFeedsPage() {
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<FeedStatus | null>(null);
  const [lastSeed, setLastSeed] = useState<SeedResult[] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/thyronix/connectors/vht-supplier-feeds");
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Yüklenemedi");
      setStatus(d.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runSeed = async (withSync: boolean) => {
    if (withSync) setSyncing(true);
    else setSeeding(true);
    try {
      const res = await fetch("/api/thyronix/connectors/vht-supplier-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: withSync ? "seed-sync" : "seed" }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "İşlem başarısız");
      setLastSeed(d.data.results || []);
      const ok = (d.data.results || []).filter((r: SeedResult) => r.id && !r.error).length;
      const fail = (d.data.results || []).filter((r: SeedResult) => r.error).length;
      toast.success(`${ok} kaynak ${withSync ? "eklendi ve senkronize edildi" : "kaydedildi"}${fail ? `, ${fail} hata` : ""}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "İşlem hatası");
    } finally {
      setSeeding(false);
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-nexa-text-secondary text-sm animate-pulse">Yükleniyor…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/thyronix/sources" className="inline-flex items-center gap-1 text-xs text-nexa-text-secondary hover:text-nexa-primary mb-2">
            <ArrowLeft size={14} /> Kaynaklar
          </Link>
          <h1 className="text-xl font-bold text-nexa-text">VHT Tedarikçi XML Feedleri</h1>
          <p className="text-sm text-nexa-text-secondary mt-1 max-w-2xl">
            24 tedarikçi XML feed&apos;i Thyronix kaynaklarına eklenir. URL&apos;ler sunucu yapılandırmasından okunur (
            <code className="text-[11px]">storage/thyronix/vht-supplier-feeds.json</code>).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runSeed(false)}
            disabled={seeding || syncing || !status?.configured}
            className="inline-flex items-center gap-1.5 rounded-lg bg-nexa-primary px-3 py-2 text-xs font-medium text-white hover:bg-nexa-primary/90 disabled:opacity-50"
          >
            <Database size={14} /> {seeding ? "Kaydediliyor…" : "Kaynakları Ekle / Güncelle"}
          </button>
          <button
            type="button"
            onClick={() => runSeed(true)}
            disabled={seeding || syncing || !status?.configured}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Senkronize…" : "Ekle + Tümünü Senkronize Et"}
          </button>
        </div>
      </div>

      {status && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
            <p className="text-xs text-nexa-text-secondary">Toplam feed</p>
            <p className="text-2xl font-bold text-nexa-text">{status.total}</p>
          </div>
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
            <p className="text-xs text-nexa-text-secondary">URL yapılandırılmış</p>
            <p className="text-2xl font-bold text-emerald-400">{status.configured}</p>
          </div>
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
            <p className="text-xs text-nexa-text-secondary">Eksik URL</p>
            <p className="text-2xl font-bold text-amber-400">{status.missing.length}</p>
          </div>
        </div>
      )}

      {status && status.missing.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-semibold mb-1">Eksik URL kodları: {status.missing.join(", ")}</p>
          <p className="text-xs opacity-80">
            Sunucuda <code>storage/thyronix/vht-supplier-feeds.json</code> dosyasını kontrol edin veya{" "}
            <code>VHT_FEED_&lt;CODE&gt;_URL</code> env değişkenlerini ayarlayın.
          </p>
        </div>
      )}

      {lastSeed && lastSeed.length > 0 && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4">
          <h2 className="text-sm font-semibold text-nexa-text mb-2">Son işlem sonucu</h2>
          <ul className="space-y-1 text-xs font-mono">
            {lastSeed.map((r) => (
              <li key={r.code} className={r.error ? "text-red-400" : "text-emerald-400"}>
                {r.error ? `✗ ${r.code}: ${r.error}` : `✓ ${r.code}${r.count != null ? ` — ${r.count} ürün` : ""}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-nexa-border">
          <Link2 size={16} className="text-nexa-primary" />
          <h2 className="text-sm font-semibold text-nexa-text">Feed listesi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-nexa-bg/50 text-nexa-text-secondary">
                <th className="px-4 py-2 text-left">Kod</th>
                <th className="px-4 py-2 text-left">Tedarikçi</th>
                <th className="px-4 py-2 text-left">Format</th>
                <th className="px-4 py-2 text-left">URL</th>
                <th className="px-4 py-2 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexa-border/50">
              {(status?.feeds || []).map((f) => (
                <tr key={f.code} className="hover:bg-nexa-hover/30">
                  <td className="px-4 py-2 font-mono text-nexa-primary">{f.code}</td>
                  <td className="px-4 py-2 text-nexa-text">{f.name}</td>
                  <td className="px-4 py-2 text-nexa-text-secondary">{f.inputFormat}</td>
                  <td className="px-4 py-2 font-mono text-nexa-text-secondary max-w-md truncate">{f.urlMasked || "—"}</td>
                  <td className="px-4 py-2 text-center">
                    {f.hasUrl ? (
                      <CheckCircle2 size={14} className="inline text-emerald-400" />
                    ) : (
                      <AlertCircle size={14} className="inline text-amber-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-nexa-text-secondary">
        CLI: <code>npm run seed:vht-feeds</code> · <code>npm run seed:vht-feeds -- --sync</code> · Test:{" "}
        <code>npm run test:vht-feeds</code>
      </p>
    </div>
  );
}
