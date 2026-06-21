"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatPrice, formatDate, productUrl } from "@/lib/utils";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { ProductsTabs } from "@/components/admin/ProductsTabs";
import { Plus, Trash2, Search, Upload, FileDown, Barcode, Hash, DollarSign, Tag, AlignLeft, FolderOpen, Percent, X, Check, Pencil, Filter, XCircle, Eye, LayoutGrid, Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import { VARIANT_DISPLAY_LABELS, VARIANT_DISPLAY_MODES } from "@/lib/products/variant-display";

interface Product { id:string; name:string; slug?:string; category:string; price:number; stock:number; sku:string; barcode:string; createdAt:string; minStockLevel:number; maxStockLevel:number; brand:string; tags:string; image?:string; description?:string; _count?:{variants:number}; }
interface Category { id:string; name:string; parentId?:string|null; }
interface CampaignRow { id: string; name: string; active: boolean; }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkType, setBulkType] = useState("percentage");
  const [bulkMode, setBulkMode] = useState("replace");
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkCampaignId, setBulkCampaignId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product|null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [variantBulkAction, setVariantBulkAction] = useState("");
  const [variantBulkGroup, setVariantBulkGroup] = useState("");
  const [variantBulkOptions, setVariantBulkOptions] = useState("");
  const [variantBulkFilterGroup, setVariantBulkFilterGroup] = useState("");
  const [variantBulkFilterValue, setVariantBulkFilterValue] = useState("");
  const [variantBulkPrice, setVariantBulkPrice] = useState("");
  const [variantBulkStock, setVariantBulkStock] = useState("");
  const [variantBulkOptPrices, setVariantBulkOptPrices] = useState<{price:string;stock:string}[]>([]);
  const [variantBulkOpen, setVariantBulkOpen] = useState(false);
  const [variantBulkLoading, setVariantBulkLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const fetchProducts = () => {
    fetch("/api/admin/products").then(r=>r.json()).then(d=>setProducts(d.data||[])).finally(()=>setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
    fetch("/api/admin/categories").then(r=>r.json()).then(d=>setCategories(d.data||[]));
    fetch("/api/admin/campaigns").then(r=>r.json()).then(d=>setCampaigns((d.data||[]).map((c: CampaignRow)=>({id:c.id,name:c.name,active:c.active}))));
    try {
      const stored = sessionStorage.getItem("importProductIds");
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        if (ids.length) {
          setSelected(new Set(ids));
          toast.success(`${ids.length} import edilen ürün seçildi`);
        }
        sessionStorage.removeItem("importProductIds");
      }
    } catch { /* ignore */ }
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    fetchProducts(); toast.success("Silindi");
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size===paginated.length&&paginated.length>0) setSelected(new Set());
    else setSelected(new Set(paginated.map(p=>p.id)));
  };

  const startBulkAction = (action: string) => {
    setBulkAction(action);
    setBulkOpen(true);
    if (action === "variantDisplay") setBulkValue("buttons");
    if (action === "assignCampaign") setBulkMode("add");
  };

  const executeBulk = async () => {
    if (selected.size===0) return toast.error("Önce ürün seçin");
    setBulkLoading(true);
    const res = await fetch("/api/admin/products/bulk", {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        ids: Array.from(selected),
        action: bulkAction,
        value: bulkValue,
        type: bulkType,
        mode: bulkMode,
        categoryId: bulkCategoryId,
        campaignId: bulkCampaignId,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      toast.success(`${d.data?.updated||0} ürün güncellendi`);
      setSelected(new Set()); setBulkOpen(false); setBulkValue(""); fetchProducts();
    } else toast.error("İşlem başarısız");
    setBulkLoading(false);
  };

  const executeVariantBulk = async (action?: string) => {
    const a = action || variantBulkAction;
    const ids = Array.from(selected);
    if (ids.length === 0) return toast.error("Önce ürün seçin");
    if (a === "generate" && !variantBulkOptions.trim()) return toast.error("Seçenekleri girin");

    setVariantBulkLoading(true);
    const body: any = { action: a, productIds: ids };
    if (a === "generate") {
      body.groupName = variantBulkGroup.trim() || "Boyut";
      const rawOpts = variantBulkOptions.split(",").map((s: string) => s.trim()).filter(Boolean);
      body.options = rawOpts.map((opt: string, i: number) => {
        const ps = variantBulkOptPrices?.[i];
        if (ps?.price || ps?.stock) return { value: opt, price: ps.price ? parseFloat(ps.price) : undefined, stock: ps.stock ? parseInt(ps.stock) : undefined };
        return opt;
      });
      body.price = variantBulkPrice ? parseFloat(variantBulkPrice) : undefined;
      body.stock = variantBulkStock ? parseInt(variantBulkStock) : undefined;
    }
    if ((a === "edit" || a === "delete") && variantBulkFilterGroup && variantBulkFilterValue) {
      body.filterOption = { group: variantBulkFilterGroup, value: variantBulkFilterValue };
      body.price = variantBulkPrice ? parseFloat(variantBulkPrice) : undefined;
      body.stock = variantBulkStock ? parseInt(variantBulkStock) : undefined;
    }

    const res = await fetch("/api/admin/variants/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.success) {
      toast.success(`${d.data?.updated || 0} işlem yapıldı`);
      setVariantBulkOpen(false);
      setVariantBulkAction("");
      setVariantBulkOptions("");
      setVariantBulkGroup("");
      setVariantBulkFilterGroup("");
      setVariantBulkFilterValue("");
      setVariantBulkPrice("");
      setVariantBulkStock("");
      setVariantBulkOptPrices([]);
      fetchProducts();
    } else toast.error(d.error || "Hata");
    setVariantBulkLoading(false);
  };

  // Filters
  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase()) && !p.barcode.toLowerCase().includes(search.toLowerCase()) && !p.brand.toLowerCase().includes(search.toLowerCase()) && !p.tags.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (filterStock==="low" && p.stock>p.minStockLevel) return false;
    if (filterStock==="out" && p.stock>0) return false;
    if (filterStock==="ok" && p.stock<=p.minStockLevel) return false;
    if (filterPriceMin && p.price<parseFloat(filterPriceMin)) return false;
    if (filterPriceMax && p.price>parseFloat(filterPriceMax)) return false;
    return true;
  });

  const hasFilters = search || filterCat || filterStock || filterPriceMin || filterPriceMax;
  const clearFilters = () => { setSearch(""); setFilterCat(""); setFilterStock(""); setFilterPriceMin(""); setFilterPriceMax(""); setPage(1); };
  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterCat, filterStock, filterPriceMin, filterPriceMax]);

  // Pagination
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));

  const PAGE_SIZES = [20, 50, 100, 200];

  const BUNDLE_ACTIONS = [
    { key:"barcode", label:"Barkod", icon:Barcode, modes:["replace","prefix","suffix"] },
    { key:"sku", label:"SKU", icon:Hash, modes:["replace","prefix","suffix"] },
    { key:"price", label:"Fiyat", icon:DollarSign, modes:["increase","decrease"], types:["percentage","fixed"] },
    { key:"salePrice", label:"İndirimli Fiyat", icon:Percent, inputType:"number" },
    { key:"discountLabel", label:"İndirim Etiketi", icon:Tag, inputType:"text" },
    { key:"assignCampaign", label:"Kampanya Ata", icon:Megaphone, showCampaign:true, campaignModes:["add","replace"] },
    { key:"removeCampaign", label:"Kampanya Kaldır", icon:Megaphone, showCampaign:true },
    { key:"variantDisplay", label:"Varyant Gösterimi", icon:LayoutGrid, showVariantDisplay:true },
    { key:"vat", label:"KDV", icon:Percent, modes:["apply","remove"] },
    { key:"name", label:"İsim", icon:Tag, modes:["prefix","suffix","replace","replaceFirst","replaceLast"] },
    { key:"description", label:"Açıklama", icon:AlignLeft, modes:["prefix","suffix","replace"] },
    { key:"category", label:"Kategori Taşı", icon:FolderOpen, showCategory:true },
  ];

  return (
    <div>
      <ProductsTabs />
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Ürünler</h1><p className="text-sm text-gray-500 mt-1">Sayfa {safePage}/{totalPages} · {paginated.length} gösteriliyor / {totalFiltered} filtrelenmiş / {products.length} toplam</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${hasFilters?"border-amber-300 bg-amber-50 text-amber-700":"border-gray-200 text-gray-600 hover:bg-gray-50"}`}><Filter size={15}/> Filtre {hasFilters&&"✓"}</button>
          <a href="/api/admin/export?type=products" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"><FileDown size={15}/> Excel</a>
          <Link href={toAdminUrl("/admin/products/import")}><Button variant="outline" className="gap-1.5"><Upload size={15}/> Toplu Ekle</Button></Link>
          <Link href={toAdminUrl("/admin/products/new")}><Button className="gap-1.5 shadow-sm"><Plus size={15}/> Yeni Ürün</Button></Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 shadow-sm">
          <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Ara (isim/SKU/barkod/marka)</label><div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/><input className="w-full rounded border border-gray-200 py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-gray-400" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ara..."/></div></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Kategori</label><select className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs focus:outline-none" value={filterCat} onChange={e=>setFilterCat(e.target.value)}><option value="">Tümü</option>{categories.filter(c=>!c.parentId).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Stok</label><select className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs focus:outline-none" value={filterStock} onChange={e=>setFilterStock(e.target.value)}><option value="">Tümü</option><option value="ok">Stok Yeterli</option><option value="low">Kritik Stok</option><option value="out">Stokta Yok</option></select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Min Fiyat</label><input type="number" className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs focus:outline-none" value={filterPriceMin} onChange={e=>setFilterPriceMin(e.target.value)} placeholder="0"/></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Max Fiyat</label><input type="number" className="w-full rounded border border-gray-200 py-1.5 px-2 text-xs focus:outline-none" value={filterPriceMax} onChange={e=>setFilterPriceMax(e.target.value)} placeholder="99999"/></div>
          {hasFilters && <div className="col-span-full"><button onClick={clearFilters} className="text-xs text-ena-primary hover:underline">Filtreleri Temizle</button></div>}
        </div>
      )}

      {/* Bulk Panel */}
      <div className={`rounded-xl border-2 px-4 py-3 mb-4 flex items-center gap-2 flex-wrap transition-all ${selected.size>0?"border-amber-300 bg-amber-50/50":"border-dashed border-gray-200 bg-gray-50/30"}`}>
        {selected.size>0?(
          <>
            <span className="text-sm font-bold text-amber-800">{selected.size} ürün seçildi</span>
            {BUNDLE_ACTIONS.map(a=>(<button key={a.key} onClick={()=>startBulkAction(a.key)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-amber-300 text-gray-700 hover:bg-amber-100 hover:border-amber-400 transition-colors"><a.icon size={13}/> {a.label}</button>))}
            <span className="text-xs text-gray-400 mx-1">|</span>
            <button onClick={()=>{setVariantBulkAction("generate");setVariantBulkOpen(true)}} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"><Barcode size={13}/> Varyant Oluştur</button>
            <button onClick={()=>{setVariantBulkAction("edit");setVariantBulkOpen(true)}} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"><Pencil size={13}/> Varyant Düzenle</button>
            <button onClick={()=>{setVariantBulkAction("delete");setVariantBulkOpen(true)}} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-ena-primary/5 border border-red-200 text-ena-primary hover:bg-ena-primary/10 transition-colors"><Trash2 size={13}/> Varyant Sil</button>
            <button onClick={()=>{if(confirm("Tüm varyantlar silinecek, emin misin?")){executeVariantBulk("reset")}}} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-ena-primary/5 border border-red-200 text-ena-primary hover:bg-ena-primary/10 transition-colors"><XCircle size={13}/> Varyantları Sıfırla</button>
            <button onClick={()=>{if(confirm("Seçili ürünleri silmek istediğine emin misin?")){Promise.all(Array.from(selected).map(id=>fetch(`/api/admin/products/${id}`,{method:"DELETE"}))).then(()=>{setSelected(new Set());fetchProducts();toast.success("Silindi")})}}} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-ena-primary/5 border border-red-200 text-ena-primary hover:bg-ena-primary/10 transition-colors"><Trash2 size={13}/> Toplu Sil</button>
            <button onClick={()=>setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 ml-auto flex items-center gap-1"><XCircle size={14}/> Seçimi Temizle</button>
          </>
        ):<span className="text-sm text-gray-400">📋 <b>Toplu işlem:</b> Checkbox ile ürün seç, buradan işlem butonları aktif olur. <b>Filtre</b> ile daraltıp <b>tümünü seç</b>ebilirsin.</span>}
      </div>

      {/* Bulk Modal */}
      {bulkOpen && (
        <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={`${BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.label} İşlemi`} size="lg">
          <div className="space-y-4">
            {BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.types && (
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tip</label><div className="flex gap-2">
                <button onClick={() => setBulkType("percentage")} className={`px-3 py-1.5 rounded text-sm ${bulkType === "percentage" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>Yüzde (%)</button>
                <button onClick={() => setBulkType("fixed")} className={`px-3 py-1.5 rounded text-sm ${bulkType === "fixed" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>Sabit (₺)</button>
              </div></div>
            )}
            {BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.showVariantDisplay && (
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Gösterim Modu</label>
                <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none">
                  {VARIANT_DISPLAY_MODES.map(m => (<option key={m} value={m}>{VARIANT_DISPLAY_LABELS[m]}</option>))}
                </select>
              </div>
            )}
            {BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.showCampaign && (
              <div className="space-y-3">
                <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kampanya</label>
                  <select value={bulkCampaignId} onChange={e => setBulkCampaignId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none">
                    <option value="">Seçiniz</option>
                    {campaigns.map(c => (<option key={c.id} value={c.id}>{c.name}{!c.active ? " (pasif)" : ""}</option>))}
                  </select>
                </div>
                {BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.campaignModes && (
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Mod</label><div className="flex gap-2">
                    <button onClick={() => setBulkMode("add")} className={`px-3 py-1.5 rounded text-sm ${bulkMode === "add" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>Ekle</button>
                    <button onClick={() => setBulkMode("replace")} className={`px-3 py-1.5 rounded text-sm ${bulkMode === "replace" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>Değiştir</button>
                  </div></div>
                )}
              </div>
            )}
            {!BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.showVariantDisplay && !BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.showCampaign && (
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Değer</label><input type={BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.inputType === "number" || bulkAction === "price" || bulkAction === "vat" || bulkAction === "salePrice" ? "number" : "text"} step="0.01" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" autoFocus /></div>
            )}
            {(BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.modes || []).length > 0 && (
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Mod</label><div className="flex flex-wrap gap-2">
                {(BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.modes || []).map(m => (<button key={m} onClick={() => setBulkMode(m)} className={`px-3 py-1.5 rounded text-sm capitalize ${bulkMode === m ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{m === "increase" ? "Artır" : m === "decrease" ? "Azalt" : m === "apply" ? "KDV Ekle" : m === "remove" ? "KDV Çıkar" : m === "prefix" ? "Ön Ek" : m === "suffix" ? "Son Ek" : m === "replaceFirst" ? "Baştan Kaldır" : m === "replaceLast" ? "Sondan Kaldır" : m}</button>))}
              </div></div>
            )}
            {BUNDLE_ACTIONS.find(a => a.key === bulkAction)?.showCategory && (
              <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Hedef Kategori</label><select value={bulkCategoryId} onChange={e => setBulkCategoryId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none"><option value="">Seçiniz</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <Button onClick={executeBulk} disabled={bulkLoading}><Check size={14} className="mr-1" />{bulkLoading ? "Uygulanıyor..." : `${selected.size} ürüne uygula`}</Button>
              <Button variant="outline" onClick={() => setBulkOpen(false)}>İptal</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pagination top */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hidden sm:inline">Sayfa başına:</span>
            {PAGE_SIZES.map(s => (
              <button key={s} onClick={() => { setPageSize(s); setPage(1); }} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${pageSize === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1} className="px-2.5 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">←</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, safePage - 2);
              const p = start + i;
              if (p > totalPages) return null;
              return <button key={p} onClick={() => goToPage(p)} className={`w-7 h-7 rounded text-xs font-medium ${p === safePage ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</button>;
            })}
            <button onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages} className="px-2.5 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">→</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-3 py-3 w-10"><input type="checkbox" checked={selected.size===paginated.length&&paginated.length>0} onChange={toggleAll} className="w-4 h-4 rounded"/></th>
            <th className="px-3 py-3.5 text-left font-semibold text-gray-600">Ürün</th>
            <th className="px-3 py-3.5 text-left font-semibold text-gray-600 hidden md:table-cell">SKU / Barkod</th>
            <th className="px-3 py-3.5 text-left font-semibold text-gray-600 hidden sm:table-cell">Kategori</th>
            <th className="px-3 py-3.5 text-left font-semibold text-gray-600 hidden sm:table-cell">Varyant</th>
            <th className="px-3 py-3.5 text-left font-semibold text-gray-600">Fiyat</th>
            <th className="px-3 py-3.5 text-left font-semibold text-gray-600 hidden sm:table-cell">Stok</th>
            <th className="px-3 py-3.5 text-right font-semibold text-gray-600">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading?<tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">Yükleniyor...</td></tr>:
            paginated.length===0?<tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">{hasFilters?"Filtrelere uygun ürün bulunamadı":"Henüz ürün eklenmemiş"}</td></tr>:
            paginated.map(p=>(
              <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${selected.has(p.id)?"bg-blue-50/50":""}`}>
                <td className="px-3"><input type="checkbox" checked={selected.has(p.id)} onChange={()=>toggleSelect(p.id)} className="w-4 h-4 rounded"/></td>
                <td className="px-3 py-3"><div className="flex items-center gap-2.5"><div className="group relative shrink-0">{p.image?<><img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover border border-gray-100 cursor-pointer transition-all duration-200 hover:scale-[4] hover:z-50 hover:shadow-2xl hover:rounded-lg relative" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></>:<div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">{p.name.charAt(0)}</div>}</div><div className="min-w-0"><p className="font-medium text-gray-900 truncate text-sm">{p.name}</p><p className="text-[10px] text-gray-400">{p.brand||"-"} · #{p.id.slice(0,8)}</p></div></div></td>
                <td className="px-3 py-3 hidden md:table-cell"><p className="text-xs text-gray-500 font-mono">{p.sku||"——"}</p><p className="text-xs text-gray-400 font-mono">{p.barcode||"——"}</p></td>
                <td className="px-3 py-3 hidden sm:table-cell"><span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{p.category}</span></td>
                <td className="px-3 py-3 hidden sm:table-cell"><span className={`text-xs font-mono px-2 py-0.5 rounded ${(p._count?.variants||0)>0?'bg-blue-50 text-blue-700':'bg-gray-50 text-gray-400'}`}>{p._count?.variants||0}</span></td>
                <td className="px-3 py-3 font-medium text-gray-900 text-sm">{formatPrice(p.price)}</td>
                <td className="px-3 py-3 hidden sm:table-cell">
                  <span className={`text-sm font-medium ${p.stock>10&&(!p.maxStockLevel||p.stock<p.maxStockLevel)?"text-green-600":p.stock===0?"text-ena-primary":p.stock<=p.minStockLevel?"text-ena-primary":p.maxStockLevel>0&&p.stock>=p.maxStockLevel?"text-amber-600":"text-amber-600"}`}>{p.stock}</span>
                  {p.maxStockLevel>0&&<span className="text-[10px] text-gray-400 ml-1">/ {p.maxStockLevel}</span>}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-1.5 flex-nowrap min-w-[220px]">
                    <a
                      href={productUrl(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 whitespace-nowrap"
                    >
                      <Eye size={13} /> Sitede
                    </a>
                    <button
                      type="button"
                      onClick={() => { setDetailProduct(p); setDetailOpen(true); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                    >
                      <Search size={13} /> Bak
                    </button>
                    <Link
                      href={toAdminUrl(`/admin/products/${p.id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                    >
                      <Pencil size={13} /> Düzenle
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 whitespace-nowrap"
                    >
                      <Trash2 size={13} /> Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))
          }</tbody>
        </table>
        </div>{/* overflow-x-auto */}
      </div>

      {/* Pagination bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">Sayfa {safePage}/{totalPages} · {totalFiltered} ürün</span>
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1} className="px-2.5 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">← Önceki</button>
            <span className="text-xs text-gray-400 mx-2">{safePage}/{totalPages}</span>
            <button onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages} className="px-2.5 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">Sonraki →</button>
          </div>
        </div>
      )}

      {/* Variant Bulk Modal */}
      {variantBulkOpen && (
        <Modal open={variantBulkOpen} onClose={() => setVariantBulkOpen(false)}
          title={variantBulkAction === "generate" ? "Varyant Oluştur" : variantBulkAction === "edit" ? "Varyant Düzenle" : "Varyant Sil"} size="lg">
          <div className="space-y-4">
            {variantBulkAction === "generate" && (
              <>
                <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Grup Adı</label>
                  <select value={variantBulkGroup} onChange={e => setVariantBulkGroup(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none">
                    <option value="">Seçiniz / Özel yazın</option>
                    <option value="Boyut/Ebat">Boyut/Ebat</option>
                    <option value="Renk">Renk</option>
                    <option value="Beden">Beden</option>
                    <option value="Materyal">Materyal</option>
                  </select>
                  <input value={variantBulkGroup} onChange={e => setVariantBulkGroup(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none mt-2"
                    placeholder="veya özel grup adı yazın" />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-500 uppercase">
                    <span className="flex-[2]">Seçenek</span>
                    <span className="flex-1">Fiyat (₺)</span>
                    <span className="flex-1">Stok</span>
                    <span className="w-6"/>
                  </div>
                  {(variantBulkOptions ? variantBulkOptions.split(",").filter(Boolean).map((_: string, i: number) => {
                    const key = `row_${i}`;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <input value={variantBulkOptions.split(",")[i]?.trim() || ""}
                          onChange={e => { const a = variantBulkOptions.split(","); a[i] = e.target.value; setVariantBulkOptions(a.join(",")); }}
                          className="flex-[2] rounded border border-gray-200 px-2 py-1.5 text-xs bg-white text-gray-900 focus:outline-none" placeholder="30x40" />
                        <input type="number" value={variantBulkOptPrices?.[i]?.price || ""}
                          onChange={e => { const a = [...(variantBulkOptPrices || [])]; a[i] = { ...a[i], price: e.target.value, stock: a[i]?.stock || "" }; setVariantBulkOptPrices(a); }}
                          className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs bg-white text-gray-900 focus:outline-none" placeholder="Varsayılan" />
                        <input type="number" value={variantBulkOptPrices?.[i]?.stock || ""}
                          onChange={e => { const a = [...(variantBulkOptPrices || [])]; a[i] = { ...a[i], stock: e.target.value, price: a[i]?.price || "" }; setVariantBulkOptPrices(a); }}
                          className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs bg-white text-gray-900 focus:outline-none" placeholder="0" />
                        <button onClick={() => { const a = variantBulkOptions.split(",").filter((_: string, j: number) => j !== i); setVariantBulkOptions(a.join(",")); setVariantBulkOptPrices((variantBulkOptPrices || []).filter((_: any, j: number) => j !== i)); }}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-ena-primary rounded"><X size={12}/></button>
                      </div>
                    );
                  }) : null)}
                  <button type="button" onClick={() => setVariantBulkOptions((variantBulkOptions || "") + (variantBulkOptions ? "," : "") + "")}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 py-1">
                    <Plus size={12}/> Seçenek Ekle
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Varsayılan Fiyat</label>
                    <input type="number" value={variantBulkPrice} onChange={e => setVariantBulkPrice(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white text-gray-900 focus:outline-none" placeholder="Boş = ürün fiyatı" />
                  </div>
                  <div><label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Varsayılan Stok</label>
                    <input type="number" value={variantBulkStock} onChange={e => setVariantBulkStock(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white text-gray-900 focus:outline-none" placeholder="0" />
                  </div>
                </div>
              </>
            )}
            {(variantBulkAction === "edit" || variantBulkAction === "delete") && (
              <>
                <p className="text-sm text-gray-500">Hedef varyantı seçin:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Grup Adı</label>
                    <input value={variantBulkFilterGroup} onChange={e => setVariantBulkFilterGroup(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none"
                      placeholder="örn: Boyut/Ebat" />
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Değer</label>
                    <input value={variantBulkFilterValue} onChange={e => setVariantBulkFilterValue(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none"
                      placeholder="örn: 30x40" />
                  </div>
                </div>
                {variantBulkAction === "edit" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Yeni Fiyat</label>
                      <input type="number" value={variantBulkPrice} onChange={e => setVariantBulkPrice(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none" placeholder="Boş = değişmez" />
                    </div>
                    <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Yeni Stok</label>
                      <input type="number" value={variantBulkStock} onChange={e => setVariantBulkStock(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none" placeholder="Boş = değişmez" />
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button onClick={() => executeVariantBulk()} disabled={variantBulkLoading}>
                {variantBulkLoading ? "İşleniyor..." : `${selected.size} ürüne uygula`}
              </Button>
              <Button variant="outline" onClick={() => setVariantBulkOpen(false)}>İptal</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailOpen && detailProduct && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Ürün Detayı" size="full">
          <div className="max-h-[80vh] overflow-y-auto space-y-4 pr-1">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {detailProduct.image ? (
                <img src={detailProduct.image} alt="" className="w-full sm:w-40 sm:h-40 rounded-xl object-cover border border-gray-200 shrink-0 max-h-60" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
              ) : (
                <div className="w-full sm:w-40 sm:h-40 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">{detailProduct.name.charAt(0)}</div>
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <h2 className="text-lg font-bold text-gray-900">{detailProduct.name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div><span className="text-gray-400">Marka:</span> <span className="font-medium text-gray-700">{detailProduct.brand || "-"}</span></div>
                  <div><span className="text-gray-400">Kategori:</span> <span className="font-medium text-gray-700">{detailProduct.category || "-"}</span></div>
                  <div><span className="text-gray-400">SKU:</span> <span className="font-medium text-gray-700 font-mono">{detailProduct.sku || "—"}</span></div>
                  <div><span className="text-gray-400">Barkod:</span> <span className="font-medium text-gray-700 font-mono">{detailProduct.barcode || "—"}</span></div>
                  <div><span className="text-gray-400">Fiyat:</span> <span className="font-bold text-green-700">{formatPrice(detailProduct.price)}</span></div>
                  <div><span className="text-gray-400">Stok:</span> <span className={`font-bold ${detailProduct.stock > 0 ? 'text-green-700' : 'text-ena-primary'}`}>{detailProduct.stock}</span></div>
                </div>
              </div>
            </div>
            {detailProduct.description && (
              <div><span className="text-xs font-semibold text-gray-500 uppercase">Açıklama</span>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed whitespace-pre-line max-h-32 overflow-y-auto">{detailProduct.description}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <a href={productUrl(detailProduct)} target="_blank" rel="noopener noreferrer"><Button variant="outline">Sitede Gör <Eye size={14} className="ml-1"/></Button></a>
              <Link href={toAdminUrl(`/admin/products/${detailProduct.id}`)}><Button>Düzenle <Pencil size={14} className="ml-1"/></Button></Link>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Kapat</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
