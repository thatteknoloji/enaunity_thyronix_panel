"use client";

import { useEffect, useState } from "react";
import { Package, Search, ChevronLeft, ChevronRight, Pencil, Eye, Trash2, DollarSign, Layers, Tag, GitBranch, XCircle, Check, Brain, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

interface ThyronixProduct {
  id: string; name: string; barcode?: string; stockCode?: string;
  brand?: string; category?: string; price: number; stock: number;
  status: string; images?: string; createdAt: string;
  source?: { name: string };
}

const BULK_ACTIONS = [
  { key: "price", label: "Fiyat Değiştir", icon: DollarSign, needsValue: true, needsType: true, needsMode: true },
  { key: "stock", label: "Stok Güncelle", icon: Layers, needsValue: true, needsMode: true },
  { key: "category", label: "Kategori Değiştir", icon: Tag, needsCategory: true },
  { key: "brand", label: "Marka Değiştir", icon: Tag, needsBrand: true },
  { key: "apply_rules", label: "Kuralları Uygula", icon: GitBranch },
  { key: "ai_titles", label: "AI Başlık Optimize", icon: Brain, isAi: true },
  { key: "ai_descriptions", label: "AI Açıklama Oluştur", icon: Brain, isAi: true },
  { key: "ai_categories", label: "AI Kategori Öner", icon: Brain, isAi: true },
  { key: "ai_attributes", label: "AI Özellik Çıkar", icon: Brain, isAi: true },
  { key: "ai_quality", label: "AI Kalite İyileştir", icon: Brain, isAi: true },
  { key: "delete", label: "Toplu Sil", icon: Trash2 },
];

export default function ThyronixProductsPage() {
  const [products, setProducts] = useState<ThyronixProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editing, setEditing] = useState<ThyronixProduct | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "0", stock: "0", category: "", brand: "", barcode: "" });
  const [saving, setSaving] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [fSource, setFSource] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fBarcode, setFBarcode] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPriceMin, setFPriceMin] = useState("");
  const [fPriceMax, setFPriceMax] = useState("");
  const [sources, setSources] = useState<{id:string;name:string}[]>([]);
  const hasFilters = fSource || fCategory || fBarcode || fStatus || fPriceMin || fPriceMax;

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkType, setBulkType] = useState("percentage");
  const [bulkMode, setBulkMode] = useState("replace");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkBrand, setBulkBrand] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [detailProduct, setDetailProduct] = useState<ThyronixProduct | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("overview");
  const [cachedProvider, setCachedProvider] = useState<any>(null);
  const SIZE = 50;

  const getProvider = async () => {
    if (cachedProvider) return cachedProvider;
    const res = await fetch("/api/admin/nexa-ai-providers");
    const d = await res.json();
    if (d.success && d.data.length > 0) { setCachedProvider(d.data[0]); return d.data[0]; }
    return null;
  };

  const fetchProducts = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), size: String(SIZE) });
    if (search) params.set("search", search);
    if (fSource) params.set("sourceId", fSource);
    if (fCategory) params.set("category", fCategory);
    if (fBarcode) params.set("barcode", fBarcode);
    if (fStatus) params.set("status", fStatus);
    if (fPriceMin) params.set("priceMin", fPriceMin);
    if (fPriceMax) params.set("priceMax", fPriceMax);
    fetch("/api/thyronix/products?" + params.toString())
      .then(r => r.json())
      .then(d => {
        if (d.success) { setProducts(d.data.items); setTotal(d.data.total); setTotalPages(d.data.totalPages); }
        setLoading(false);
      });
  };

  useEffect(() => { fetchProducts(); }, [page, search, fSource, fCategory, fBarcode, fStatus, fPriceMin, fPriceMax]);
  useEffect(() => { fetch("/api/thyronix/sources").then(r=>r.json()).then(d=>{if(d.success)setSources(d.data||[])}); }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === products.length && products.length > 0) setSelected(new Set());
    else setSelected(new Set(products.map(p => p.id)));
  };

  const handleEdit = (p: ThyronixProduct) => {
    setEditing(p);
    setEditForm({ name: p.name || "", price: String(p.price), stock: String(p.stock), category: p.category || "", brand: p.brand || "", barcode: p.barcode || "" });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/thyronix/products/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, name: editForm.name, price: parseFloat(editForm.price) || 0, stock: parseInt(editForm.stock) || 0, category: editForm.category, brand: editForm.brand, barcode: editForm.barcode }),
    });
    if (res.ok) { toast.success("Güncellendi"); setEditing(null); fetchProducts(); }
    else { const d = await res.json(); toast.error(d.error || "Hata"); }
    setSaving(false);
  };

  const executeBulk = async () => {
    if (selected.size === 0) return toast.error("Önce ürün seçin");

    // AI bulk actions
    const aiTaskMap: Record<string, string> = {
      ai_titles: "title_optimize",
      ai_descriptions: "description_generate",
      ai_categories: "category_suggest",
      ai_attributes: "attribute_extract",
      ai_quality: "quality_improve",
    };

    if (aiTaskMap[bulkAction]) {
      setBulkLoading(true);
      try {
        // Get providers
        const provider = await getProvider();
        if (!provider) { toast.error("Önce AI provider ekleyin"); setBulkLoading(false); return; }

        // Create job
        const jobRes = await fetch("/api/thyronix/ai/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${BULK_ACTIONS.find(a => a.key === bulkAction)?.label} - ${selected.size} ürün`,
            taskType: aiTaskMap[bulkAction],
            totalProducts: selected.size,
            estimatedTokens: selected.size * 500,
            estimatedCost: selected.size * 0.001,
            providerId: provider.id,
            model: provider.model,
          }),
        });
        const jobData = await jobRes.json();
        if (!jobData.success) { toast.error(jobData.error || "Görev oluşturulamadı"); setBulkLoading(false); return; }

        // Start processing in batches
        const ids = Array.from(selected);
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < ids.length; i += batchSize) {
          batches.push(ids.slice(i, i + batchSize));
        }

        // Update job to running
        await fetch(`/api/thyronix/ai/jobs/${jobData.data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resume" }) });

        // Process first batch immediately, rest will be handled by polling
        if (batches.length > 0) {
          await fetch("/api/thyronix/ai/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: jobData.data.id, taskType: aiTaskMap[bulkAction], productIds: batches[0], providerId: provider.id }),
          });
        }

        toast.success(`AI görev oluşturuldu: ${selected.size} ürün`);
        setSelected(new Set());
        setBulkOpen(false);
        fetchProducts();
      } catch { toast.error("AI işlemi başarısız"); }
      setBulkLoading(false);
      return;
    }

    if ((bulkAction === "price" || bulkAction === "stock") && !bulkValue) return toast.error("Değer girin");
    if (bulkAction === "category" && !bulkCategory) return toast.error("Kategori girin");
    if (bulkAction === "brand" && !bulkBrand) return toast.error("Marka girin");

    setBulkLoading(true);
    const body: any = { action: bulkAction, ids: Array.from(selected), value: bulkValue, type: bulkType, mode: bulkMode };
    if (bulkCategory) body.category = bulkCategory;
    if (bulkBrand) body.brand = bulkBrand;

    const res = await fetch("/api/thyronix/products/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.success) {
      toast.success(`${d.data.updated} ürün güncellendi`);
      setSelected(new Set()); setBulkOpen(false); setBulkValue(""); setBulkCategory(""); setBulkBrand("");
      fetchProducts();
    } else toast.error(d.error || "Hata");
    setBulkLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setSearch(searchInput); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexa-text">Products</h1>
          <p className="text-sm text-nexa-text-secondary mt-1">{total.toLocaleString("tr-TR")} ürün</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexa-text-secondary" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="İsim, barkod, marka ara..."
              className="w-64 rounded-lg border border-nexa-border bg-nexa-card px-9 py-2 text-sm text-nexa-text focus:outline-none focus:border-nexa-primary/50" />
            <div className="text-[9px] text-nexa-text-secondary/40 mt-0.5">💡 brand:nike stock&gt;5 price&lt;1000 category:x</div>
          </div>
          <button type="submit" className="px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg hover:bg-blue-600">Ara</button>
          {search && <button type="button" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); setSelected(new Set()); }} className="px-3 py-2 text-sm text-nexa-text-secondary hover:text-nexa-text">Temizle</button>}
          <button onClick={() => setShowFilters(!showFilters)} className={`px-3 py-2 text-sm rounded-lg border transition-colors ${hasFilters ? "border-nexa-primary/30 bg-nexa-primary/5 text-nexa-primary" : "border-nexa-border text-nexa-text-secondary hover:text-nexa-text"}`}>
            Filtrele {hasFilters && `(${[fSource,fCategory,fBarcode,fStatus,fPriceMin,fPriceMax].filter(Boolean).length})`}</button>
        </form>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-nexa-text-secondary uppercase mb-1">Kaynak</label>
            <select value={fSource} onChange={e => { setFSource(e.target.value); setPage(1); }} className="w-full rounded border border-nexa-border bg-nexa-bg/50 px-2 py-1.5 text-xs text-nexa-text focus:outline-none">
              <option value="">Tümü</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-nexa-text-secondary uppercase mb-1">Kategori</label>
            <input value={fCategory} onChange={e => { setFCategory(e.target.value); setPage(1); }} placeholder="örn: Kupa" className="w-full rounded border border-nexa-border bg-nexa-bg/50 px-2 py-1.5 text-xs text-nexa-text focus:outline-none"/>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-nexa-text-secondary uppercase mb-1">Barkod</label>
            <input value={fBarcode} onChange={e => { setFBarcode(e.target.value); setPage(1); }} placeholder="örn: 8683..." className="w-full rounded border border-nexa-border bg-nexa-bg/50 px-2 py-1.5 text-xs text-nexa-text font-mono focus:outline-none"/>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-nexa-text-secondary uppercase mb-1">Durum</label>
            <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }} className="w-full rounded border border-nexa-border bg-nexa-bg/50 px-2 py-1.5 text-xs text-nexa-text focus:outline-none">
              <option value="">Tümü</option>
              <option value="active">Aktif</option>
              <option value="excluded">Hariç</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-nexa-text-secondary uppercase mb-1">Min Fiyat</label>
            <input type="number" value={fPriceMin} onChange={e => { setFPriceMin(e.target.value); setPage(1); }} placeholder="₺0" className="w-full rounded border border-nexa-border bg-nexa-bg/50 px-2 py-1.5 text-xs text-nexa-text focus:outline-none"/>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-nexa-text-secondary uppercase mb-1">Max Fiyat</label>
            <input type="number" value={fPriceMax} onChange={e => { setFPriceMax(e.target.value); setPage(1); }} placeholder="₺9999" className="w-full rounded border border-nexa-border bg-nexa-bg/50 px-2 py-1.5 text-xs text-nexa-text focus:outline-none"/>
          </div>
          {hasFilters && <div className="col-span-full"><button onClick={() => { setFSource(""); setFCategory(""); setFBarcode(""); setFStatus(""); setFPriceMin(""); setFPriceMax(""); setPage(1); }} className="text-[10px] text-nexa-danger hover:underline">Filtreleri Temizle</button></div>}
        </div>
      )}

      {/* Bulk Panel */}
      <div className={`rounded-xl border-2 px-4 py-3 flex items-center gap-2 flex-wrap transition-all ${selected.size > 0 ? "border-nexa-primary/30 bg-nexa-primary/5" : "border-dashed border-nexa-border bg-nexa-card/50"}`}>
        {selected.size > 0 ? (<>
          <span className="text-sm font-bold text-nexa-primary">{selected.size} ürün seçildi</span>
          {BULK_ACTIONS.map(a => (
            <button key={a.key} onClick={() => { setBulkAction(a.key); setBulkOpen(true); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                a.key === "delete" ? "bg-nexa-danger/10 text-nexa-danger border border-nexa-danger/30 hover:bg-nexa-danger/20" :
                "bg-nexa-card border border-nexa-border text-nexa-text hover:bg-nexa-hover"
              }`}>
              <a.icon size={13} /> {a.label}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} className="text-sm text-nexa-text-secondary hover:text-nexa-text ml-auto flex items-center gap-1"><XCircle size={14} /> Seçimi Temizle</button>
        </>) : (
          <span className="text-sm text-nexa-text-secondary">📋 <b>Toplu işlem:</b> Checkbox ile ürün seçin, buradan işlem yapın. Filtre ile daraltıp <b>tümünü seç</b>ebilirsiniz.</span>
        )}
      </div>

      {/* Bulk Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setBulkOpen(false)} />
          <div className="relative w-full max-w-md bg-nexa-card border border-nexa-border rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-nexa-text">{BULK_ACTIONS.find(a => a.key === bulkAction)?.label}</h2>
            <p className="text-xs text-nexa-text-secondary">{selected.size} ürüne uygulanacak</p>

            {(bulkAction === "price" || bulkAction === "stock") && (
              <>
                {bulkAction === "price" && (
                  <div className="flex gap-2">
                    <button onClick={() => setBulkType("percentage")} className={`flex-1 px-3 py-1.5 rounded text-xs ${bulkType === "percentage" ? "bg-nexa-primary text-white" : "bg-nexa-bg text-nexa-text-secondary"}`}>Yüzde (%)</button>
                    <button onClick={() => setBulkType("fixed")} className={`flex-1 px-3 py-1.5 rounded text-xs ${bulkType === "fixed" ? "bg-nexa-primary text-white" : "bg-nexa-bg text-nexa-text-secondary"}`}>Sabit</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setBulkMode("increase")} className={`flex-1 px-3 py-1.5 rounded text-xs ${bulkMode === "increase" ? "bg-nexa-primary text-white" : "bg-nexa-bg text-nexa-text-secondary"}`}>Artır</button>
                  <button onClick={() => setBulkMode("decrease")} className={`flex-1 px-3 py-1.5 rounded text-xs ${bulkMode === "decrease" ? "bg-nexa-primary text-white" : "bg-nexa-bg text-nexa-text-secondary"}`}>Azalt</button>
                  <button onClick={() => setBulkMode("replace")} className={`flex-1 px-3 py-1.5 rounded text-xs ${bulkMode === "replace" ? "bg-nexa-primary text-white" : "bg-nexa-bg text-nexa-text-secondary"}`}>Değiştir</button>
                </div>
                <input type="number" step="0.01" value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                  className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none"
                  placeholder={bulkAction === "price" ? "Fiyat değeri" : "Stok değeri"} autoFocus />
              </>
            )}

            {bulkAction === "category" && (
              <input value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}
                className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none"
                placeholder="Yeni kategori adı" autoFocus />
            )}

            {bulkAction === "brand" && (
              <input value={bulkBrand} onChange={e => setBulkBrand(e.target.value)}
                className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none"
                placeholder="Yeni marka adı" autoFocus />
            )}

            {bulkAction === "apply_rules" && (
              <p className="text-sm text-nexa-text-secondary">Aktif kurallar seçili ürünlere uygulanacak. Devam edilsin mi?</p>
            )}

            {bulkAction === "delete" && (
              <p className="text-sm text-nexa-danger">{selected.size} ürün silinecek. Bu işlem geri alınamaz!</p>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-nexa-border">
              <button onClick={() => setBulkOpen(false)} className="px-4 py-2 text-sm text-nexa-text-secondary hover:text-nexa-text">İptal</button>
              <button onClick={executeBulk} disabled={bulkLoading}
                className={`px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50 ${bulkAction === "delete" ? "bg-nexa-danger hover:bg-red-600" : "bg-nexa-primary hover:bg-blue-600"}`}>
                {bulkLoading ? "İşleniyor..." : `${selected.size} ürüne uygula`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-lg bg-nexa-card border border-nexa-border rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-nexa-text">Ürün Düzenle</h2>
            <div className="space-y-3">
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" placeholder="Ürün adı" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                  className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" placeholder="Fiyat" />
                <input type="number" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })}
                  className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" placeholder="Stok" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={editForm.brand} onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                  className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" placeholder="Marka" />
                <input value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="rounded-lg border border-nexa-border bg-nexa-bg/50 px-3 py-2 text-sm text-nexa-text focus:outline-none" placeholder="Kategori" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-nexa-border">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-nexa-text-secondary hover:text-nexa-text">İptal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">{saving ? "Kaydediliyor..." : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-nexa-border bg-nexa-bg/50">
              <th className="px-3 py-3 w-10"><input type="checkbox" checked={selected.size === products.length && products.length > 0} onChange={toggleAll} className="rounded border-nexa-border" /></th>
              <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Ürün</th>
              <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Marka</th>
              <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden md:table-cell">Barkod</th>
              <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Fiyat</th>
              <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary">Stok</th>
              <th className="px-4 py-3 text-left font-semibold text-nexa-text-secondary hidden sm:table-cell">Kaynak</th>
              <th className="px-4 py-3 text-right font-semibold text-nexa-text-secondary">İşlem</th>
            </tr></thead>
            <tbody className="divide-y divide-nexa-border">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-nexa-text-secondary">Yükleniyor...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-nexa-text-secondary">
                  {search ? "Sonuç bulunamadı" : "Henüz ürün yok. Önce bir kaynağı senkronize edin."}</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className={`hover:bg-nexa-hover transition-colors ${selected.has(p.id) ? "bg-nexa-primary/5" : ""}`}>
                  <td className="px-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded border-nexa-border" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.images ? <img src={p.images} alt="" className="h-8 w-8 rounded object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div className="h-8 w-8 rounded bg-nexa-primary/10 flex items-center justify-center shrink-0"><Package size={14} className="text-nexa-primary" /></div>}
                      <div className="min-w-0"><p className="font-medium text-nexa-text truncate text-sm max-w-[250px]">{p.name}</p><p className="text-[10px] text-nexa-text-secondary font-mono truncate">{p.stockCode || p.barcode}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-nexa-text-secondary text-xs">{p.brand || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-nexa-text-secondary/70">{p.barcode || "—"}</td>
                  <td className="px-4 py-3 font-medium text-nexa-text">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3"><span className={p.stock > 0 ? "text-nexa-success" : "text-nexa-danger"}>{p.stock}</span></td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-nexa-text-secondary">{p.source?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(p)} className="px-2 py-1 text-nexa-text-secondary hover:text-nexa-primary text-xs"><Pencil size={12} className="inline" /></button>
                    <button onClick={() => { setDetailProduct(p); setDetailOpen(true); }} className="px-2 py-1 text-nexa-text-secondary hover:text-nexa-primary text-xs"><Eye size={12} className="inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal with Tabs */}
      {detailOpen && detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setDetailOpen(false); setDetailTab("overview"); }} />
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-nexa-card border border-nexa-border rounded-2xl shadow-2xl flex flex-col">
            <div className="flex items-center gap-2 px-6 pt-5 pb-3 border-b border-nexa-border shrink-0">
              <img src={detailProduct.images || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-nexa-text text-sm leading-tight truncate">{detailProduct.name}</h2>
                <p className="text-[10px] text-nexa-text-secondary">{detailProduct.source?.name || "—"} · {detailProduct.barcode || "—"}</p>
              </div>
              <button onClick={() => { setDetailOpen(false); setDetailTab("overview"); }} className="text-nexa-text-secondary hover:text-nexa-text p-1">✕</button>
            </div>
            <div className="flex border-b border-nexa-border px-6 shrink-0">
              {["overview","variants","explanation","diff","ai"].filter(t => t !== "variants" || (() => { try { return JSON.parse((detailProduct as any).variantData||"[]").length>0 } catch { return false } })()).map(t => (
                <button key={t} onClick={() => setDetailTab(t)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${detailTab===t?"border-nexa-primary text-nexa-primary":"border-transparent text-nexa-text-secondary hover:text-nexa-text"}`}>
                  {t==="overview"?"Genel Bakış":t==="variants"?`Varyantlar (${(()=>{try{return JSON.parse((detailProduct as any).variantData||"[]").length}catch{return 0}})()})`:t==="explanation"?"Açıklama":t==="diff"?"Fark":<span className="flex items-center gap-1"><Brain size={10} /> AI</span>}
                </button>
              ))}
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {detailTab === "overview" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-nexa-text-secondary text-xs">Fiyat</span><p className="text-nexa-text font-bold text-lg">{formatPrice(detailProduct.price)}</p></div>
                  <div><span className="text-nexa-text-secondary text-xs">Stok</span><p className={`text-lg font-bold ${detailProduct.stock>0?"text-nexa-success":"text-nexa-danger"}`}>{detailProduct.stock}</p></div>
                  <div><span className="text-nexa-text-secondary text-xs">Marka</span><p className="text-nexa-text">{detailProduct.brand||"—"}</p></div>
                  <div><span className="text-nexa-text-secondary text-xs">Kategori</span><p className="text-nexa-text">{detailProduct.category||"—"}</p></div>
                  <div><span className="text-nexa-text-secondary text-xs">Barkod</span><p className="text-nexa-text font-mono text-xs">{detailProduct.barcode||"—"}</p></div>
                  <div><span className="text-nexa-text-secondary text-xs">Stok Kodu</span><p className="text-nexa-text font-mono text-xs">{detailProduct.stockCode||"—"}</p></div>
                  <div><span className="text-nexa-text-secondary text-xs">Durum</span><span className={`text-xs px-1.5 py-0.5 rounded ml-1 ${detailProduct.status==="active"?"bg-nexa-success/10 text-nexa-success":"bg-nexa-warning/10 text-nexa-warning"}`}>{detailProduct.status}</span></div>
                  <div><span className="text-nexa-text-secondary text-xs">Kaynak</span><p className="text-nexa-text">{detailProduct.source?.name||"—"}</p></div>
                  <div><span className="text-nexa-text-secondary text-xs">Tarih</span><p className="text-nexa-text text-xs">{new Date(detailProduct.createdAt).toLocaleString("tr-TR")}</p></div>
                </div>
              )}

              {detailTab === "variants" && (
                <div className="space-y-2">
                  {(() => { try {
                    const vd = JSON.parse((detailProduct as any).variantData||"[]");
                    return vd.map((v:any,i:number) => {
                      const opts = Array.isArray(v.options)?v.options:[];
                      return (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-nexa-bg/30">
                          <div>
                            <p className="text-sm text-nexa-text">{opts.map((o:any)=>`${o.group}: ${o.value}`).join(", ")||"—"}</p>
                            <p className="text-[10px] text-nexa-text-secondary font-mono">{v.barcode||"—"}</p>
                          </div>
                          <div className="text-right"><p className="text-sm text-nexa-text">{v.price?formatPrice(v.price):"—"}</p><p className={`text-xs ${v.stock>0?"text-nexa-success":"text-nexa-danger"}`}>Stok: {v.stock}</p></div>
                        </div>
                      );
                    });
                  } catch { return <p className="text-nexa-text-secondary text-sm">Varyant verisi yok</p>; }})()}
                </div>
              )}

              {detailTab === "explanation" && (
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-nexa-success/5 border border-nexa-success/20">
                    <p className="text-xs font-medium text-nexa-success mb-1">📦 Kaynak</p>
                    <p className="text-nexa-text">Bu ürün <b>{detailProduct.source?.name||"bilinmeyen kaynak"}</b> XML'inden geldi.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-nexa-bg/30">
                    <p className="text-xs font-medium text-nexa-text-secondary mb-1">💰 Fiyat</p>
                    <p className="text-nexa-text">XML'deki fiyat: <b>{formatPrice(detailProduct.price)}</b>. Herhangi bir fiyat kuralı uygulanmadı.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-nexa-bg/30">
                    <p className="text-xs font-medium text-nexa-text-secondary mb-1">📊 Stok</p>
                    <p className="text-nexa-text">XML'deki stok: <b>{detailProduct.stock}</b>. Stok kuralı uygulanmadı.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-nexa-bg/30">
                    <p className="text-xs font-medium text-nexa-text-secondary mb-1">🏷️ Marka & Kategori</p>
                    <p className="text-nexa-text">Marka: <b>{detailProduct.brand||"—"}</b> · Kategori: <b>{detailProduct.category||"—"}</b></p>
                  </div>
                  <div className="p-3 rounded-lg bg-nexa-primary/5 border border-nexa-primary/20">
                    <p className="text-xs font-medium text-nexa-primary mb-1">✅ Sonuç</p>
                    <p className="text-nexa-text">Bu ürün <b>yayında</b>. Fiyat {formatPrice(detailProduct.price)}, stok {detailProduct.stock}.</p>
                  </div>
                </div>
              )}

              {detailTab === "diff" && (
                <div className="space-y-3 text-sm">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-nexa-border"><th className="px-3 py-2 text-left text-nexa-text-secondary">Alan</th><th className="px-3 py-2 text-left text-nexa-text-secondary">XML Değeri</th><th className="px-3 py-2 text-left text-nexa-text-secondary">Yayınlanan</th></tr></thead>
                    <tbody className="divide-y divide-nexa-border">
                      {[
                        ["Fiyat", formatPrice(detailProduct.price), formatPrice(detailProduct.price)],
                        ["Stok", String(detailProduct.stock), String(detailProduct.stock)],
                        ["Marka", detailProduct.brand||"—", detailProduct.brand||"—"],
                        ["Kategori", detailProduct.category||"—", detailProduct.category||"—"],
                        ["Barkod", detailProduct.barcode||"—", detailProduct.barcode||"—"],
                      ].map(([label, src, pub],i)=>(
                        <tr key={i}><td className="px-3 py-1.5 text-nexa-text-secondary">{label}</td><td className="px-3 py-1.5 text-nexa-text">{src}</td><td className={`px-3 py-1.5 ${src!==pub?"text-nexa-warning font-bold":"text-nexa-text"}`}>{pub}{src!==pub?" ✦":""}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-nexa-text-secondary">✦ = Değişiklik var. Diğer alanlar XML'den aynen alındı.</p>
                </div>
              )}

              {detailTab === "ai" && (
                <div className="space-y-4">
                  <p className="text-xs text-nexa-text-secondary">AI ile bu ürünü optimize edin. Öneriler önizlenebilir, kabul/red edilebilir.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { task: "title_optimize", label: "Başlık Optimize", desc: "SEO & GEO optimized başlık" },
                      { task: "description_generate", label: "Açıklama Oluştur", desc: "SEO açıklama" },
                      { task: "category_suggest", label: "Kategori Öner", desc: "En uygun kategori" },
                      { task: "attribute_extract", label: "Özellik Çıkar", desc: "Renk, beden, malzeme" },
                      { task: "quality_improve", label: "Kalite Analiz", desc: "Kalite skoru ve öneriler" },
                    ].map(ai => (
                      <button key={ai.task} onClick={async () => {
                        const provider = await getProvider();
                        if (!provider) return toast.error("Önce AI provider ekleyin");
                        toast.loading("AI çalışıyor...");
                        const res = await fetch("/api/thyronix/ai/action", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            providerId: provider.id,
                            task: ai.task,
                            productId: detailProduct.id,
                            prompt: `Title: ${detailProduct.name}\nBrand: ${detailProduct.brand||""}\nCategory: ${detailProduct.category||""}\n${(detailProduct as any).description ? "Desc: " + (detailProduct as any).description.substring(0,300) : ""}`,
                            responseFormat: ai.task === "category_suggest" || ai.task === "attribute_extract" || ai.task === "quality_improve" ? "json_object" : "text",
                          }),
                        });
                        const d = await res.json();
                        toast.dismiss();
                        if (d.success) {
                          // Save suggestion
                          await fetch("/api/thyronix/ai/suggestions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              productId: detailProduct.id,
                              taskType: ai.task,
                              originalValue: ai.task === "title_optimize" ? detailProduct.name : ai.task === "category_suggest" ? detailProduct.category || "" : "",
                              suggestedValue: d.content,
                              providerId: provider.id,
                              model: d.model,
                              tokenUsage: d.usage?.totalTokens || 0,
                              cost: d.cost || 0,
                            }),
                          });
                          toast.success(`${ai.label} önerisi oluşturuldu`);
                        } else { toast.error(d.error || "AI hatası"); }
                      }} className="p-3 rounded-lg border border-nexa-border bg-nexa-bg/30 hover:bg-nexa-hover text-left transition-colors">
                        <p className="text-sm font-medium text-nexa-text flex items-center gap-1"><Brain size={12} className="text-nexa-primary" /> {ai.label}</p>
                        <p className="text-[10px] text-nexa-text-secondary mt-0.5">{ai.desc}</p>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-nexa-border pt-3">
                    <p className="text-xs font-medium text-nexa-text-secondary mb-2">Önceki Öneriler</p>
                    <p className="text-[10px] text-nexa-text-secondary">AI önerileri /thyronix/ai-tools sayfasından yönetilebilir.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end p-4 pt-3 border-t border-nexa-border shrink-0">
              <button onClick={() => { setDetailOpen(false); setDetailTab("overview"); }} className="px-4 py-2 text-sm text-nexa-text-secondary hover:text-nexa-text">Kapat</button>
              <button onClick={() => { setDetailOpen(false); setDetailTab("overview"); handleEdit(detailProduct); }} className="px-4 py-2 bg-nexa-primary text-white text-sm rounded-lg hover:bg-blue-600">Düzenle</button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => { setPage(p => Math.max(1, p - 1)); setSelected(new Set()); }} disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-nexa-card border border-nexa-border text-nexa-text-secondary disabled:opacity-30 hover:bg-nexa-hover">
            <ChevronLeft size={12} /> Önceki
          </button>
          <span className="text-xs text-nexa-text-secondary px-2">Sayfa {page} / {totalPages} ({total.toLocaleString("tr-TR")} ürün)</span>
          <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setSelected(new Set()); }} disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-nexa-card border border-nexa-border text-nexa-text-secondary disabled:opacity-30 hover:bg-nexa-hover">
            Sonraki <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
