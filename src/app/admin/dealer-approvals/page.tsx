"use client";

import { useEffect, useState } from "react";
import { Users, Check, X, Clock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDealerApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    fetch("/api/admin/dealer-approvals").then(r=>r.json()).then(d=>{if(d.success)setApprovals(d.data);setLoading(false)});
  };
  useEffect(()=>{loadData()},[]);

  const handleAction = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/dealer-approvals/${id}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
    const d = await res.json();
    if (d.success) { toast.success(status==="ACTIVE"?"Onaylandı":status==="REJECTED"?"Reddedildi":"Askıya alındı"); loadData(); }
    else toast.error(d.error||"Hata");
  };

  const statusColors: Record<string,string> = {
    ACTIVE:"bg-green-500/10 text-green-400",PENDING_PROFILE:"bg-amber-500/10 text-amber-400",PENDING_DOCUMENTS:"bg-amber-500/10 text-amber-400",PENDING_PAYMENT:"bg-amber-500/10 text-amber-400",PENDING_ADMIN_APPROVAL:"bg-blue-500/10 text-blue-400",REJECTED:"bg-red-500/10 text-red-400",SUSPENDED:"bg-gray-500/10 text-gray-400"
  };

  if(loading) return <div className="p-8 text-ena-text-muted">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-ena-text">Bayi Onayları</h1><p className="text-sm text-ena-text-muted mt-1">Bayi başvurularını yönetin</p></div>
      <div className="rounded-xl border border-ena-border bg-ena-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ena-border"><th className="px-4 py-3 text-left text-ena-text-muted">Bayi ID</th><th className="px-4 py-3 text-left text-ena-text-muted">Durum</th><th className="px-4 py-3 text-left text-ena-text-muted hidden md:table-cell">Evrak</th><th className="px-4 py-3 text-left text-ena-text-muted hidden md:table-cell">Ödeme</th><th className="px-4 py-3 text-right text-ena-text-muted">İşlem</th></tr></thead>
          <tbody className="divide-y divide-ena-border">
            {approvals.length===0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-ena-text-muted">Henüz başvuru yok</td></tr> :
            approvals.map((a:any)=>(
              <tr key={a.id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-ena-text font-mono text-xs">{a.dealerId?.substring(0,12)}...</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[a.status]||""}`}>{a.status}</span></td>
                <td className="px-4 py-3 hidden md:table-cell text-ena-text-muted text-xs">{a.documentStatus}</td>
                <td className="px-4 py-3 hidden md:table-cell text-ena-text-muted text-xs">{a.paymentStatus}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  {a.status!=="ACTIVE" && <button onClick={()=>handleAction(a.id,"ACTIVE")} className="px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 rounded" title="Onayla"><Check size={12}/></button>}
                  {a.status!=="REJECTED" && <button onClick={()=>handleAction(a.id,"REJECTED")} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded" title="Reddet"><X size={12}/></button>}
                  {a.status==="ACTIVE" && <button onClick={()=>handleAction(a.id,"SUSPENDED")} className="px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10 rounded" title="Askıya Al"><Clock size={12}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
