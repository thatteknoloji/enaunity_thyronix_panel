"use client";

import { useEffect, useState } from "react";
import { Heart, Check, AlertTriangle, XCircle } from "lucide-react";

interface HealthItem { label: string; count: number; severity: "error"|"warning"|"info"; }

export default function ThyronixHealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/thyronix/health/summary").then(r=>r.json()).then(d=>{
      if (d.success) setData(d.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 rounded-xl bg-nexa-card"/></div>;

  const s = data || {};
  const items: HealthItem[] = [
    { label: "Kimlik Eksik", count: s.missingIdentity||0, severity: "error" },
    { label: "Barkod Eksik", count: s.missingBarcode||0, severity: "error" },
    { label: "KDV Eksik", count: s.missingVat||0, severity: "warning" },
    { label: "Marka Eksik", count: s.missingBrand||0, severity: "info" },
    { label: "Kategori Eksik", count: s.missingCategory||0, severity: "info" },
    { label: "Açıklama Eksik", count: s.missingDescription||0, severity: "warning" },
    { label: "Fiyat Sıfır", count: s.zeroPrice||0, severity: "warning" },
    { label: "Stok Sıfır", count: s.zeroStock||0, severity: "warning" },
    { label: "Negatif Fiyat", count: s.negativePrice||0, severity: "error" },
    { label: "Negatif Stok", count: s.negativeStock||0, severity: "error" },
    { label: "Feed Sayısı Uyuşmuyor", count: s.feedCountMismatch||0, severity: "warning" },
  ];
  const total = items.reduce((sum,i)=>sum+i.count,0);
  const errors = items.filter(i=>i.severity==="error").reduce((sum,i)=>sum+i.count,0);
  const warnings = items.filter(i=>i.severity==="warning").reduce((sum,i)=>sum+i.count,0);
  const sevColors: Record<string,string> = { error:"text-nexa-danger bg-nexa-danger/10", warning:"text-nexa-warning bg-nexa-warning/10", info:"text-nexa-text-secondary bg-nexa-bg/50" };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-nexa-text">Feed Sağlık Merkezi</h1><p className="text-sm text-nexa-text-secondary mt-1">Sunucu tarafında hesaplanan ürün sağlık özeti</p></div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4"><p className="text-2xl font-bold text-nexa-text">{total}</p><p className="text-xs text-nexa-text-secondary mt-1">Toplam Sorun</p></div>
        <div className="rounded-xl border border-nexa-danger/30 bg-nexa-card p-4"><p className="text-2xl font-bold text-nexa-danger">{errors}</p><p className="text-xs text-nexa-text-secondary mt-1">Kritik Hata</p></div>
        <div className="rounded-xl border border-nexa-warning/30 bg-nexa-card p-4"><p className="text-2xl font-bold text-nexa-warning">{warnings}</p><p className="text-xs text-nexa-text-secondary mt-1">Uyarı</p></div>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Sorun</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Seviye</th>
            <th className="px-4 py-3 text-right font-semibold text-nexa-text-secondary">Etkilenen Ürün</th>
          </tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {total===0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-nexa-success"><Check size={16} className="inline mr-1"/> Tüm kontroller başarılı! Feed yayına hazır.</td></tr> :
            items.filter(i=>i.count>0).map((i,idx)=>(
              <tr key={idx} className="hover:bg-nexa-hover">
                <td className="px-4 py-3 text-nexa-text">{i.label}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${sevColors[i.severity]}`}>{i.severity==="error"?"Kritik":"Uyarı"}</span></td>
                <td className="px-4 py-3 text-right font-medium text-nexa-text">{i.count.toLocaleString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
