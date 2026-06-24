"use client";

import { useEffect, useState } from "react";
import { CreditCard, Check, X, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { getModuleLabel } from "@/lib/modules/labels";
import { statusLabel } from "@/lib/ui/turkish-labels";

export default function AdminModulePaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    fetch("/api/admin/payments/module-payments").then(r=>r.json()).then(d=>{if(d.success)setPayments(d.data);setLoading(false)});
  };
  useEffect(()=>{loadData()},[]);

  const handleAction = async (id: string, action: string) => {
    const res = await fetch(`/api/admin/payments/module-payments/${id}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});
    const d = await res.json();
    if (d.success) { toast.success(action==="approve"?"Onaylandı":"Reddedildi"); loadData(); }
    else toast.error(d.error||"Hata");
  };

  const statusColors: Record<string,string> = {PAID:"bg-green-500/10 text-green-400",FAILED:"bg-red-500/10 text-red-400",PENDING:"bg-amber-500/10 text-amber-400",WAITING_PAYMENT:"bg-amber-500/10 text-amber-400",MANUAL_REVIEW:"bg-blue-500/10 text-blue-400",CANCELLED:"bg-gray-500/10 text-gray-400",REFUNDED:"bg-gray-500/10 text-gray-400"};

  if(loading) return <div className="p-8 text-ena-text-muted">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-ena-text">Modül Ödemeleri</h1><p className="text-sm text-ena-text-muted mt-1">Ödeme onay/red yönetimi</p></div>
      <div className="rounded-xl border border-ena-border bg-ena-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ena-border"><th className="px-4 py-3 text-left text-ena-text-muted">Bayi</th><th className="px-4 py-3 text-left text-ena-text-muted">Modül</th><th className="px-4 py-3 text-left text-ena-text-muted">Paket</th><th className="px-4 py-3 text-right text-ena-text-muted">Tutar</th><th className="px-4 py-3 text-left text-ena-text-muted">Durum</th><th className="px-4 py-3 text-right text-ena-text-muted">İşlem</th></tr></thead>
          <tbody className="divide-y divide-ena-border">
            {payments.length===0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ena-text-muted">Henüz ödeme yok</td></tr> :
            payments.map((p:any)=>(
              <tr key={p.id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-ena-text font-mono text-xs">{p.dealerId?.substring(0,8)}...</td>
                <td className="px-4 py-3 text-ena-text">{getModuleLabel(p.moduleKey)}</td>
                <td className="px-4 py-3 text-ena-text">{p.planKey}</td>
                <td className="px-4 py-3 text-right text-ena-text font-medium">₺{p.amount}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status]||""}`}>{statusLabel(p.status)}</span></td>
                <td className="px-4 py-3 text-right space-x-1">
                  {p.status==="WAITING_PAYMENT" && <button onClick={()=>handleAction(p.id,"approve")} className="px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 rounded" title="Onayla"><Check size={12}/></button>}
                  {p.status==="MANUAL_REVIEW" && <button onClick={()=>handleAction(p.id,"approve")} className="px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 rounded" title="Onayla"><Check size={12}/></button>}
                  {(p.status==="WAITING_PAYMENT"||p.status==="MANUAL_REVIEW") && <button onClick={()=>handleAction(p.id,"reject")} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded" title="Reddet"><X size={12}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
