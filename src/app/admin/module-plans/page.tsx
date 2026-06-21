"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminModulePlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({moduleKey:"THYRONIX",planKey:"",name:"",description:"",monthlyPrice:0,yearlyPrice:0,featuresJson:"[]",limitsJson:"{}",isActive:true,sortOrder:0});
  const [editing, setEditing] = useState<any>(null);

  const loadData = () => {
    fetch("/api/admin/module-plans").then(r=>r.json()).then(d=>{if(d.success)setPlans(d.data);setLoading(false)});
  };
  useEffect(()=>{loadData()},[]);

  const handleSave = async () => {
    const body = {...form,monthlyPrice:Number(form.monthlyPrice),yearlyPrice:Number(form.yearlyPrice),sortOrder:Number(form.sortOrder)};
    const res = await fetch(editing?`/api/admin/module-plans/${editing.id}`:"/api/admin/module-plans",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d = await res.json();
    if(d.success){toast.success(editing?"Güncellendi":"Oluşturuldu");setForm({moduleKey:"THYRONIX",planKey:"",name:"",description:"",monthlyPrice:0,yearlyPrice:0,featuresJson:"[]",limitsJson:"{}",isActive:true,sortOrder:0});setEditing(null);loadData();}
    else toast.error(d.error||"Hata");
  };

  const handleDelete = async (id:string) => {await fetch(`/api/admin/module-plans/${id}`,{method:"DELETE"});toast.success("Silindi");loadData();};

  if(loading) return <div className="p-8 text-ena-text-muted">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-ena-text">Modül Planları</h1><p className="text-sm text-ena-text-muted mt-1">Paket ve fiyatlandırma yönetimi</p></div>
        <button onClick={()=>setEditing({})} className="flex items-center gap-2 px-4 py-2 bg-ena-primary text-white text-sm rounded-lg hover:brightness-90"><Plus size={14}/> Yeni Plan</button>
      </div>

      {editing && (
        <div className="rounded-xl border border-ena-border bg-ena-card p-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select value={form.moduleKey} onChange={e=>setForm({...form,moduleKey:e.target.value})} className="rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-sm text-ena-text"><option value="THYRONIX">THYRONIX</option><option value="HIVE">HIVE</option><option value="HIVE_PRO">HIVE Pro</option><option value="LINKSLASH">LinkSlash</option><option value="POD_CREATOR">POD Creator</option></select>
            <input value={form.planKey} onChange={e=>setForm({...form,planKey:e.target.value})} placeholder="Plan key (starter)" className="rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-sm text-ena-text"/>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Plan adı" className="rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-sm text-ena-text"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.monthlyPrice} onChange={e=>setForm({...form,monthlyPrice:Number(e.target.value)})} placeholder="Aylık fiyat" className="rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-sm text-ena-text"/>
            <input type="number" value={form.yearlyPrice} onChange={e=>setForm({...form,yearlyPrice:Number(e.target.value)})} placeholder="Yıllık fiyat" className="rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-sm text-ena-text"/>
          </div>
          <textarea value={form.featuresJson} onChange={e=>setForm({...form,featuresJson:e.target.value})} placeholder='Özellikler JSON: ["Özellik 1","Özellik 2"]' rows={3} className="w-full rounded-lg border border-ena-border bg-ena-dark px-3 py-2 text-xs font-mono text-ena-text"/>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setEditing(null)} className="px-4 py-2 text-sm text-ena-text-muted">İptal</button>
            <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 bg-ena-primary text-white text-sm rounded-lg"><Save size={14}/> {editing?.id?"Güncelle":"Oluştur"}</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-ena-border bg-ena-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ena-border"><th className="px-4 py-3 text-left text-ena-text-muted">Modül</th><th className="px-4 py-3 text-left text-ena-text-muted">Key</th><th className="px-4 py-3 text-left text-ena-text-muted">Ad</th><th className="px-4 py-3 text-right text-ena-text-muted">Aylık</th><th className="px-4 py-3 text-right text-ena-text-muted">Yıllık</th><th className="px-4 py-3 text-center text-ena-text-muted">Aktif</th><th className="px-4 py-3 text-right text-ena-text-muted">İşlem</th></tr></thead>
          <tbody className="divide-y divide-ena-border">
            {plans.map(p=>(
              <tr key={p.id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-ena-text">{p.moduleKey}</td>
                <td className="px-4 py-3 text-ena-text-muted font-mono text-xs">{p.planKey}</td>
                <td className="px-4 py-3 text-ena-text">{p.name}</td>
                <td className="px-4 py-3 text-right text-ena-text">₺{p.monthlyPrice}</td>
                <td className="px-4 py-3 text-right text-ena-text">₺{p.yearlyPrice}</td>
                <td className="px-4 py-3 text-center">{p.isActive?"✅":"❌"}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={()=>{setEditing(p);setForm({moduleKey:p.moduleKey,planKey:p.planKey,name:p.name,description:p.description||"",monthlyPrice:p.monthlyPrice,yearlyPrice:p.yearlyPrice,featuresJson:p.featuresJson||"[]",limitsJson:p.limitsJson||"{}",isActive:p.isActive,sortOrder:p.sortOrder})}} className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded">Düzenle</button>
                  <button onClick={()=>handleDelete(p.id)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
