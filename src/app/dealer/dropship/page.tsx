"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store, Globe, ShoppingCart, Package, Settings, ExternalLink,
  CheckCircle, AlertCircle, Loader2, Eye, EyeOff, ArrowRight,
  Image, Palette, Trash2, Plus, Search, X
} from "lucide-react";

type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  image: string;
  category: string;
};

type StoreProduct = {
  id: string;
  productCatalogItemId: string;
  dealerPrice: number;
  isActive: boolean;
  sortOrder: number;
  catalogItem: CatalogItem | null;
};

type DealerStore = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo: string;
  coverImage: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  themeJson: string;
  paymentModel: string;
  orderCount: number;
  totalRevenue: number;
  createdAt: string;
  products: StoreProduct[];
};

type Tab = "settings" | "products" | "orders" | "theme";

export default function DealerDropshipPage() {
  const router = useRouter();
  const [store, setStore] = useState<DealerStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"setup" | "overview">("setup");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("settings");
  const [form, setForm] = useState({
    name: "", slug: "", aboutText: "", contactEmail: "", contactPhone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [theme, setTheme] = useState({
    primaryColor: "#f97316",
    secondaryColor: "#ef4444",
    fontFamily: "Inter",
    backgroundColor: "#0f0f1a",
  });

  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    fetch("/api/dealer/dropship/store")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const s = d.data;
          setStore(s);
          setForm({
            name: s.name, slug: s.slug, aboutText: s.aboutText,
            contactEmail: s.contactEmail, contactPhone: s.contactPhone,
          });
          try { setTheme({ ...theme, ...JSON.parse(s.themeJson || "{}") }); } catch {}
          setStep("overview");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showCatalog && catalogSearch.length >= 2) {
      setSearching(true);
      const t = setTimeout(() => {
        fetch(`/api/product-library/items?search=${encodeURIComponent(catalogSearch)}&limit=20`)
          .then((r) => r.json())
          .then((d) => setCatalogResults(d.data || []))
          .catch(() => {})
          .finally(() => setSearching(false));
      }, 400);
      return () => clearTimeout(t);
    }
    if (!showCatalog) { setCatalogSearch(""); setCatalogResults([]); }
  }, [catalogSearch, showCatalog]);

  const createStore = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/dealer/dropship/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, themeJson: JSON.stringify(theme) }),
      });
      const d = await res.json();
      if (d.success) { setStore(d.data); setStep("overview"); }
      else setError(d.error || "Bir hata oluştu");
    } catch { setError("Bir hata oluştu"); }
    finally { setSaving(false); }
  };

  const updateStore = async (extra?: Record<string, unknown>) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/dealer/dropship/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(extra || {}) }),
      });
      const d = await res.json();
      if (d.success) { setStore(d.data); setSuccess("Kaydedildi!"); }
      else setError(d.error || "Bir hata oluştu");
    } catch { setError("Bir hata oluştu"); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.success) await updateStore({ coverImage: d.data.fileUrl });
    } catch { setError("Logo yüklenemedi"); }
  };

  const addProduct = async (productCatalogItemId: string) => {
    const res = await fetch("/api/dealer/dropship/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCatalogItemId, dealerPrice: 0 }),
    });
    const d = await res.json();
    if (d.success) {
      setShowCatalog(false);
      fetchProducts();
    } else setError(d.error || "Ürün eklenemedi");
  };

  const fetchProducts = async () => {
    const res = await fetch("/api/dealer/dropship/products");
    const d = await res.json();
    if (d.success) setStore((prev) => prev ? { ...prev, products: d.data } : prev);
  };

  const removeProduct = async (id: string) => {
    const res = await fetch("/api/dealer/dropship/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await res.json();
    if (d.success) fetchProducts();
  };

  const updateProductPrice = async (id: string, dealerPrice: number) => {
    await fetch("/api/dealer/dropship/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dealerPrice }),
    });
    fetchProducts();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark flex items-center justify-center">
        <div className="animate-pulse text-ena-light">Yükleniyor...</div>
      </div>
    );
  }

  if (step === "setup" && !store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark p-6">
        <div className="max-w-2xl mx-auto pt-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 mb-4">
              <Store size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">AI Dropship Store</h1>
            <p className="text-ena-light mt-2">Kendi e-ticaret mağazanı oluştur</p>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Mağaza Adı</label>
              <input
                type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Korhan'ın Dünyası"
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Alt Domain</label>
              <div className="flex items-center gap-2">
                <input
                  type="text" value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  placeholder="korhan"
                  className="flex-1 px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                />
                <span className="text-ena-light text-sm whitespace-nowrap">.enaunity.com.tr</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Hakkımızda</label>
              <textarea
                value={form.aboutText}
                onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
                rows={3} placeholder="Mağazan hakkında kısa bir açıklama..."
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">E-posta</label>
                <input
                  type="email" value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="ornek@email.com"
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">Telefon</label>
                <input
                  type="tel" value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="0555 555 55 55"
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={createStore}
              disabled={saving || !form.name || !form.slug}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Store size={18} />}
              {saving ? "Oluşturuluyor..." : "Mağazamı Oluştur"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "settings", label: "Ayarlar", icon: <Settings size={16} /> },
    { key: "products", label: "Ürünler", icon: <Package size={16} /> },
    { key: "orders", label: "Siparişler", icon: <ShoppingCart size={16} /> },
    { key: "theme", label: "Tema", icon: <Palette size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark p-6">
      <div className="max-w-5xl mx-auto pt-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center overflow-hidden">
              {store?.coverImage ? (
                <img src={store.coverImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store size={24} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{store?.name}</h1>
              <a href={`https://${store?.slug}.enaunity.com.tr`} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1">
                {store?.slug}.enaunity.com.tr <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              store?.status === "ACTIVE"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : store?.status === "DRAFT"
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
              {store?.status === "ACTIVE" ? <Eye size={12} /> : <EyeOff size={12} />}
              {store?.status === "ACTIVE" ? "Yayında" : store?.status === "DRAFT" ? "Taslak" : "Askıda"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-2xl font-bold text-white">{store?.orderCount || 0}</p>
            <p className="text-xs text-ena-light mt-1">Toplam Sipariş</p>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-2xl font-bold text-white">{store?.totalRevenue?.toFixed(2) || "0.00"} TL</p>
            <p className="text-xs text-ena-light mt-1">Toplam Ciro</p>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-2xl font-bold text-white">{store?.products?.length || 0}</p>
            <p className="text-xs text-ena-light mt-1">Ürün Sayısı</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? "bg-orange-500/20 text-orange-400" : "text-ena-light hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {tab === "settings" && (
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Mağaza Ayarları</h2>

            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-ena-dark border border-white/10 flex-shrink-0">
                {store?.coverImage ? (
                  <img src={store.coverImage} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image size={24} className="text-gray-500" />
                  </div>
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white cursor-pointer transition-colors">
                  <Image size={16} />
                  Logo Yükle
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <p className="text-xs text-ena-light mt-1">PNG, JPG, WebP — 2MB maks</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Mağaza Adı</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Alt Domain</label>
              <div className="flex items-center gap-2">
                <input type="text" value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="flex-1 px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
                <span className="text-ena-light text-sm">.enaunity.com.tr</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Hakkımızda</label>
              <textarea value={form.aboutText} onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">E-posta</label>
                <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">Telefon</label>
                <input type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => updateStore()}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              {store?.status === "DRAFT" && (
                <button onClick={async () => { await updateStore({ status: "ACTIVE" }); window.location.reload(); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600/80 text-white rounded-xl font-medium hover:bg-green-600 transition-all text-sm">
                  <Eye size={16} /> Yayına Al
                </button>
              )}
              {store?.status === "ACTIVE" && (
                <button onClick={async () => { await updateStore({ status: "SUSPENDED" }); window.location.reload(); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-yellow-600/80 text-white rounded-xl font-medium hover:bg-yellow-600 transition-all text-sm">
                  <EyeOff size={16} /> Yayından Kaldır
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Ürünlerim</h2>
                <button onClick={() => setShowCatalog(!showCatalog)}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 rounded-xl text-sm font-medium hover:bg-orange-500/30 transition-colors">
                  <Plus size={16} /> Ürün Ekle
                </button>
              </div>

              {showCatalog && (
                <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-ena-light" />
                    <input type="text" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Hazır Ürün Deposu'nda ara..."
                      autoFocus
                      className="flex-1 px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
                  </div>
                  {searching && <p className="text-sm text-ena-light">Aranıyor...</p>}
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {catalogResults.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-ena-dark" />
                          )}
                          <div>
                            <p className="text-sm text-white">{item.name}</p>
                            <p className="text-xs text-ena-light">{item.sku} • {item.category}</p>
                          </div>
                        </div>
                        <button onClick={() => addProduct(item.id)}
                          className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors">
                          Ekle
                        </button>
                      </div>
                    ))}
                    {!searching && catalogSearch.length >= 2 && catalogResults.length === 0 && (
                      <p className="text-sm text-ena-light">Sonuç bulunamadı</p>
                    )}
                  </div>
                </div>
              )}

              {store?.products && store.products.length > 0 ? (
                <div className="space-y-2">
                  {store.products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        {p.catalogItem?.image && (
                          <img src={p.catalogItem.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-ena-dark" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{p.catalogItem?.name || "Ürün"}</p>
                          <p className="text-xs text-ena-light">{p.catalogItem?.sku}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <input type="number" value={p.dealerPrice} min={0} step={0.01}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              updateProductPrice(p.id, v);
                            }}
                            className="w-28 px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                          <span className="text-xs text-ena-light">TL</span>
                        </div>
                        <button onClick={() => removeProduct(p.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ena-light text-center py-8">Henüz ürün eklemedin. Hazır Ürün Deposu'ndan ürünleri seçerek başla.</p>
              )}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Siparişler</h2>
            <p className="text-sm text-ena-light">Sipariş yönetimi M6'da eklenecek.</p>
          </div>
        )}

        {tab === "theme" && (
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Tema Özelleştirme</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">Ana Renk</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                  <span className="text-sm text-white">{theme.primaryColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">İkincil Renk</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.secondaryColor}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                  <span className="text-sm text-white">{theme.secondaryColor}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Yazı Tipi</label>
              <select value={theme.fontFamily}
                onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })}
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm">
                <option value="Inter">Inter</option>
                <option value="Poppins">Poppins</option>
                <option value="Roboto">Roboto</option>
                <option value="Playfair Display">Playfair Display</option>
              </select>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
              <Palette size={16} />
              <span>Renk değişikliklerini kaydetmek için aşağıdaki Kaydet butonuna bas.</span>
            </div>
            <button onClick={() => updateStore({ themeJson: JSON.stringify(theme) })}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Palette size={16} />}
              {saving ? "Kaydediliyor..." : "Temayı Kaydet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
