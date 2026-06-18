"use client";

import { useEffect, useState } from "react";
import { GitBranch, Plus, Trash2, Save, X } from "lucide-react";
import toast from "react-hot-toast";

interface ThyronixRule { id: string; name: string; description?: string; priority: number; field: string; operator: string; value: string; action: string; actionValue?: string; status: string; affectedCount: number; }

const FIELDS = ["price","stock","name","brand","category","barcode","status"];
const OPERATORS = [{v:"lt",l:"Küçükse (<)"},{v:"gt",l:"Büyükse (>)"},{v:"eq",l:"Eşitse (=)"},{v:"contains",l:"İçeriyorsa"},{v:"empty",l:"Boşsa"}];
const ACTIONS = [{v:"setStatus",l:"Durum Değiştir"},{v:"adjustPrice",l:"Fiyat Ayarla"},{v:"setStock",l:"Stok Ayarla"},{v:"exclude",l:"Hariç Tut"}];

export default function ThyronixRulesPage() {
  const [rules, setRules] = useState<ThyronixRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ThyronixRule|null>(null);
  const [form, setForm] = useState({name:"",description:"",field:"price",operator:"lt",value:"",action:"setStatus",actionValue:"",priority:0});
  const [saving, setSaving] = useState(false);

  const fetchRules = () => {
    fetch("/api/admin/nexa-rules").then(r=>r.json()).then(d=>{if(d.success)setRules(d.data);setLoading(false)});
  };
  useEffect(()=>{fetchRules()},[]);

  const resetForm = () => { setForm({name:"",description:"",field:"price",operator:"lt",value:"",action:"setStatus",actionValue:"",priority:0}); setEditing(null); };

  const handleSave = async () => {
    if(!form.name.trim()) return toast.error("Kural adı girin");
    setSaving(true);
    const body:any = {...form, priority:Number(form.priority)};
    const res = await fetch(`/api/admin/nexa-rules${editing?`/${editing.id}`:""}`, {
      method: editing?"PUT":"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
    });
    if(res.ok) { toast.success(editing?"Güncellendi":"Oluşturuldu"); resetForm(); fetchRules(); }
    else { const e = await res.json(); toast.error(e.error||"Hata"); }
    setSaving(false);
  };

  const handleDelete = async (id:string) => {
    if(!confirm("Bu kuralı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/nexa-rules/${id}`,{method:"DELETE"});
    toast.success("Silindi"); fetchRules();
  };

  const handleSimulate = async (id:string) => {
    toast.loading("Simülasyon yapılıyor...");
    const res = await fetch(`/api/admin/nexa-rules/${id}/simulate`);
    const d = await res.json();
    toast.dismiss();
    if(d.success) toast.success(`${d.data.count} ürün etkilenecek`);
    else toast.error(d.error||"Hata");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-nexa-text">Rules</h1><p className="text-sm text-nexa-text-secondary mt-1">IF/THEN kural motoru</p></div>
        <button onClick={()=>{resetForm();setEditing({} as any)}} className="flex items-center gap-2 px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
          <Plus size={14}/> Yeni Kural
        </button>
      </div>

      {editing && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-nexa-text">{editing.id?"Kural Düzenle":"Yeni Kural"}</h2>
            <button onClick={resetForm} className="text-nexa-text-secondary hover:text-nexa-text"><X size={16}/></button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Kural adı" className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50" />
            <input value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Açıklama (opsiyonel)" className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" />
            <input type="number" value={form.priority} onChange={e=>setForm({...form,priority:Number(e.target.value)})} placeholder="Öncelik" className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" />
          </div>
          <p className="text-xs text-nexa-text-secondary">IF</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <select value={form.field} onChange={e=>setForm({...form,field:e.target.value})} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none"><option value="">Alan</option>{FIELDS.map(f=><option key={f} value={f}>{f}</option>)}</select>
            <select value={form.operator} onChange={e=>setForm({...form,operator:e.target.value})} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none"><option value="">Operatör</option>{OPERATORS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
            {form.operator!=="empty"&&<input value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder="Değer" className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" />}
          </div>
          <p className="text-xs text-nexa-text-secondary">THEN</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={form.action} onChange={e=>setForm({...form,action:e.target.value})} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none"><option value="">Aksiyon</option>{ACTIONS.map(a=><option key={a.v} value={a.v}>{a.l}</option>)}</select>
            <input value={form.actionValue||""} onChange={e=>setForm({...form,actionValue:e.target.value})} placeholder={form.action==="adjustPrice"?"Yeni fiyat":"Aksiyon değeri"} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" />
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">
            <Save size={14}/> {saving?"Kaydediliyor...":editing?.id?"Güncelle":"Oluştur"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Kural</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Koşul</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Aksiyon</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Öncelik</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Etkilenen</th>
            <th className="px-4 py-3 text-right font-semibold text-nexa-text-secondary">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {loading?<tr><td colSpan={5} className="px-4 py-12 text-center text-nexa-text-secondary">Yükleniyor...</td></tr>:
             rules.length===0?<tr><td colSpan={6} className="px-4 py-12 text-center text-nexa-text-secondary">Henüz kural eklenmemiş</td></tr>:
             rules.map(r=>(
               <tr key={r.id} className="hover:bg-nexa-hover transition-colors">
                 <td className="px-4 py-3"><div><p className="font-medium text-nexa-text">{r.name}</p><p className="text-[10px] text-nexa-text-secondary">{r.description}</p></div></td>
                 <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs bg-nexa-bg/50 px-2 py-0.5 rounded font-mono text-nexa-text-secondary">{r.field} {r.operator} {r.value||""}</span></td>
                 <td className="px-4 py-3"><span className="text-xs bg-nexa-primary/10 text-nexa-primary px-2 py-0.5 rounded">{r.action} {r.actionValue||""}</span></td>
                 <td className="px-4 py-3 hidden md:table-cell text-nexa-text-secondary">{r.priority}</td>
                 <td className="px-4 py-3 hidden md:table-cell"><button onClick={()=>handleSimulate(r.id)} className="text-xs bg-nexa-success/10 text-nexa-success px-2 py-0.5 rounded hover:bg-nexa-success/20">{r.affectedCount||"Simüle"}</button></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={()=>{setEditing(r);setForm({name:r.name,description:r.description||"",field:r.field,operator:r.operator,value:r.value,action:r.action,actionValue:r.actionValue||"",priority:r.priority})}} className="px-2 py-1 text-nexa-text-secondary hover:text-nexa-primary text-xs">Düzenle</button>
                  <button onClick={()=>handleDelete(r.id)} className="px-2 py-1 text-nexa-text-secondary hover:text-nexa-danger text-xs"><Trash2 size={12} className="inline"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
