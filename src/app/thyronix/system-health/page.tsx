"use client";

import { useEffect, useState } from "react";
import { Activity, Link2, Radio, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function SystemHealthPage() {
  const [dash, setDash] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/thyronix/dashboard").then((r) => r.json()),
      fetch("/api/thyronix/health/summary").then((r) => r.json()),
    ]).then(([d, h]) => {
      if (d.success) setDash(d.data);
      if (h.success) setHealth(h.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-64 rounded-xl bg-nexa-card border border-nexa-border" />;

  const lastError = (dash?.recentSyncs || []).find((l: any) => l.status !== "success");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text flex items-center gap-2">
          <Activity size={24} className="text-nexa-primary" /> Sistem Sağlığı
        </h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Kaynak, feed ve senkronizasyon durumu</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Link2, label: "Kaynak Sağlığı", val: `${dash?.activeSources ?? 0}/${dash?.totalSources ?? 0} aktif`, ok: (dash?.activeSources ?? 0) > 0 },
          { icon: Radio, label: "Feed Sağlığı", val: `${dash?.health?.feedHealthScore ?? 0}%`, ok: (dash?.health?.feedHealthScore ?? 0) >= 80 },
          { icon: RefreshCw, label: "Sync Başarısı", val: `${dash?.health?.syncSuccessRate ?? 0}%`, ok: (dash?.health?.syncSuccessRate ?? 0) >= 90 },
          { icon: AlertTriangle, label: "Son Hata", val: lastError ? "Var" : "Yok", ok: !lastError },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-nexa-border bg-nexa-card p-5">
            <c.icon size={18} className={c.ok ? "text-nexa-success mb-2" : "text-nexa-warning mb-2"} />
            <p className="text-xl font-bold text-nexa-text">{c.val}</p>
            <p className="text-xs text-nexa-text-secondary mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {lastError && (
        <div className="rounded-xl border border-nexa-warning/30 bg-nexa-warning/5 p-5">
          <h3 className="font-semibold text-nexa-text text-sm mb-2">Son Hata</h3>
          <p className="text-sm text-nexa-text-secondary">{lastError.message || lastError.type}</p>
          <p className="text-xs text-nexa-text-secondary mt-1">{lastError.createdAt ? new Date(lastError.createdAt).toLocaleString("tr-TR") : ""}</p>
        </div>
      )}

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-5">
        <h3 className="font-semibold text-nexa-text text-sm mb-4">Ürün Kalite Sorunları</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { l: "Barkod eksik", v: health?.missingBarcode },
            { l: "Marka eksik", v: health?.missingBrand },
            { l: "Kategori eksik", v: health?.missingCategory },
            { l: "Fiyat sıfır", v: health?.zeroPrice },
          ].map((i) => (
            <div key={i.l} className="p-3 rounded-lg border border-nexa-border">
              <p className="text-lg font-bold text-nexa-text">{(i.v ?? 0).toLocaleString("tr-TR")}</p>
              <p className="text-xs text-nexa-text-secondary">{i.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/thyronix/sources" className="text-sm text-nexa-primary hover:underline">Kaynakları İncele</Link>
        <Link href="/thyronix/feeds" className="text-sm text-nexa-primary hover:underline">Feed Merkezi</Link>
        <Link href="/thyronix/logs" className="text-sm text-nexa-primary hover:underline">Loglar</Link>
      </div>
    </div>
  );
}
