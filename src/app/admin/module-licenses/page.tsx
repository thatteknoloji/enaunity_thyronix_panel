"use client";

import { useEffect, useState } from "react";
import { Shield, Check, X, Clock, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { getModuleLabel, getStatusLabel } from "@/lib/modules/access";

export default function AdminModuleLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    fetch("/api/admin/module-licenses").then(r=>r.json()).then(d=>{if(d.success)setLicenses(d.data.items||d.data||[]);setLoading(false)});
  };
  useEffect(()=>{loadData()},[]);

  const handleAction = async (id: string, action: string) => {
    const res = await fetch(`/api/admin/module-licenses/${id}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:action})});
    const d = await res.json();
    if (d.success) { toast.success("Güncellendi"); loadData(); } else toast.error(d.error||"Hata");
  };

  const statusColors: Record<string,string> = {ACTIVE:"bg-green-500/10 text-green-400",TRIAL:"bg-blue-500/10 text-blue-400",PENDING_PAYMENT:"bg-amber-500/10 text-amber-400",PENDING_APPROVAL:"bg-amber-500/10 text-amber-400",INACTIVE:"bg-gray-500/10 text-gray-400",CANCELLED:"bg-red-500/10 text-red-400",EXPIRED:"bg-red-500/10 text-red-400"};

  if (loading) return <div className="p-8 text-ena-text-muted">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-ena-text">Modül Lisansları</h1><p className="text-sm text-ena-text-muted mt-1">Bayi modül lisanslarını yönetin</p></div>
      <div className="rounded-xl border border-ena-border bg-ena-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ena-border"><th className="px-4 py-3 text-left text-ena-text-muted">Bayi ID</th><th className="px-4 py-3 text-left text-ena-text-muted">Modül</th><th className="px-4 py-3 text-left text-ena-text-muted">Paket</th><th className="px-4 py-3 text-left text-ena-text-muted">Durum</th><th className="px-4 py-3 text-right text-ena-text-muted">İşlem</th></tr></thead>
          <tbody className="divide-y divide-ena-border">
            {licenses.length===0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-ena-text-muted">Henüz lisans yok</td></tr> :
            licenses.map((l:any)=>(
              <tr key={l.id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-ena-text font-mono text-xs">{l.dealerId?.substring(0,12)}...</td>
                <td className="px-4 py-3 text-ena-text">{getModuleLabel(l.moduleKey)}</td>
                <td className="px-4 py-3 text-ena-text">{l.planKey||"—"}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[l.status]||""}`}>{getStatusLabel(l.status)}</span></td>
                <td className="px-4 py-3 text-right space-x-1">
                  {l.status!=="ACTIVE" && <button onClick={()=>handleAction(l.id,"ACTIVE")} className="px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 rounded" title="Aktifleştir"><Check size={12}/></button>}
                  {l.status==="ACTIVE" && <button onClick={()=>handleAction(l.id,"SUSPENDED")} className="px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10 rounded" title="Askıya Al"><Clock size={12}/></button>}
                  <button onClick={()=>handleAction(l.id,"CANCELLED")} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded" title="İptal"><X size={12}/></button>
                  {l.status!=="TRIAL" && <button onClick={()=>handleAction(l.id,"TRIAL")} className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded" title="Deneme Başlat"><RotateCcw size={12}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
