"use client";

import { useEffect, useState } from "react";
import { Tag, Plus, Trash2, Play } from "lucide-react";
import toast from "react-hot-toast";

interface BrandMapping { id: string; sourceBrand: string; targetBrand: string; sourceId?: string; status: string; affectedCount: number; }

export default function ThyronixBrandMappingPage() {
  const [mappings, setMappings] = useState<BrandMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ sourceBrand: "", targetBrand: "", sourceId: "" });
  const [saving, setSaving] = useState(false);

  const loadData = () => { fetch("/api/thyronix/brand-mapping").then(r=>r.json()).then(d=>{if(d.success)setMappings(d.data);setLoading(false)}); };
  useEffect(()=>{loadData()},[]);

  const handleSave = async () => {
    if (!form.sourceBrand.trim() || !form.targetBrand.trim()) return toast.error("Kaynak ve hedef marka gerekli");
    setSaving(true);
    const res = await fetch("/api/thyronix/brand-mapping", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { toast.success(`${d.data.affectedCount} ürün güncellendi`); setForm({sourceBrand:"",targetBrand:"",sourceId:""}); loadData(); }
    else toast.error(d.error||"Hata");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu eşleştirmeyi silmek istediğinize emin misiniz?")) return;
    await fetch("/api/thyronix/brand-mapping", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) });
    toast.success("Silindi"); loadData();
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-nexa-text">Private Label</h1><p className="text-sm text-nexa-text-secondary mt-1">Marka eşleştirme — XML'deki markaları kendi markanızla yayınlayın</p></div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-3">
        <h2 className="font-semibold text-nexa-text text-sm">Yeni Eşleştirme</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={form.sourceBrand} onChange={e=>setForm({...form,sourceBrand:e.target.value})}
            className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" placeholder="XML'deki marka (örn: ABC Home)" />
          <input value={form.targetBrand} onChange={e=>setForm({...form,targetBrand:e.target.value})}
            className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" placeholder="Yayınlanacak marka (örn: SizinMarka)" />
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2 bg-nexa-primary text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
            <Plus size={14}/> {saving?"Ekleniyor...":"Eşleştir"}
          </button>
        </div>
        <p className="text-[10px] text-nexa-text-secondary/60">💡 Eşleştirme otomatik uygulanır — her senkronizasyonda XML'deki markalar hedef markaya dönüştürülür.</p>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50"><th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">XML Markası</th><th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Yayınlanan</th><th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Ürün</th><th className="px-4 py-3 text-right font-semibold text-nexa-text-secondary">İşlem</th></tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-nexa-text-secondary">Yükleniyor...</td></tr> :
            mappings.length===0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-nexa-text-secondary">Henüz eşleştirme yok</td></tr> :
            mappings.map(m=>(
              <tr key={m.id} className="hover:bg-nexa-hover">
                <td className="px-4 py-3 text-nexa-text-secondary">{m.sourceBrand}</td>
                <td className="px-4 py-3"><span className="text-xs bg-nexa-primary/10 text-nexa-primary px-2 py-0.5 rounded">→ {m.targetBrand}</span></td>
                <td className="px-4 py-3 text-nexa-text">{m.affectedCount}</td>
                <td className="px-4 py-3 text-right"><button onClick={()=>handleDelete(m.id)} className="text-nexa-text-secondary hover:text-nexa-danger"><Trash2 size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
