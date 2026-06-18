"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";

export default function ThyronixSettingsPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/thyronix/reports").then(r=>r.json()).then(d=>{if(d.success)setStats(d.data)});
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold text-nexa-text">Settings</h1><p className="text-sm text-nexa-text-secondary mt-1">THYRONIX sistem yapılandırması ve durumu</p></div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-5">
        <h2 className="font-semibold text-nexa-text flex items-center gap-2"><Settings size={16}/> Genel Ayarlar</h2>
        {[
          { label: "Varsayılan Senkron Aralığı", value: "60 dk", desc: "Tüm kaynaklar için varsayılan senkronizasyon sıklığı" },
          { label: "Maksimum Ürün Sayısı", value: "50.000", desc: "Tek seferde işlenecek maksimum ürün limiti" },
          { label: "Batch Boyutu", value: "1000", desc: "Toplu işlem batch büyüklüğü" },
          { label: "Merge Stratejisi", value: "En Düşük Fiyat", desc: "Çakışma durumunda varsayılan seçim kriteri" },
          { label: "Log Saklama Süresi", value: "30 gün", desc: "Senkronizasyon loglarının saklanma süresi" },
        ].map((s,i)=>(
          <div key={i} className="flex items-center justify-between py-3 border-b border-nexa-border last:border-0">
            <div><p className="text-sm text-nexa-text">{s.label}</p><p className="text-xs text-nexa-text-secondary">{s.desc}</p></div>
            <span className="text-sm font-mono text-nexa-primary bg-nexa-primary/10 px-3 py-1 rounded">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
        <h2 className="font-semibold text-nexa-text">Sistem Bilgisi</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-nexa-text-secondary">Versiyon</span><p className="text-nexa-text font-medium">THYRONIX v1.0.0</p></div>
          <div><span className="text-nexa-text-secondary">Veritabanı</span><p className="text-nexa-text font-medium">SQLite (file: dev.db)</p></div>
          <div><span className="text-nexa-text-secondary">XML Parser</span><p className="text-nexa-text font-medium">fast-xml-parser</p></div>
          <div><span className="text-nexa-text-secondary">Motor</span><p className="text-nexa-text font-medium">Next.js 15.5</p></div>
          <div><span className="text-nexa-text-secondary">Toplam Ürün</span><p className="text-nexa-text font-medium">{stats?.products?.total?.toLocaleString() || "—"}</p></div>
          <div><span className="text-nexa-text-secondary">Aktif Kaynak</span><p className="text-nexa-text font-medium">{stats?.sources?.active || "—"}</p></div>
          <div><span className="text-nexa-text-secondary">Aktif Feed</span><p className="text-nexa-text font-medium">{stats?.feeds?.active || "—"}</p></div>
          <div><span className="text-nexa-text-secondary">XML Şablonu</span><p className="text-nexa-text font-medium">28 format</p></div>
        </div>
      </div>
    </div>
  );
}
