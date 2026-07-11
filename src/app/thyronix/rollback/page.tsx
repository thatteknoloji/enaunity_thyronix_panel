"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, Camera, Check, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface Snapshot { id: string; label: string; type: string; productCount: number; activeCount: number; passiveCount: number; errorCount: number; createdAt: string; }

export default function ThyronixRollbackPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string|null>(null);

  const loadData = () => { fetch("/api/thyronix/snapshots").then(r=>r.json()).then(d=>{if(d.success)setSnapshots(d.data);setLoading(false)}); };
  useEffect(()=>{loadData()},[]);

  const createSnapshot = async () => {
    setCreating(true);
    const res = await fetch("/api/thyronix/snapshots", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({label:`Manuel ${new Date().toLocaleString("tr-TR")}`,type:"manual",includeData:true}) });
    const d = await res.json();
    if (d.success) toast.success("Snapshot oluşturuldu"); else toast.error(d.error||"Hata");
    setCreating(false); loadData();
  };

  const restoreSnapshot = async (id: string) => {
    if (!confirm("Bu snapshot'a geri dönmek istediğinize emin misiniz? Mevcut değişiklikler kaybolur!")) return;
    setRestoring(id);
    const res = await fetch("/api/thyronix/rollback", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({snapshotId:id}) });
    const d = await res.json();
    if (d.success) toast.success(`${d.data.restored} ürün geri yüklendi`); else toast.error(d.error||"Hata");
    setRestoring(null); loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-nexa-text">Rollback & Snapshots</h1><p className="text-sm text-nexa-text-secondary mt-1">Değişiklik geçmişi ve geri alma</p></div>
        <button onClick={createSnapshot} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-nexa-primary text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
          <Camera size={14}/> {creating?"Oluşturuluyor...":"Snapshot Al"}
        </button>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Snapshot</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Tip</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Ürün</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Aktif</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Pasif</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Tarih</th>
            <th className="px-4 py-3 text-right font-semibold text-nexa-text-secondary">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-nexa-text-secondary">Yükleniyor...</td></tr> :
            snapshots.length===0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-nexa-text-secondary">Henüz snapshot yok. Senkronizasyon veya manuel snapshot alın.</td></tr> :
            snapshots.map(s=>(
              <tr key={s.id} className="hover:bg-nexa-hover">
                <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className={`h-8 w-8 rounded flex items-center justify-center shrink-0 ${s.type==="sync"?"bg-nexa-success/10":"bg-nexa-primary/10"}`}>{s.type==="sync"?<Check size={14} className="text-nexa-success"/>:<Camera size={14} className="text-nexa-primary"/>}</div><p className="font-medium text-nexa-text">{s.label}</p></div></td>
                <td className="px-4 py-3"><span className="text-xs bg-nexa-bg/50 px-2 py-0.5 rounded text-nexa-text-secondary capitalize">{s.type}</span></td>
                <td className="px-4 py-3 font-medium text-nexa-text">{s.productCount.toLocaleString("tr-TR")}</td>
                <td className="px-4 py-3 hidden md:table-cell text-nexa-success">{s.activeCount.toLocaleString("tr-TR")}</td>
                <td className="px-4 py-3 hidden md:table-cell text-nexa-warning">{s.passiveCount}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-nexa-text-secondary">{new Date(s.createdAt).toLocaleString("tr-TR")}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={()=>restoreSnapshot(s.id)} disabled={restoring===s.id || !s.errorCount} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${s.errorCount||s.type==="sync" ? "bg-nexa-warning/10 text-nexa-warning border border-nexa-warning/20 hover:bg-nexa-warning/20" : "bg-nexa-bg/50 text-nexa-text-secondary/50 cursor-not-allowed"}`}>
                    <RotateCcw size={12}/> {restoring===s.id?"Yükleniyor...":"Geri Yükle"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-2">
        <h2 className="font-semibold text-nexa-text text-sm flex items-center gap-2"><AlertTriangle size={14} className="text-nexa-warning"/> Geri Alma Rehberi</h2>
        <p className="text-xs text-nexa-text-secondary">Her senkronizasyon sonrası otomatik snapshot alınır. Snapshot'lar ürün fiyat, stok, marka, kategori bilgilerini içerir.</p>
        <p className="text-xs text-nexa-text-secondary">Geri yükleme işlemi geri alınamaz! Önce manuel snapshot almanız önerilir.</p>
      </div>
    </div>
  );
}
