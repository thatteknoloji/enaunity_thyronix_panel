"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Activity } from "lucide-react";

export default function ThyronixSyncPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/nexa-logs?page=1&size=50").then(r=>r.json()).then(d=>{
      if(d.success) setLogs(d.data.items||d.data||[]);
      setLoading(false);
    });
  }, []);

  const success = logs.filter(l=>l.status==="success").length;
  const warning = logs.filter(l=>l.status==="warning").length;
  const error = logs.filter(l=>l.status==="error").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Sync</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Senkronizasyon durumu ve geçmişi</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4"><p className="text-2xl font-bold text-nexa-success">{success}</p><p className="text-xs text-nexa-text-secondary mt-1">Başarılı</p></div>
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4"><p className="text-2xl font-bold text-nexa-warning">{warning}</p><p className="text-xs text-nexa-text-secondary mt-1">Uyarı</p></div>
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4"><p className="text-2xl font-bold text-nexa-danger">{error}</p><p className="text-xs text-nexa-text-secondary mt-1">Hatalı</p></div>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Tip</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Mesaj</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Ürün</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Süre</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Durum</th>
          </tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {loading?<tr><td colSpan={5} className="px-4 py-12 text-center text-nexa-text-secondary">Yükleniyor...</td></tr>:
            logs.length===0?<tr><td colSpan={5} className="px-4 py-12 text-center text-nexa-text-secondary">Henüz senkronizasyon kaydı yok</td></tr>:
            logs.map((l,i)=>(
              <tr key={l.id||i} className="hover:bg-nexa-hover transition-colors">
                <td className="px-4 py-3"><span className="text-xs bg-nexa-primary/10 text-nexa-primary px-2 py-0.5 rounded capitalize">{l.type||"sync"}</span></td>
                <td className="px-4 py-3 text-nexa-text-secondary text-xs max-w-xs truncate">{l.message||"—"}</td>
                <td className="px-4 py-3 text-nexa-text">{l.productCount||0}</td>
                <td className="px-4 py-3 text-nexa-text-secondary text-xs">{l.duration ? `${l.duration}ms` : "—"}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${l.status==="success"?"bg-nexa-success/10 text-nexa-success":l.status==="warning"?"bg-nexa-warning/10 text-nexa-warning":"bg-nexa-danger/10 text-nexa-danger"}`}>{l.status||"success"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
