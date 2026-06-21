"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Save, Package, Barcode, Hash, X } from "lucide-react";
import toast from "react-hot-toast";
import { toAdminUrl } from "@/lib/auth/admin-access";
import {
  ProductMerchandisingPanel,
  defaultMerchandisingState,
  type ProductMerchandisingState,
} from "@/components/admin/ProductMerchandisingPanel";
import { ProductImagesField } from "@/components/admin/ProductImagesField";

interface VariantGroup { id?: string; name: string; options: string[]; }
interface VariantCombo { id?: string; sku: string; barcode: string; price: string; stock: string; options: string; }

const CATEGORIES = ["Cam Tablo","Mdf Tablo","Halı","Kilim","Perde","Nevresim","Yastık Kılıfı","Minder","Puzzle","Hediyelik Ürünler"];
function genSKU(cat:string,n:string){return `${cat.replace(/\s/g,"").slice(0,3)}-${n.replace(/\s/g,"").slice(0,3)}-${Date.now().toString(36).slice(-4)}`.toUpperCase()}
function genBarcode(){return `2${Date.now().toString().slice(-11)}`}
function cartesianProduct(a:any[][]):any[][]{if(!a.length)return[[]];const r:any[][]=[];const rest=cartesianProduct(a.slice(1));for(const item of a[0])for(const rr of rest)r.push([item,...rr]);return r}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form,setForm]=useState({name:"",description:"",price:"",image:"",category:"Cam Tablo",subcategory:"",brand:"",modelCode:"",sku:"",barcode:"",weight:"",dimensions:"",tags:"",stock:"",minStockLevel:"",maxStockLevel:"",backorderable:false,eta:""});
  const [specs,setSpecs]=useState<{key:string;value:string}[]>([]);
  const [variants,setVariants]=useState<VariantCombo[]>([]);
  const [variantGroups,setVariantGroups]=useState<VariantGroup[]>([]);
  const [newGroupName,setNewGroupName]=useState("");
  const [newOptionInputs,setNewOptionInputs]=useState<Record<string,string>>({});
  const [newOptionPrices,setNewOptionPrices]=useState<Record<string,{price:string;stock:string}>>({});
  const [submitting,setSubmitting]=useState(false);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [imagesJson, setImagesJson] = useState("[]");
  const [merchandising, setMerchandising] = useState<ProductMerchandisingState>(defaultMerchandisingState());

  useEffect(() => {
    if (!id) { setLoadError("ID bulunamadı"); setLoading(false); return; }
    Promise.all([
      fetch(`/api/products/${id}`).then(r=>r.json()),
      fetch(`/api/admin/variants?productId=${id}`).then(r=>r.json()).catch(()=>({success:false})),
      fetch(`/api/admin/campaigns`).then(r=>r.json()).catch(()=>({success:false,data:[]})),
    ]).then(([p,v,camps]) => {
      if (!p.success) { setLoadError(p.error||"Ürün bulunamadı"); setLoading(false); return; }
      const d=p.data||{};
      setForm({name:d.name||"",description:d.description||"",price:String(d.price||""),image:d.image||"",category:d.category||"Cam Tablo",subcategory:d.subcategory||"",brand:d.brand||"",modelCode:d.modelCode||"",sku:d.sku||"",barcode:d.barcode||"",weight:String(d.weight||""),dimensions:d.dimensions||"",tags:d.tags||"",stock:String(d.stock||""),minStockLevel:String(d.minStockLevel||""),maxStockLevel:String(d.maxStockLevel||""),backorderable:d.backorderable||false,eta:d.eta||""});
      setImagesJson(d.images || "[]");
      try{const s=JSON.parse(d.specs||"[]");setSpecs(Array.isArray(s)?s:[])}catch{setSpecs([])}
      const assigned = (camps.data || [])
        .filter((c: { products?: { productId: string }[] }) =>
          c.products?.some((cp) => cp.productId === id)
        )
        .map((c: { id: string }) => c.id);
      setMerchandising({
        variantDisplayMode: d.variantDisplayMode || "buttons",
        salePrice: d.salePrice > 0 ? String(d.salePrice) : "",
        discountLabel: d.discountLabel || "",
        campaignIds: assigned,
      });
      if(v.success){
        setVariantGroups((v.data.groups||[]).map((g:any)=>({id:g.id,name:g.name,options:g.options.map((o:any)=>o.value)})));
        setVariants((v.data.combinations||[]).map((c:any)=>({id:c.id,sku:c.sku,barcode:c.barcode,price:String(c.price),stock:String(c.stock),options:c.options})))
      }
      setLoading(false);
    }).catch((e)=>{setLoading(false);setLoadError("Veri yüklenemedi: "+e.message);toast.error("Veri yüklenemedi")});
  },[id]);

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();setSubmitting(true);
    const specsArr=Array.isArray(specs)?specs:[];
    const body={
      ...form,
      price:parseFloat(form.price)||0,
      stock:parseInt(form.stock)||0,
      weight:parseFloat(form.weight)||0,
      minStockLevel:parseInt(form.minStockLevel)||0,
      maxStockLevel:parseInt(form.maxStockLevel)||0,
      backorderable:form.backorderable,
      eta:form.eta,
      specs:JSON.stringify(specsArr.filter(s=>s.key)),
      variantDisplayMode: merchandising.variantDisplayMode,
      salePrice: parseFloat(merchandising.salePrice) || 0,
      discountLabel: merchandising.discountLabel,
      campaignIds: merchandising.campaignIds,
      images: imagesJson,
    };
    const res=await fetch(`/api/admin/products/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(res.ok){
      for(const g of variantGroups){if(!g.id)await fetch("/api/admin/variants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:id,name:g.name,options:g.options,generateCombinations:false})})}
      for(const v of variants){const vBody:any={sku:v.sku,barcode:v.barcode,price:parseFloat(v.price)||0,stock:parseInt(v.stock)||0,options:v.options};if(v.id)await fetch("/api/admin/variants",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:v.id,...vBody})});else await fetch("/api/admin/variants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...vBody,productId:id,generateCombinations:false})})}
      toast.success("Güncellendi");router.push(toAdminUrl("/admin/products"));
    }else{const err=await res.json();toast.error(err.error||"Hata")}
    setSubmitting(false);
  };

  const addGroup=()=>{if(!newGroupName.trim())return toast.error("Grup adı girin");setVariantGroups([...variantGroups,{name:newGroupName.trim(),options:[]}]);setNewGroupName("")}

  const getOptionKey=(gi:number,val:string)=>gi+'_'+val;
  const getOptionPrice = (gi:number,val:string) => {
    const p = newOptionPrices[getOptionKey(gi,val)];
    return p ? { price: p.price || form.price, stock: p.stock || "0" } : { price: form.price, stock: "0" };
  };
  const regenerateCombos = (groups: typeof variantGroups, currentVariants: typeof variants) => {
    if (!groups.length || !groups.some(g => g.options.length)) return currentVariants;
    const vals = groups.map((g,gi) => g.options.map(o => ({ groupName: g.name, value: o, groupIndex: gi })));
    const allCombos = cartesianProduct(vals);
    const existingMap = new Map(currentVariants.map(v => [v.options, v]));
    return allCombos.map(c => {
      const opts = JSON.stringify(c.map((x:any) => ({ group: x.groupName, value: x.value })));
      const existing = existingMap.get(opts);
      if (existing) return existing;
      // Use the first option's price/stock as default for the combo
      const firstOpt = c[0] || {};
      const ps = getOptionPrice(firstOpt.groupIndex, firstOpt.value);
      return {
        sku: `${form.sku || "VAR"}-${c.map((x:any) => x.value).join("-")}`.toUpperCase().replace(/\s+/g, ""),
        barcode: `2${Date.now().toString().slice(-11)}${Math.random().toString(36).slice(2, 5)}`,
        price: ps.price, stock: ps.stock, options: opts
      };
    });
  };

  const addOption=(gi:number)=>{
    const v=newOptionInputs[gi]?.trim();if(!v)return;
    const u=[...variantGroups];
    if(u[gi].options.includes(v)){setNewOptionInputs({...newOptionInputs,[gi]:""});return}
    u[gi].options=[...u[gi].options,v];
    setVariantGroups(u);
    setVariants(regenerateCombos(u, variants));
    setNewOptionInputs({...newOptionInputs,[gi]:""});
    // Keep price/stock for this option so regenerateCombos can use it
  };

  const removeOption=(gi:number,oi:number)=>{
    const u=[...variantGroups];
    const removedVal=u[gi].options[oi];
    u[gi].options=u[gi].options.filter((_,j)=>j!==oi);
    setVariantGroups(u);
    // Remove variants that used this option value
    const kept=variants.filter(v=>{
      try{const opts=JSON.parse(v.options);return !opts.some((o:any)=>o.group===u[gi].name&&o.value===removedVal)}catch{return true}
    });
    setVariants(kept.length?kept:[]);
  };

  const removeGroup=(gi:number)=>{
    const kept=variantGroups.filter((_,j)=>j!==gi);
    setVariantGroups(kept);
    // Recompute variants without this group
    setVariants(kept.length && kept.some(g=>g.options.length) ? regenerateCombos(kept, []) : []);
  };
  const addSpec=()=>setSpecs([...specs,{key:"",value:""}])
  const removeSpec=(i:number)=>setSpecs(specs.filter((_,j)=>j!==i))
  const update=(k:string,v:string)=>setForm({...form,[k]:v})

  const loadCamTabloEbat = (options: string[]) => {
    const ebatIdx = variantGroups.findIndex((g) => /ebat|boyut|ölçü/i.test(g.name));
    if (ebatIdx >= 0) {
      const u = [...variantGroups];
      u[ebatIdx] = { ...u[ebatIdx], options };
      setVariantGroups(u);
      setVariants(regenerateCombos(u, variants));
    } else {
      const u = [...variantGroups, { name: "Ebat", options }];
      setVariantGroups(u);
      setVariants(regenerateCombos(u, variants));
    }
  };

  const ic="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"

  if(loading)return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-200"/><div className="h-96 rounded bg-gray-200"/></div>
  if(loadError)return <div className="max-w-4xl"><Link href={toAdminUrl("/admin/products")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft size={14}/> Ürünlere Dön</Link><div className="rounded-xl border border-red-200 bg-ena-primary/5 p-6 text-center"><p className="text-ena-primary font-medium">{loadError}</p><Link href={toAdminUrl("/admin/products")}><Button variant="outline" className="mt-4">Geri Dön</Button></Link></div></div>

  return (
    <div className="max-w-4xl">
      <Link href={toAdminUrl("/admin/products")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft size={14}/> Ürünlere Dön</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ürün Düzenle</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Package size={16}/> Temel Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Ürün Adı *</label><input className={ic} value={form.name} onChange={e=>update("name",e.target.value)} required/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Marka</label><input className={ic} value={form.brand} onChange={e=>update("brand",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kategori</label><select className={ic} value={form.category} onChange={e=>update("category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Alt Kategori</label><input className={ic} value={form.subcategory} onChange={e=>update("subcategory",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Fiyat (₺) *</label><input type="number" step="0.01" className={ic} value={form.price} onChange={e=>update("price",e.target.value)} required/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Stok *</label><input type="number" className={ic} value={form.stock} onChange={e=>update("stock",e.target.value)} required/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Min Stok</label><input type="number" className={ic} value={form.minStockLevel} onChange={e=>update("minStockLevel",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Maks Stok</label><input type="number" className={ic} value={form.maxStockLevel} onChange={e=>update("maxStockLevel",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Etiketler</label><input className={ic} value={form.tags} onChange={e=>update("tags",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Ağırlık (kg)</label><input type="number" step="0.01" className={ic} value={form.weight} onChange={e=>update("weight",e.target.value)}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Boyutlar</label><input className={ic} value={form.dimensions} onChange={e=>update("dimensions",e.target.value)}/></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="backorderable" className="rounded border-gray-300" checked={form.backorderable as any} onChange={e=>setForm({...form,backorderable:e.target.checked,eta:!e.target.checked?"":form.eta})}/>
              <label htmlFor="backorderable" className="text-xs font-semibold text-gray-600 uppercase">Ön Siparişe İzin Ver</label>
            </div>
            {form.backorderable && (
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tahmini Teslimat (örn: 15-20 gün)</label><input className={ic} value={form.eta} onChange={e=>update("eta",e.target.value)} placeholder="15-20 iş günü"/></div>
            )}
          </div>
          <div className="mt-4"><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Açıklama</label><textarea className={ic} rows={4} value={form.description} onChange={e=>update("description",e.target.value)} required/></div>
        </div>

        <ProductImagesField
          image={form.image}
          imagesJson={imagesJson}
          onChange={(image, json) => {
            setForm({ ...form, image });
            setImagesJson(json);
          }}
        />

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Barcode size={16}/> Kodlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Model Kodu</label><input className={ic} value={form.modelCode} onChange={e=>update("modelCode",e.target.value)} placeholder="xxxxxcamtablo01"/></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">SKU</label><div className="flex gap-1"><input className={ic} value={form.sku} onChange={e=>update("sku",e.target.value)}/><button type="button" onClick={()=>update("sku",genSKU(form.category,form.name))} className="px-2 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"><Hash size={14}/></button></div></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Barkod</label><div className="flex gap-1"><input className={ic} value={form.barcode} onChange={e=>update("barcode",e.target.value)}/><button type="button" onClick={()=>update("barcode",genBarcode())} className="px-2 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"><Barcode size={14}/></button></div></div>
          </div>
        </div>

        <ProductMerchandisingPanel
          value={merchandising}
          onChange={setMerchandising}
          productId={id}
          category={form.category}
          variantGroups={variantGroups}
          onNormalizeOptions={(groups) => {
            setVariantGroups(groups);
            setVariants(regenerateCombos(groups, variants));
          }}
          onLoadCamTabloEbat={loadCamTabloEbat}
        />

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold text-gray-700 mb-4">Varyant Matrisi</h2>
          {variantGroups.length>0 && (
            <div className="space-y-3 mb-4">
              <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">✓ {variants.length} varyant mevcut</p>
              {variantGroups.map((g,gi)=>(<div key={gi} className="p-3 border border-gray-200 rounded-lg bg-gray-50/50"><div className="flex items-center justify-between mb-2"><span className="font-semibold text-sm text-gray-800">{g.name}</span><button type="button" onClick={()=>removeGroup(gi)} className="text-ena-primary hover:text-ena-primary"><Trash2 size={14}/></button></div><div className="flex flex-wrap gap-1.5 mb-2">{g.options.map((o,oi)=>(<span key={oi} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded-full text-gray-900">{o}<button type="button" onClick={()=>removeOption(gi,oi)} className="text-gray-400 hover:text-ena-primary"><X size={10}/></button></span>))}</div><div className="flex gap-1.5 items-end">
<input className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs bg-white text-gray-900 focus:outline-none" placeholder="Seçenek (örn: 120x80)" value={newOptionInputs[gi]||""} onChange={e=>setNewOptionInputs({...newOptionInputs,[gi]:e.target.value})} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addOption(gi))}/>
<input type="number" step="0.01" className="w-24 rounded border border-gray-200 px-2 py-1.5 text-xs bg-white text-gray-900 focus:outline-none" placeholder="₺ Fiyat" value={newOptionPrices[gi+'_p']?.price||''} onChange={e=>setNewOptionPrices({...newOptionPrices,[gi+'_p']:{price:e.target.value,stock:newOptionPrices[gi+'_p']?.stock||''}})}/>
<input type="number" className="w-20 rounded border border-gray-200 px-2 py-1.5 text-xs bg-white text-gray-900 focus:outline-none" placeholder="Stok" value={newOptionPrices[gi+'_p']?.stock||''} onChange={e=>setNewOptionPrices({...newOptionPrices,[gi+'_p']:{stock:e.target.value,price:newOptionPrices[gi+'_p']?.price||''}})}/>
<button type="button" onClick={()=>{addOption(gi);const v=newOptionInputs[gi]?.trim();if(v){const k=getOptionKey(gi,v);const ps=newOptionPrices[gi+'_p'];if(ps?.price||ps?.stock)setNewOptionPrices({...newOptionPrices,[k]:ps});setNewOptionPrices({...newOptionPrices,[gi+'_p']:{price:'',stock:''}})}}} className="px-3 py-1.5 bg-gray-100 text-xs rounded hover:bg-gray-200 shrink-0">Ekle</button>
</div></div>))}
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <input className={ic} placeholder="Yeni grup adı (Renk, Çerçeve...)" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addGroup())}/>
            <button type="button" onClick={addGroup} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 shrink-0"><Plus size={14} className="mr-1 inline"/> Grup Ekle</button>
          </div>
          {variants.length>0&&(<div className="overflow-x-auto border border-gray-200 rounded-lg"><table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="px-2 py-2 text-left font-semibold text-gray-600">Varyant</th><th className="px-2 py-2 text-left font-semibold text-gray-600">SKU</th><th className="px-2 py-2 text-left font-semibold text-gray-600">Barkod</th><th className="px-2 py-2 text-left font-semibold text-gray-600">Fiyat</th><th className="px-2 py-2 text-left font-semibold text-gray-600">Stok</th></tr></thead><tbody className="divide-y divide-gray-100">{variants.map((v,i)=>{let opts:any[]=[];try{opts=JSON.parse(v.options)}catch{}return(<tr key={i} className="hover:bg-gray-50/50"><td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">{opts.map((o:any)=>`${o.group}: ${o.value}`).join(" | ")}</td><td className="px-2 py-1.5"><input className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs bg-white text-gray-900 focus:outline-none" value={v.sku} onChange={e=>{const n=[...variants];n[i].sku=e.target.value;setVariants(n)}}/></td><td className="px-2 py-1.5"><input className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs font-mono bg-white text-gray-900 focus:outline-none" value={v.barcode} onChange={e=>{const n=[...variants];n[i].barcode=e.target.value;setVariants(n)}}/></td><td className="px-2 py-1.5"><input type="number" step="0.01" className="w-20 rounded border border-gray-200 px-1.5 py-1 text-xs bg-white text-gray-900 focus:outline-none" value={v.price} onChange={e=>{const n=[...variants];n[i].price=e.target.value;setVariants(n)}}/></td><td className="px-2 py-1.5"><input type="number" className="w-16 rounded border border-gray-200 px-1.5 py-1 text-xs bg-white text-gray-900 focus:outline-none" value={v.stock} onChange={e=>{const n=[...variants];n[i].stock=e.target.value;setVariants(n)}}/></td></tr>)})}</tbody></table></div>)}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-gray-700">Ürün Özellikleri</h2><button type="button" onClick={addSpec} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"><Plus size={12}/> Özellik Ekle</button></div>{specs.length===0?<p className="text-xs text-gray-400">Henüz özellik eklenmedi</p>:<div className="space-y-2">{specs.map((s,i)=>(<div key={i} className="flex gap-2 items-center"><input className={`${ic} flex-1`} placeholder="Özellik adı" value={s.key} onChange={e=>{const n=[...specs];n[i].key=e.target.value;setSpecs(n)}}/><input className={`${ic} flex-1`} placeholder="Değer" value={s.value} onChange={e=>{const n=[...specs];n[i].value=e.target.value;setSpecs(n)}}/><button type="button" onClick={()=>removeSpec(i)} className="p-2 text-ena-primary hover:text-ena-primary"><Trash2 size={14}/></button></div>))}</div>}</div>

        <div className="flex gap-3"><Button type="submit" disabled={submitting}><Save size={14} className="mr-1"/>{submitting?"Kaydediliyor...":"Güncelle"}</Button><Link href={toAdminUrl("/admin/products")}><Button type="button" variant="outline">İptal</Button></Link></div>
      </form>
    </div>
  );
}
