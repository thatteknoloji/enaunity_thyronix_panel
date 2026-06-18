"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

export default function ThyronixLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const SIZE = 50;

  const fetchLogs = (p: number) => {
    setLoading(true);
    fetch(`/api/admin/nexa-logs?page=${p}&size=${SIZE}`).then(r=>r.json()).then(d=>{
      if(d.success){ setLogs(d.data.items||d.data||[]); setTotal(d.data.total||0); }
      setLoading(false);
    });
  };

  useEffect(()=>{fetchLogs(page)},[page]);

  const totalPages = Math.max(1, Math.ceil(total / SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Logs</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Sistem logları ve etkinlik geçmişi</p>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Tarih</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Tip</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Mesaj</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Ürün</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Durum</th>
          </tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {loading?<tr><td colSpan={5} className="px-4 py-12 text-center text-nexa-text-secondary">Yükleniyor...</td></tr>:
            logs.length===0?<tr><td colSpan={5} className="px-4 py-12 text-center text-nexa-text-secondary">Henüz log kaydı yok</td></tr>:
            logs.map((l,i)=>(
              <tr key={l.id||i} className="hover:bg-nexa-hover transition-colors">
                <td className="px-4 py-3 text-nexa-text-secondary text-xs">{l.createdAt ? new Date(l.createdAt).toLocaleString("tr-TR") : "—"}</td>
                <td className="px-4 py-3"><span className="text-xs bg-nexa-primary/10 text-nexa-primary px-2 py-0.5 rounded">{l.type||"sync"}</span></td>
                <td className="px-4 py-3 text-nexa-text-secondary text-xs max-w-md truncate">{l.message||"—"}</td>
                <td className="px-4 py-3 hidden md:table-cell text-nexa-text">{l.productCount||0}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${l.status==="success"?"bg-nexa-success/10 text-nexa-success":l.status==="warning"?"bg-nexa-warning/10 text-nexa-warning":"bg-nexa-danger/10 text-nexa-danger"}`}>{l.status||"success"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} className="px-3 py-1.5 rounded text-xs bg-nexa-card border border-nexa-border text-nexa-text-secondary disabled:opacity-30">←</button>
          <span className="text-xs text-nexa-text-secondary">{page}/{totalPages} ({total} kayıt)</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} className="px-3 py-1.5 rounded text-xs bg-nexa-card border border-nexa-border text-nexa-text-secondary disabled:opacity-30">→</button>
        </div>
      )}
    </div>
  );
}
