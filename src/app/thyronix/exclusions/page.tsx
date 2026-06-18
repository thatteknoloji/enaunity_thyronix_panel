"use client";

import { useEffect, useState } from "react";
import { ShieldBan, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Exclusion { id: string; type: string; value: string; reason?: string; createdAt: string; }

const EXCLUSION_TYPES = [
  { v: "brand", l: "Marka", ph: "örn: BEZOS" },
  { v: "category", l: "Kategori", ph: "örn: Tasarım Kupalar" },
  { v: "barcode", l: "Barkod", ph: "örn: 8683140943264" },
  { v: "product", l: "Ürün Adı (içerir)", ph: "örn: Test" },
  { v: "price_below", l: "Fiyat Altı", ph: "örn: 100" },
  { v: "stock_below", l: "Stok Altı", ph: "örn: 5" },
];

export default function ThyronixExclusionsPage() {
  const [items, setItems] = useState<Exclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "brand", value: "", reason: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/nexa-exclusions").then(r=>r.json()).then(d=>{if(d.success)setItems(d.data);setLoading(false)});
  }, []);

  const handleSave = async () => {
    if (!form.value.trim()) return toast.error("Değer girin");
    setSaving(true);
    const res = await fetch("/api/admin/nexa-exclusions", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    if (res.ok) { toast.success("Eklendi"); setForm({type:"brand",value:"",reason:""}); 
      fetch("/api/admin/nexa-exclusions").then(r=>r.json()).then(d=>{if(d.success)setItems(d.data)}); }
    else toast.error("Hata");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu hariç tutmayı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/nexa-exclusions/${id}`, { method:"DELETE" });
    toast.success("Silindi");
    setItems(items.filter(i=>i.id!==id));
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-nexa-text">Exclusion Center</h1><p className="text-sm text-nexa-text-secondary mt-1">Hariç tutma kuralları — istenmeyen ürün/marka/kategorileri feed'den çıkarın</p></div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6 space-y-3">
        <h2 className="font-semibold text-nexa-text text-sm">Yeni Hariç Tutma</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none">
            {EXCLUSION_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <input value={form.value} onChange={e=>setForm({...form,value:e.target.value})}
            className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none col-span-2"
            placeholder={EXCLUSION_TYPES.find(t=>t.v===form.type)?.ph||"Değer"} />
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2 bg-nexa-primary text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
            <Plus size={14}/> {saving?"Ekleniyor...":"Ekle"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Tip</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Değer</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Açıklama</th>
            <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Tarih</th>
            <th className="px-4 py-3 text-right font-semibold text-nexa-text-secondary">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-nexa-border">
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-nexa-text-secondary">Yükleniyor...</td></tr> :
            items.length===0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-nexa-text-secondary">Henüz hariç tutma kuralı yok</td></tr> :
            items.map(e=>(
              <tr key={e.id} className="hover:bg-nexa-hover">
                <td className="px-4 py-3"><span className="text-xs bg-nexa-danger/10 text-nexa-danger px-2 py-0.5 rounded">{EXCLUSION_TYPES.find(t=>t.v===e.type)?.l||e.type}</span></td>
                <td className="px-4 py-3 text-nexa-text font-mono text-xs">{e.value}</td>
                <td className="px-4 py-3 hidden md:table-cell text-nexa-text-secondary text-xs">{e.reason||"—"}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-nexa-text-secondary">{new Date(e.createdAt).toLocaleDateString("tr-TR")}</td>
                <td className="px-4 py-3 text-right"><button onClick={()=>handleDelete(e.id)} className="text-nexa-text-secondary hover:text-nexa-danger"><Trash2 size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
