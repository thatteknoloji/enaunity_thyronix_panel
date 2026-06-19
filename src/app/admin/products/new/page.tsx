"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Save, Package, Barcode, Hash, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { toAdminUrl } from "@/lib/auth/admin-access";

interface VariantGroup { id?: string; name: string; options: string[]; }
interface VariantCombo { id?: string; sku: string; barcode: string; price: string; stock: string; options: string; }

const CATEGORIES = ["Cam Tablo","Mdf Tablo","Halı","Kilim","Perde","Nevresim","Yastık Kılıfı","Minder","Puzzle","Hediyelik Ürünler"];

function genSKU(cat: string, name: string): string { return `${cat.replace(/\s/g,"").slice(0,3)}-${name.replace(/\s/g,"").slice(0,3)}-${Date.now().toString(36).slice(-4)}`.toUpperCase(); }
function genBarcode(): string { return `2${Date.now().toString().slice(-11)}`; }
function cartesianProduct(arrays: any[][]): any[][] { if (arrays.length===0) return [[]]; const r: any[][] = []; const rest = cartesianProduct(arrays.slice(1)); for (const item of arrays[0]) for (const rr of rest) r.push([item,...rr]); return r; }

export default function ProductFormPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params?.id;
  const productId = params?.id || "";

  const [form, setForm] = useState({ name:"",description:"",price:"",image:"",category:"Cam Tablo",subcategory:"",brand:"",modelCode:"",sku:"",barcode:"",weight:"",dimensions:"",tags:"",stock:"",minStockLevel:"",maxStockLevel:"",backorderable:false,eta:"" });
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [variants, setVariants] = useState<VariantCombo[]>([]);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && productId) {
      Promise.all([fetch(`/api/products/${productId}`).then(r=>r.json()), fetch(`/api/admin/variants?productId=${productId}`).then(r=>r.json())])
        .then(([p, v]) => {
          const d = p.data || {};
          setForm({ name:d.name||"", description:d.description||"", price:String(d.price||""), image:d.image||"", category:d.category||"Cam Tablo", subcategory:d.subcategory||"", brand:d.brand||"", modelCode:d.modelCode||"", sku:d.sku||"", barcode:d.barcode||"", weight:String(d.weight||""), dimensions:d.dimensions||"", tags:d.tags||"", stock:String(d.stock||""), minStockLevel:String(d.minStockLevel||""), maxStockLevel:String(d.maxStockLevel||""), backorderable:d.backorderable||false, eta:d.eta||"" });
          try { const s=JSON.parse(d.specs||"[]"); setSpecs(Array.isArray(s)?s:[]); } catch { setSpecs([]); }
          if (v.success) {
            setVariantGroups((v.data.groups||[]).map((g:any)=>({id:g.id,name:g.name,options:g.options.map((o:any)=>o.value)})));
            setVariants((v.data.combinations||[]).map((c:any)=>({id:c.id,sku:c.sku,barcode:c.barcode,price:String(c.price),stock:String(c.stock),options:c.options})));
          }
        });
    }
  }, [isEdit, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const body = { ...form, price:parseFloat(form.price)||0, stock:parseInt(form.stock)||0, weight:parseFloat(form.weight)||0, minStockLevel:parseInt(form.minStockLevel)||0, maxStockLevel:parseInt(form.maxStockLevel)||0, backorderable:form.backorderable, eta:form.eta, specs:JSON.stringify(specs.filter(s=>s.key)) };
    const url = isEdit ? `/api/admin/products/${productId}` : "/api/admin/products";
    const res = await fetch(url, { method: isEdit?"PUT":"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json();
      const newProductId = isEdit ? productId : saved.data?.id;
      if (newProductId && variantGroups.length > 0) {
        for (const g of variantGroups) {
          if (!g.id) await fetch("/api/admin/variants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:newProductId,name:g.name,options:g.options,generateCombinations:false})});
        }
        for (const v of variants) {
          const vBody:any = { sku:v.sku,barcode:v.barcode,price:parseFloat(v.price)||0,stock:parseInt(v.stock)||0,options:v.options };
          if (v.id) await fetch("/api/admin/variants",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:v.id,...vBody})});
          else await fetch("/api/admin/variants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...vBody,productId:newProductId,generateCombinations:false})});
        }
      }
      toast.success(isEdit?"Güncellendi":"Ürün eklendi");
      router.push(toAdminUrl("/admin/products"));
    } else { const err = await res.json(); toast.error(err.error||"Hata"); }
    setSubmitting(false);
  };

  const addGroup = () => { if(!newGroupName.trim())return toast.error("Grup adı girin"); setVariantGroups([...variantGroups,{name:newGroupName.trim(),options:[]}]); setNewGroupName(""); };
  const addOption = (gi:number) => { const v=newOptionInputs[gi]?.trim(); if(!v)return; const u=[...variantGroups]; if(!u[gi].options.includes(v)){u[gi].options=[...u[gi].options,v];setVariantGroups(u);} setNewOptionInputs({...newOptionInputs,[gi]:""}); };
  const removeOption = (gi:number,oi:number) => { const u=[...variantGroups]; u[gi].options=u[gi].options.filter((_,j)=>j!==oi); setVariantGroups(u); };
  const removeGroup = (gi:number) => setVariantGroups(variantGroups.filter((_,j)=>j!==gi));
  const generateCombos = () => {
    if(!variantGroups.length||!variantGroups.some(g=>g.options.length))return toast.error("Önce grup ve seçenek ekleyin");
    const vals=variantGroups.map(g=>g.options.map(o=>({groupName:g.name,value:o})));
    const combos=cartesianProduct(vals);
    setVariants(combos.map((c:any[])=>({sku:`${form.modelCode||form.sku||"VAR"}-${c.map(x=>x.value).join("-")}`.toUpperCase().replace(/\s+/g,""),barcode:`2${Date.now().toString().slice(-11)}${Math.random().toString(36).slice(2,5)}`,price:form.price,stock:"0",options:JSON.stringify(c.map(x=>({group:x.groupName,value:x.value})))})));
    toast.success(`${combos.length} kombinasyon oluşturuldu`);
  };
  const addSpec = () => setSpecs([...specs,{key:"",value:""}]);
  const removeSpec = (i:number) => setSpecs(specs.filter((_,j)=>j!==i));
  const update = (k:string,v:string) => setForm({...form,[k]:v});
  const ic = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none";

  return (
    <div className="max-w-4xl">
      <Link href={toAdminUrl("/admin/products")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft size={14} /> Ürünlere Dön</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit?"Ürün Düzenle":"Yeni Ürün"}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Package size={16} /> Temel Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Ürün Adı *</label><input className={ic} value={form.name} onChange={e=>update("name",e.target.value)} required /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Marka</label><input className={ic} value={form.brand} onChange={e=>update("brand",e.target.value)} placeholder="Marka adı" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kategori</label><select className={ic} value={form.category} onChange={e=>update("category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Alt Kategori</label><input className={ic} value={form.subcategory} onChange={e=>update("subcategory",e.target.value)} placeholder="Alt kategori" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Fiyat (₺) *</label><input type="number" step="0.01" className={ic} value={form.price} onChange={e=>update("price",e.target.value)} required /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Stok *</label><input type="number" className={ic} value={form.stock} onChange={e=>update("stock",e.target.value)} required /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Min Stok Uyarı</label><input type="number" className={ic} value={form.minStockLevel} onChange={e=>update("minStockLevel",e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Maks Stok Limiti</label><input type="number" className={ic} value={form.maxStockLevel} onChange={e=>update("maxStockLevel",e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Etiketler</label><input className={ic} value={form.tags} onChange={e=>update("tags",e.target.value)} placeholder="etiket1, etiket2" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Ağırlık (kg)</label><input type="number" step="0.01" className={ic} value={form.weight} onChange={e=>update("weight",e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Boyutlar</label><input className={ic} value={form.dimensions} onChange={e=>update("dimensions",e.target.value)} placeholder="100x50x20 cm" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Görsel URL</label><input className={ic} value={form.image} onChange={e=>update("image",e.target.value)} placeholder="https://..." /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="backorderable" className="rounded border-gray-300" checked={form.backorderable as any} onChange={e => setForm({...form, backorderable: e.target.checked, eta: !e.target.checked ? "" : form.eta})} />
              <label htmlFor="backorderable" className="text-xs font-semibold text-gray-600 uppercase">Ön Siparişe İzin Ver</label>
            </div>
            {form.backorderable && (
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tahmini Teslimat (örn: 15-20 gün)</label><input className={ic} value={form.eta} onChange={e=>update("eta",e.target.value)} placeholder="15-20 iş günü" /></div>
            )}
          </div>
          <div className="mt-4"><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Açıklama</label><textarea className={ic} rows={4} value={form.description} onChange={e=>update("description",e.target.value)} required /></div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Barcode size={16} /> Kodlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Model Kodu (tüm varyantlarda aynı)</label><input className={ic} value={form.modelCode} onChange={e=>update("modelCode",e.target.value)} placeholder="xxxxxcamtablo01" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">SKU</label><div className="flex gap-1"><input className={ic} value={form.sku} onChange={e=>update("sku",e.target.value)} /><button type="button" onClick={()=>update("sku",genSKU(form.category,form.name))} className="px-2 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"><Hash size={14}/></button></div></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Barkod</label><div className="flex gap-1"><input className={ic} value={form.barcode} onChange={e=>update("barcode",e.target.value)} /><button type="button" onClick={()=>update("barcode",genBarcode())} className="px-2 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"><Barcode size={14}/></button></div></div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Varyant Matrisi (Grup × Seçenek = Kombinasyon)</h2>
          <p className="text-xs text-gray-400 mb-4">1. Grup ekle → 2. Seçenek gir → 3. Kombinasyon oluştur → 4. SKU/Barkod/Fiyat düzenle</p>
          <div className="flex gap-2 mb-4">
            <input className={ic} placeholder="Grup adı (örn: Boyut, Renk)" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addGroup())} />
            <button type="button" onClick={addGroup} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 shrink-0"><Plus size={14} className="mr-1 inline"/> Grup Ekle</button>
          </div>
          {variantGroups.map((g,gi)=>(
            <div key={gi} className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center justify-between mb-2"><span className="font-semibold text-sm text-gray-800">{g.name}</span><button type="button" onClick={()=>removeGroup(gi)} className="text-ena-primary hover:text-ena-primary"><Trash2 size={14}/></button></div>
              <div className="flex flex-wrap gap-1.5 mb-2">{g.options.map((o,oi)=>(<span key={oi} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded-full">{o}<button type="button" onClick={()=>removeOption(gi,oi)} className="text-gray-400 hover:text-ena-primary"><X size={10}/></button></span>))}</div>
              <div className="flex gap-1.5"><input className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none" placeholder="Seçenek (örn: 25x35, Kırmızı)" value={newOptionInputs[gi]||""} onChange={e=>setNewOptionInputs({...newOptionInputs,[gi]:e.target.value})} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addOption(gi))}/><button type="button" onClick={()=>addOption(gi)} className="px-3 py-1.5 bg-gray-100 text-xs rounded hover:bg-gray-200">Ekle</button></div>
            </div>
          ))}
          {variantGroups.length>0&&variantGroups.some(g=>g.options.length>0)&&(
            <button type="button" onClick={generateCombos} className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 mb-4">
              Kombinasyonları Oluştur ({variantGroups.reduce((a,g)=>a*Math.max(1,g.options.length),1)} varyant)
            </button>
          )}
          {variants.length>0&&(
            <div className="overflow-x-auto border border-gray-200 rounded-lg"><table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="px-2 py-2 text-left font-semibold text-gray-600">Varyant</th><th className="px-2 py-2 text-left font-semibold text-gray-600">SKU</th><th className="px-2 py-2 text-left font-semibold text-gray-600">Barkod</th><th className="px-2 py-2 text-left font-semibold text-gray-600">Fiyat</th><th className="px-2 py-2 text-left font-semibold text-gray-600">Stok</th></tr></thead><tbody className="divide-y divide-gray-100">
              {variants.map((v,i)=>{let opts:any[]=[];try{opts=JSON.parse(v.options)}catch{}return(
                <tr key={i} className="hover:bg-gray-50/50"><td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">{opts.map((o:any)=>`${o.group}: ${o.value}`).join(" | ")}</td>
                  <td className="px-2 py-1.5"><input className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none" value={v.sku} onChange={e=>{const n=[...variants];n[i].sku=e.target.value;setVariants(n)}}/></td>
                  <td className="px-2 py-1.5"><input className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs font-mono focus:outline-none" value={v.barcode} onChange={e=>{const n=[...variants];n[i].barcode=e.target.value;setVariants(n)}}/></td>
                  <td className="px-2 py-1.5"><input type="number" step="0.01" className="w-20 rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none" value={v.price} onChange={e=>{const n=[...variants];n[i].price=e.target.value;setVariants(n)}}/></td>
                  <td className="px-2 py-1.5"><input type="number" className="w-16 rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none" value={v.stock} onChange={e=>{const n=[...variants];n[i].stock=e.target.value;setVariants(n)}}/></td>
                </tr>
              )})}
            </tbody></table></div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-gray-700">Ürün Özellikleri</h2><button type="button" onClick={addSpec} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"><Plus size={12}/> Özellik Ekle</button></div>
          {specs.length===0?<p className="text-xs text-gray-400">Henüz özellik eklenmedi</p>:<div className="space-y-2">{specs.map((s,i)=>(<div key={i} className="flex gap-2 items-center"><input className={`${ic} flex-1`} placeholder="Özellik adı" value={s.key} onChange={e=>{const n=[...specs];n[i].key=e.target.value;setSpecs(n)}}/><input className={`${ic} flex-1`} placeholder="Değer" value={s.value} onChange={e=>{const n=[...specs];n[i].value=e.target.value;setSpecs(n)}}/><button type="button" onClick={()=>removeSpec(i)} className="p-2 text-ena-primary hover:text-ena-primary"><Trash2 size={14}/></button></div>))}</div>}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}><Save size={14} className="mr-1"/>{submitting?"Kaydediliyor...":isEdit?"Güncelle":"Ürünü Ekle"}</Button>
          <Link href={toAdminUrl("/admin/products")}><Button type="button" variant="outline">İptal</Button></Link>
        </div>
      </form>
    </div>
  );
}
