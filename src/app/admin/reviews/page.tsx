"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageSquare, Check, X, Trash2, Star, Package } from "lucide-react";
import toast from "react-hot-toast";

interface Review { id: string; rating: number; comment: string; approved: boolean; createdAt: string; product: { name: string }; user: { name: string }; }

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all"|"pending"|"approved">("pending");

  const fetchReviews = () => {
    fetch("/api/admin/reviews").then(r=>r.json()).then(d=>setReviews(d.data||[])).finally(()=>setLoading(false));
  };

  useEffect(()=>{fetchReviews()},[]);

  const handleAction = async (id: string, approved: boolean) => {
    await fetch("/api/admin/reviews", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id, approved}) });
    fetchReviews(); toast.success(approved?"Onaylandı":"Reddedildi");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    await fetch("/api/admin/reviews", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) });
    fetchReviews(); toast.success("Silindi");
  };

  const filtered = filter==="pending"?reviews.filter(r=>!r.approved):filter==="approved"?reviews.filter(r=>r.approved):reviews;

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Ürün Yorumları</h1><p className="text-sm text-gray-500 mt-1">Toplam {reviews.length} yorum, {reviews.filter(r=>!r.approved).length} onay bekliyor</p></div>
      <div className="flex gap-2 mb-4">
        {(["all","pending","approved"] as const).map(f=>(<button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter===f?"bg-gray-900 text-white":"text-gray-500 hover:bg-gray-100"}`}>{f==="all"?"Tümü":f==="pending"?"Onay Bekleyen":"Onaylanmış"}</button>))}
      </div>
      {loading?<p className="text-gray-400 text-center py-12">Yükleniyor...</p>:filtered.length===0?(
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white"><MessageSquare size={40} className="mx-auto text-gray-300"/><p className="mt-3 text-gray-500">Yorum bulunamadı</p></div>
      ):(
        <div className="space-y-3">
          {filtered.map(r=>(
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{r.user.name}</span>
                    <div className="flex">{Array.from({length:5}).map((_,s)=><Star key={s} size={12} className={s<r.rating?"text-yellow-500 fill-yellow-500":"text-gray-300"}/>)}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.approved?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{r.approved?"Onaylı":"Bekliyor"}</span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Package size={10}/> {r.product.name} · {formatDate(r.createdAt)}</p>
                </div>
              </div>
              {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}
              <div className="flex gap-2 mt-3">
                {!r.approved && <Button size="sm" variant="outline" onClick={()=>handleAction(r.id,true)} className="text-emerald-600"><Check size={14} className="mr-1"/>Onayla</Button>}
                {!r.approved && <Button size="sm" variant="outline" onClick={()=>handleAction(r.id,false)} className="text-ena-primary"><X size={14} className="mr-1"/>Reddet</Button>}
                <Button size="sm" variant="ghost" onClick={()=>handleDelete(r.id)} className="text-ena-primary"><Trash2 size={14}/></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
