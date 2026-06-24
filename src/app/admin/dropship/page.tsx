"use client";

import { useEffect, useState } from "react";
import {
  Store, ExternalLink, CheckCircle, XCircle, Search, Globe, Loader2, AlertCircle,
  Plus, Settings, Package, ShoppingCart, Palette, Link, Eye, EyeOff, Trash2,
  ChevronLeft, Image, Star
} from "lucide-react";

type DealerStore = {
  id: string;
  dealerId: string;
  name: string;
  slug: string;
  status: string;
  paymentModel: string;
  logo: string;
  coverImage: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  themeJson: string;
  customDomain: string;
  customDomainVerified: boolean;
  createdAt: string;
  _count?: { products: number; orders: number };
};

type StoreProduct = {
  id: string;
  storeId: string;
  productCatalogItemId: string;
  dealerPrice: number;
  isActive: boolean;
  sortOrder: number;
  catalogItem: {
    id: string; name: string; sku: string; imagesJson: string;
    category: string; description: string; basePrice: number;
  } | null;
};

type CatalogItem = {
  id: string; name: string; sku: string; imagesJson: string;
  category: string; description: string; basePrice: number;
};

export default function AdminDropshipPage() {
  const [stores, setStores] = useState<DealerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<DealerStore | null>(null);
  const [tab, setTab] = useState("settings");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", slug: "", paymentModel: "PLATFORM" });
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogItem[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [storeForm, setStoreForm] = useState<Record<string, string>>({});
  const [themeForm, setThemeForm] = useState<Record<string, string>>({});
  const [domainInput, setDomainInput] = useState("");

  useEffect(() => {
    fetch("/api/dropship/stores")
      .then((r) => r.json())
      .then((d) => { if (d.success) setStores(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const loadStoreDetail = async (store: DealerStore) => {
    setSelectedStore(store);
    setTab("settings");
    const res = await fetch(`/api/dropship/stores/${store.id}`);
    const d = await res.json();
    if (d.success) {
      setProducts(d.data.products || []);
      setStoreForm({
        name: d.data.name || "", slug: d.data.slug || "",
        aboutText: d.data.aboutText || "", contactEmail: d.data.contactEmail || "",
        contactPhone: d.data.contactPhone || "", paymentModel: d.data.paymentModel || "PLATFORM",
      });
      try {
        const tj = JSON.parse(d.data.themeJson || "{}");
        setThemeForm({
          primaryColor: tj.primaryColor || "#f97316",
          secondaryColor: tj.secondaryColor || "#ef4444",
          fontFamily: tj.fontFamily || "Inter",
          backgroundColor: tj.backgroundColor || "#0f172a",
        });
      } catch { setThemeForm({ primaryColor: "#f97316", secondaryColor: "#ef4444", fontFamily: "Inter", backgroundColor: "#0f172a" }); }
    }
    setError(""); setSuccess("");
  };

  const handleDomainAction = async (storeId: string, action: string) => {
    setActing(storeId);
    await fetch("/api/dropship/stores/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, action }),
    });
    setActing(null);
    window.location.reload();
  };

  const createStore = async () => {
    setSaving(true); setError("");
    const res = await fetch("/api/dropship/stores", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const d = await res.json();
    if (d.success) { setShowCreate(false); setCreateForm({ name: "", slug: "", paymentModel: "PLATFORM" }); window.location.reload(); }
    else setError(d.error || "Hata");
    setSaving(false);
  };

  const updateStore = async (extra?: Record<string, unknown>) => {
    if (!selectedStore) return;
    setSaving(true); setError(""); setSuccess("");
    const data = { ...storeForm };
    if (extra) Object.assign(data, extra);
    const res = await fetch(`/api/dropship/stores/${selectedStore.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const d = await res.json();
    if (d.success) { setSuccess("Kaydedildi"); loadStoreDetail(d.data); }
    else setError(d.error || "Hata");
    setSaving(false);
  };

  const updateTheme = async () => {
    if (!selectedStore) return;
    setSaving(true); setError(""); setSuccess("");
    const res = await fetch(`/api/dropship/stores/${selectedStore.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeJson: JSON.stringify(themeForm) }),
    });
    const d = await res.json();
    if (d.success) { setSuccess("Tema kaydedildi"); }
    else setError(d.error || "Hata");
    setSaving(false);
  };

  const searchCatalog = async (q: string) => {
    setCatalogSearch(q);
    if (!q) { setCatalogResults([]); return; }
    const res = await fetch(`/api/dropship/catalog?search=${encodeURIComponent(q)}`);
    const d = await res.json();
    if (d.success) setCatalogResults(d.data);
  };

  const addProduct = async (catalogItemId: string) => {
    if (!selectedStore) return;
    const res = await fetch(`/api/dropship/stores/${selectedStore.id}/products`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCatalogItemId: catalogItemId, dealerPrice: 0 }),
    });
    const d = await res.json();
    if (d.success) { setShowCatalog(false); setCatalogSearch(""); setCatalogResults([]); loadStoreDetail(selectedStore); }
    else setError(d.error || "Hata");
  };

  const removeProduct = async (productId: string) => {
    if (!selectedStore) return;
    const res = await fetch(`/api/dropship/stores/${selectedStore.id}/products`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const d = await res.json();
    if (d.success) loadStoreDetail(selectedStore);
    else setError(d.error || "Hata");
  };

  const updateProductPrice = async (productId: string, dealerPrice: number) => {
    if (!selectedStore) return;
    const res = await fetch(`/api/dropship/stores/${selectedStore.id}/products`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, dealerPrice }),
    });
    const d = await res.json();
    if (d.success) loadStoreDetail(selectedStore);
    else setError(d.error || "Hata");
  };

  const changeStatus = async (status: string) => {
    await updateStore({ status });
  };

  const deleteStore = async () => {
    if (!selectedStore || !confirm("Mağazayı silmek istediğine emin misin? Tüm verileri (ürünler, siparişler) silinecek!")) return;
    setSaving(true);
    const res = await fetch(`/api/dropship/stores/${selectedStore.id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) { setSelectedStore(null); window.location.reload(); }
    else setError(d.error || "Hata");
    setSaving(false);
  };

  const handleDomainAdd = async () => {
    if (!selectedStore || !domainInput) return;
    setSaving(true); setError(""); setSuccess("");
    const res = await fetch(`/api/dropship/stores/${selectedStore.id}/domain`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customDomain: domainInput }),
    });
    const d = await res.json();
    if (d.success) { setSuccess("Domain eklendi"); setDomainInput(""); loadStoreDetail(selectedStore); }
    else setError(d.error || "Hata");
    setSaving(false);
  };

  const handleDomainRemove = async () => {
    if (!selectedStore) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/dropship/stores/${selectedStore.id}/domain`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) { setSuccess("Domain kaldırıldı"); loadStoreDetail(selectedStore); }
    else setError(d.error || "Hata");
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (d.success) await updateStore({ logo: d.data[0]?.fileUrl || "" });
  };

  const filtered = stores.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const pendingDomains = stores.filter((s) => s.customDomain && !s.customDomainVerified);

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      ACTIVE: { color: "bg-green-100 text-green-800", label: "Aktif" },
      DRAFT: { color: "bg-yellow-100 text-yellow-800", label: "Taslak" },
      SUSPENDED: { color: "bg-red-100 text-red-800", label: "Askıda" },
    };
    const m = map[status] || { color: "bg-gray-100 text-gray-800", label: status };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>{m.label}</span>;
  };

  const tabs = [
    { key: "settings", label: "Ayarlar", icon: Settings },
    { key: "products", label: "Ürünler", icon: Package },
    { key: "theme", label: "Tema", icon: Palette },
    { key: "domain", label: "Domain", icon: Link },
    { key: "orders", label: "Siparişler", icon: ShoppingCart },
    { key: "preview", label: "Ön İzleme", icon: Eye },
  ];

  if (selectedStore) {
    const store = selectedStore;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedStore(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
              <p className="text-sm text-gray-500">{store.slug}.enaunity.com.tr</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(store.status)}
            <a href={`https://${store.slug}.enaunity.com.tr`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ena-primary hover:bg-ena-primary/5 rounded-lg">
              <ExternalLink size={14} /> Aç
            </a>
          </div>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
        {success && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "settings" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border flex-shrink-0">
                {store.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Image size={24} className="text-gray-400" /></div>}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-700 cursor-pointer transition-colors">
                  <Image size={16} /> Logo Yükle
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza Adı</label>
                <input type="text" value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (altdomain)</label>
                <input type="text" value={storeForm.slug} onChange={(e) => setStoreForm({ ...storeForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input type="email" value={storeForm.contactEmail} onChange={(e) => setStoreForm({ ...storeForm, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="text" value={storeForm.contactPhone} onChange={(e) => setStoreForm({ ...storeForm, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Modeli</label>
                <select value={storeForm.paymentModel} onChange={(e) => setStoreForm({ ...storeForm, paymentModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                  <option value="PLATFORM">Platform (ENAUNITY POS)</option>
                  <option value="DEALER">Bayi POS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hakkında</label>
                <input type="text" value={storeForm.aboutText} onChange={(e) => setStoreForm({ ...storeForm, aboutText: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => updateStore()}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm">
                {saving ? <Loader2 size={16} className="animate-spin inline mr-1" /> : null}
                Kaydet
              </button>
              {store.status !== "ACTIVE" && (
                <button onClick={() => changeStatus("ACTIVE")} disabled={saving}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
                  <Eye size={16} /> Yayına Al
                </button>
              )}
              {store.status === "ACTIVE" && (
                <button onClick={() => changeStatus("SUSPENDED")} disabled={saving}
                  className="flex items-center gap-1 px-3 py-2 bg-yellow-600 text-white rounded-xl text-sm font-medium hover:bg-yellow-700 transition-colors">
                  <EyeOff size={16} /> Yayından Kaldır
                </button>
              )}
              <button onClick={deleteStore} disabled={saving}
                className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors ml-auto">
                <Trash2 size={16} /> Mağazayı Sil
              </button>
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Ürünler ({products.length})</h2>
                <button onClick={() => setShowCatalog(!showCatalog)}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
                  <Plus size={16} /> Ürün Ekle
                </button>
              </div>

              {showCatalog && (
                <div className="mb-4 p-4 bg-gray-50 rounded-xl border space-y-3">
                  <input type="text" value={catalogSearch} onChange={(e) => searchCatalog(e.target.value)}
                    placeholder="Hazır Ürün Deposu'nda ara..."
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {catalogResults.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                            {item.imagesJson ? <img src={JSON.parse(item.imagesJson)[0]} alt="" className="w-full h-full object-cover" /> : <Package size={20} className="m-auto text-gray-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.sku} · {item.category}</p>
                          </div>
                        </div>
                        <button onClick={() => addProduct(item.id)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
                          Ekle
                        </button>
                      </div>
                    ))}
                    {catalogSearch && catalogResults.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sonuç bulunamadı</p>}
                  </div>
                </div>
              )}

              {products.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Henüz ürün eklenmemiş</p>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-white overflow-hidden border">
                          {p.catalogItem?.imagesJson ? <img src={JSON.parse(p.catalogItem.imagesJson)[0]} alt="" className="w-full h-full object-cover" /> : <Package size={24} className="m-auto text-gray-300" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.catalogItem?.name || "Bilinmeyen Ürün"}</p>
                          <p className="text-xs text-gray-500">{p.catalogItem?.sku} · Baz: {p.catalogItem?.basePrice} TL</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={p.dealerPrice}
                          onBlur={(e) => { const v = parseFloat(e.target.value); if (v !== p.dealerPrice) updateProductPrice(p.id, v); }}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right" min="0" step="0.01" />
                        <button onClick={() => removeProduct(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "theme" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Tema Ayarları</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ana Renk</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={themeForm.primaryColor} onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer" />
                  <input type="text" value={themeForm.primaryColor} onChange={(e) => setThemeForm({ ...themeForm, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İkincil Renk</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={themeForm.secondaryColor} onChange={(e) => setThemeForm({ ...themeForm, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer" />
                  <input type="text" value={themeForm.secondaryColor} onChange={(e) => setThemeForm({ ...themeForm, secondaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arkaplan Rengi</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={themeForm.backgroundColor} onChange={(e) => setThemeForm({ ...themeForm, backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer" />
                  <input type="text" value={themeForm.backgroundColor} onChange={(e) => setThemeForm({ ...themeForm, backgroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
                <select value={themeForm.fontFamily} onChange={(e) => setThemeForm({ ...themeForm, fontFamily: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ background: themeForm.backgroundColor, fontFamily: themeForm.fontFamily }}>
              <p className="text-sm" style={{ color: themeForm.primaryColor }}>Önizleme: Bu yazı ana renkte görünür</p>
              <p className="text-xs mt-1" style={{ color: themeForm.secondaryColor }}>Bu yazı ikincil renkte görünür</p>
            </div>
            <button onClick={updateTheme} disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm">
              {saving ? <Loader2 size={16} className="animate-spin inline mr-1" /> : null}
              Temayı Kaydet
            </button>
          </div>
        )}

        {tab === "domain" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Domain Yönetimi</h2>
            <div className="p-4 rounded-xl bg-gray-50 border space-y-2">
              <p className="text-sm font-medium text-gray-700">Alt Domain (otomatik)</p>
              <p className="text-sm text-ena-primary font-mono">{store.slug}.enaunity.com.tr <span className="text-green-600 text-xs ml-2">✓ Aktif</span></p>
            </div>
            {store.customDomain ? (
              <div className={`p-4 rounded-xl border ${store.customDomainVerified ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"} space-y-2`}>
                <p className="text-sm font-medium text-gray-700">Custom Domain</p>
                <p className="text-sm font-mono">{store.customDomain}
                  {store.customDomainVerified
                    ? <span className="text-green-600 text-xs ml-2">✓ Doğrulandı</span>
                    : <span className="text-yellow-600 text-xs ml-2">⏳ Onay bekliyor</span>
                  }
                </p>
                <button onClick={handleDomainRemove} disabled={saving}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">
                  Domaini Kaldır
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Kendi domain'ini bağlamak için CNAME: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{store.slug}.enaunity.com.tr</code></p>
                <div className="flex items-center gap-2">
                  <input type="text" value={domainInput} onChange={(e) => setDomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ""))}
                    placeholder="ornek.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                  <button onClick={handleDomainAdd} disabled={saving || !domainInput}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm">
                    {saving ? "..." : "Bağla"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <OrdersTab storeId={store.id} />
        )}

        {tab === "preview" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Mağaza Ön İzleme</h2>
            <p className="text-sm text-gray-500">Mağazayı yeni sekmede açarak canlı halini görebilirsin.</p>
            <div className="flex items-center justify-center gap-3">
              <a href={`https://${store.slug}.enaunity.com.tr`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all text-sm">
                <ExternalLink size={16} /> Mağazayı Aç
              </a>
              {store.customDomainVerified && store.customDomain && (
                <a href={`https://${store.customDomain}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all text-sm">
                  <Globe size={16} /> {store.customDomain}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ENA Dropship</h1>
          <p className="text-sm text-gray-500 mt-1">Mağazaları yönet, düzenle, aç/kapat</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all text-sm">
          <Plus size={16} /> Yeni Mağaza Aç
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Yeni Mağaza Aç</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza Adı</label>
              <input type="text" value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--+/g, "-").replace(/^-|-$/g, "") })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (altdomain)</label>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <input type="text" value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono" />
                <span>.enaunity.com.tr</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Modeli</label>
              <select value={createForm.paymentModel} onChange={(e) => setCreateForm({ ...createForm, paymentModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="PLATFORM">Platform (ENAUNITY POS)</option>
                <option value="DEALER">Bayi POS</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={createStore} disabled={saving || !createForm.name || !createForm.slug}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm">
                {saving ? "Oluşturuluyor..." : "Mağazayı Oluştur"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all text-sm">
                İptal
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}

      {error && !showCreate && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"><AlertCircle size={16} />{error}</div>
      )}

      {pendingDomains.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <AlertCircle size={16} /> Bekleyen Domain Talepleri ({pendingDomains.length})
          </h2>
          {pendingDomains.map((store) => (
            <div key={store.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
              <div>
                <p className="text-sm font-medium text-gray-900">{store.name}</p>
                <p className="text-xs text-gray-500"><strong>{store.customDomain}</strong> → {store.slug}.enaunity.com.tr</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDomainAction(store.id, "verify")} disabled={acting === store.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                  {acting === store.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Onayla
                </button>
                <button onClick={() => handleDomainAction(store.id, "reject")} disabled={acting === store.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50">
                  <XCircle size={12} /> Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Mağaza ara..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Henüz mağaza yok</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((store) => (
            <div key={store.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => loadStoreDetail(store)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {store.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover" /> : <Store size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{store.name}</h3>
                      {statusBadge(store.status)}
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {store.paymentModel === "PLATFORM" ? "Platform" : "Bayi POS"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {store.slug}.enaunity.com.tr
                      {store.customDomainVerified && store.customDomain && (
                        <span className="ml-2 text-green-600">| <Globe size={12} className="inline" /> {store.customDomain}</span>
                      )}
                      {store.customDomain && !store.customDomainVerified && (
                        <span className="ml-2 text-amber-600">| <Globe size={12} className="inline" /> {store.customDomain} (onay bekliyor)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{store._count?.products || 0}</p>
                    <p className="text-xs">Ürün</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{store._count?.orders || 0}</p>
                    <p className="text-xs">Sipariş</p>
                  </div>
                  <div className="text-ena-primary text-xs font-medium">Düzenle →</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersTab({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/dropship/stores/${storeId}/orders`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrders(d.data); })
      .finally(() => setLoading(false));
  }, [storeId]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    const res = await fetch(`/api/dropship/stores/${storeId}/orders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    const d = await res.json();
    if (d.success) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    }
    setUpdating(null);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      SHIPPED: "bg-purple-100 text-purple-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      PENDING: "Bekliyor", CONFIRMED: "Onaylandı", SHIPPED: "Kargoda", DELIVERED: "Teslim Edildi", CANCELLED: "İptal",
    };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100"}`}>{labels[status] || status}</span>;
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Yükleniyor...</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Siparişler ({orders.length})</h2>
      {orders.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Henüz sipariş yok</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">#{order.id.slice(-6)}</span>
                  {statusBadge(order.status)}
                </div>
                <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                <p className="text-xs text-gray-500">{order.customerEmail} · {order.customerPhone || "-"}</p>
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("tr-TR")}</p>
              </div>
              <div className="text-right space-y-2">
                <p className="text-sm font-bold text-gray-900">{order.totalAmount?.toFixed(2)} TL</p>
                <div className="flex items-center gap-1">
                  {order.status === "PENDING" && (
                    <button onClick={() => updateStatus(order.id, "CONFIRMED")} disabled={updating === order.id}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                      Onayla
                    </button>
                  )}
                  {order.status === "CONFIRMED" && (
                    <button onClick={() => updateStatus(order.id, "SHIPPED")} disabled={updating === order.id}
                      className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
                      Kargola
                    </button>
                  )}
                  {order.status === "SHIPPED" && (
                    <button onClick={() => updateStatus(order.id, "DELIVERED")} disabled={updating === order.id}
                      className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                      Teslim Et
                    </button>
                  )}
                  {(order.status === "PENDING" || order.status === "CONFIRMED") && (
                    <button onClick={() => updateStatus(order.id, "CANCELLED")} disabled={updating === order.id}
                      className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50">
                      İptal
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
