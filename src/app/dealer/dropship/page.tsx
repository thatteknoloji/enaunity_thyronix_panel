"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Store, ShoppingCart, Package, Settings, ExternalLink,
  CheckCircle, AlertCircle, Loader2, Eye, EyeOff,
  Image, Palette, Trash2, Plus, Search, X, Link, Tag,
  Download, ChevronDown, ChevronUp, User, MapPin, Clock, FileText, CreditCard, Bell, Truck
} from "lucide-react";
import ThemeTab from "./ThemeTab";
import CategoriesTab from "./CategoriesTab";
import MediaTab from "./MediaTab";
import BannersTab from "./BannersTab";

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
  stock: number;
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
  customDomain: string;
  customDomainVerified: boolean;
  orderCount: number;
  totalRevenue: number;
  createdAt: string;
  products: StoreProduct[];
};

type Tab = "settings" | "products" | "orders" | "categories" | "theme" | "media" | "banners";

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

  const [notification, setNotification] = useState<{ time: Date; count: number } | null>(null);
  const prevPendingCount = useRef(0);
  const notificationTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!store) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/dealer/dropship/orders?status=PENDING&limit=100");
        const d = await res.json();
        if (d.success && Array.isArray(d.data)) {
          const newCount = d.data.length;
          const oldCount = prevPendingCount.current;
          if (newCount > oldCount && oldCount > 0) {
            setNotification({ time: new Date(), count: newCount - oldCount });
            if (notificationTimer.current) clearTimeout(notificationTimer.current);
            notificationTimer.current = setTimeout(() => setNotification(null), 8000);
          }
          prevPendingCount.current = newCount;
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [store]);

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
      if (d.success) await updateStore({ logo: d.data[0]?.fileUrl || "" });
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

  const updateProductStock = async (id: string, stock: number) => {
    await fetch("/api/dealer/dropship/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock }),
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
            <h1 className="text-2xl font-bold text-white">ENA Dropship</h1>
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
    { key: "categories", label: "Kategoriler", icon: <Tag size={16} /> },
    { key: "media", label: "Medya", icon: <Image size={16} /> },
    { key: "banners", label: "Banner", icon: <Image size={16} /> },
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
            {notification && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-xl text-xs font-medium animate-pulse flex items-center gap-1.5">
                <Bell size={12} />
                {notification.count} yeni sipariş!
              </div>
            )}
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
          <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Mağaza Ayarları</h2>

            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-ena-dark border border-white/10 flex-shrink-0">
                {store?.logo || store?.coverImage ? (
                  <img src={store.logo || store.coverImage || ""} alt="Logo" className="w-full h-full object-cover" />
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

          <CustomDomainSection store={store} />
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
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {p.catalogItem?.image && (
                          <img src={p.catalogItem.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-ena-dark shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.catalogItem?.name || "Ürün"}</p>
                          <div className="flex items-center gap-2 text-xs text-ena-light">
                            <span>{p.catalogItem?.sku}</span>
                            {p.catalogItem?.category && (
                              <>
                                <span>•</span>
                                <span>{p.catalogItem.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <input type="number" defaultValue={p.dealerPrice} min={0} step={0.01}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              if (v !== p.dealerPrice) updateProductPrice(p.id, v);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const v = parseFloat((e.target as HTMLInputElement).value) || 0;
                                if (v !== p.dealerPrice) updateProductPrice(p.id, v);
                              }
                            }}
                            className="w-20 px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                          <span className="text-xs text-ena-light">TL</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" defaultValue={p.stock} min={0} step={1}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value) || 0;
                              if (v !== p.stock) updateProductStock(p.id, v);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const v = parseInt((e.target as HTMLInputElement).value) || 0;
                                if (v !== p.stock) updateProductStock(p.id, v);
                              }
                            }}
                            className={`w-16 px-2 py-1.5 bg-ena-dark border rounded-lg text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                              p.stock <= 0 ? "border-red-500/40" : "border-white/10"
                            }`} />
                          <span className={`text-xs ${p.stock <= 0 ? "text-red-400" : "text-ena-light"}`}>adet</span>
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
          <OrdersTab />
        )}

        {tab === "categories" && (
          <CategoriesTab storeId={store?.id || ""} />
        )}

        {tab === "media" && (
          <MediaTab />
        )}

        {tab === "banners" && (
          <BannersTab />
        )}

        {tab === "theme" && (
          <ThemeTab store={store} onSaved={() => window.location.reload()} />
        )}
      </div>
    </div>
  );
}

type StoreOrder = {
  id: string; customerName: string; customerEmail: string; customerPhone: string;
  shippingAddress: string; city: string; district: string; zipCode: string;
  totalAmount: number; status: string;
  itemsJson: string; notes: string; trackingCode: string; carrierName: string;
  createdAt: string;
};

const STATUS_MAP: Record<string, string> = {
  PENDING: "Bekliyor", CONFIRMED: "Onaylandı", SHIPPED: "Kargoda",
  DELIVERED: "Teslim Edildi", CANCELLED: "İptal",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  CONFIRMED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SHIPPED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DELIVERED: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

function OrdersTab() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<StoreOrder | null>(null);

  useEffect(() => {
    fetch("/api/dealer/dropship/orders")
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrders(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await fetch("/api/dealer/dropship/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    if (detailOrder?.id === id) setDetailOrder({ ...detailOrder, status });
    setUpdating(null);
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!o.customerName.toLowerCase().includes(q) && !o.customerEmail.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const rows = filteredOrders.map((o) => {
      const items = (() => { try { return JSON.parse(o.itemsJson || "[]"); } catch { return []; } })();
      const itemSummary = items.map((i: { quantity?: number; unitPrice?: number }) =>
        `${i.quantity || 1}x ${((i.unitPrice || 0) * (i.quantity || 1)).toFixed(2)} TL`
      ).join("; ");
      return [o.id, o.customerName, o.customerEmail, o.shippingAddress, o.totalAmount.toFixed(2), STATUS_MAP[o.status] || o.status, itemSummary, new Date(o.createdAt).toLocaleDateString("tr-TR")];
    });
    const csv = [["Sipariş No", "Müşteri", "E-posta", "Adres", "Tutar", "Durum", "Ürünler", "Tarih"], ...rows]
      .map((r) => r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "siparisler.csv"; a.click();
  };

  const statusFilters = [
    { key: "ALL", label: "Tümü" },
    { key: "PENDING", label: "Bekliyor" },
    { key: "CONFIRMED", label: "Onaylandı" },
    { key: "SHIPPED", label: "Kargoda" },
    { key: "DELIVERED", label: "Teslim" },
    { key: "CANCELLED", label: "İptal" },
  ];

  const totalRevenue = filteredOrders.reduce((s, o) => s + o.totalAmount, 0);
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  if (loading) return <div className="text-ena-light text-center py-8">Yükleniyor...</div>;

  return (
    <div className="space-y-4">
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-ena-light">Toplam Sipariş</p>
            <p className="text-xl font-bold text-white mt-1">{orders.length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-ena-light">Toplam Gelir</p>
            <p className="text-xl font-bold text-green-400 mt-1">{orders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)} TL</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-ena-light">Bekleyen</p>
            <p className="text-xl font-bold text-yellow-400 mt-1">{pendingCount}</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-ena-light">Ortalama Sipariş</p>
            <p className="text-xl font-bold text-ena-light mt-1">{orders.length > 0 ? (orders.reduce((s, o) => s + o.totalAmount, 0) / orders.length).toFixed(2) : "0.00"} TL</p>
          </div>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ena-light" />
            <input type="text" value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Müşteri adı veya e-posta ile ara..."
              className="w-full pl-10 pr-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
          <button onClick={exportCSV} disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-ena-light hover:text-white text-sm disabled:opacity-50 transition-colors">
            <Download size={14} /> CSV
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {statusFilters.map((sf) => (
            <button key={sf.key} onClick={() => setStatusFilter(sf.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === sf.key
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-ena-light hover:text-white bg-white/5 hover:bg-white/10"
              }`}>
              {sf.label}
              {sf.key !== "ALL" && (
                <span className="ml-1.5 opacity-60">({orders.filter((o) => o.status === sf.key).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 text-center">
          <ShoppingCart size={40} className="mx-auto text-gray-500 mb-3" />
          <p className="text-ena-light">{searchText || statusFilter !== "ALL" ? "Eşleşen sipariş bulunamadı." : "Henüz sipariş yok."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const items = (() => { try { return JSON.parse(order.itemsJson || "[]"); } catch { return []; } })();
            const isExpanded = expandedId === order.id;
            const itemCount = items.reduce((s: number, i: { quantity?: number }) => s + (i.quantity || 1), 0);
            const productCount = items.length;

            return (
              <div key={order.id} className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        <User size={16} className="text-ena-light" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{order.customerName}</p>
                        <p className="text-xs text-ena-light truncate">{order.customerEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status] || STATUS_COLORS.PENDING}`}>
                        {STATUS_MAP[order.status] || order.status}
                      </span>
                      <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-ena-light transition-colors">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-ena-light">
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.createdAt).toLocaleDateString("tr-TR")}</span>
                    <span>{productCount} ürün, {itemCount} adet</span>
                    <span className="text-white font-semibold">{order.totalAmount.toFixed(2)} TL</span>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                      <div className="text-xs space-y-1.5">
                        {items.map((item: { storeProductId?: string; quantity?: number; unitPrice?: number; name?: string }, i: number) => (
                          <div key={item.storeProductId || i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                            <span className="text-ena-light w-6 text-right">{item.quantity || 1}x</span>
                            <span className="text-white flex-1 truncate">{item.name || `Ürün #${i + 1}`}</span>
                            <span className="text-ena-light">{((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)} TL</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-white/5 space-y-1">
                          <p className="flex items-center gap-1.5 text-ena-light font-medium mb-1"><MapPin size={12} /> Teslimat</p>
                          <p className="text-white">{order.shippingAddress}</p>
                          {(order.city || order.district) && (
                            <p className="text-ena-light">{order.city}{order.city && order.district ? " / " : ""}{order.district} {order.zipCode}</p>
                          )}
                          {order.customerPhone && <p className="text-ena-light">{order.customerPhone}</p>}
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 space-y-1">
                          <p className="flex items-center gap-1.5 text-ena-light font-medium mb-1"><FileText size={12} /> Sipariş No</p>
                          <p className="text-white font-mono text-xs break-all">{order.id}</p>
                          <p className="text-ena-light">{new Date(order.createdAt).toLocaleString("tr-TR")}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 space-y-1">
                          <p className="flex items-center gap-1.5 text-ena-light font-medium mb-1"><CreditCard size={12} /> Tutar</p>
                          <p className="text-white font-bold text-sm">{order.totalAmount.toFixed(2)} TL</p>
                          <p className="text-ena-light">{STATUS_MAP[order.status] || order.status}</p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="p-3 rounded-xl bg-white/5 text-xs space-y-1">
                          <p className="text-ena-light font-medium">Not</p>
                          <p className="text-white">{order.notes}</p>
                        </div>
                      )}

                      <TrackingSection order={order} setOrders={setOrders} setDetailOrder={setDetailOrder} />

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          {order.status === "PENDING" && (
                            <>
                              <button onClick={() => updateStatus(order.id, "CONFIRMED")} disabled={updating === order.id}
                                className="px-3 py-1.5 bg-blue-600/80 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                                {updating === order.id ? "..." : "Onayla"}
                              </button>
                              <button onClick={() => updateStatus(order.id, "CANCELLED")} disabled={updating === order.id}
                                className="px-3 py-1.5 bg-red-600/80 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
                                İptal
                              </button>
                            </>
                          )}
                          {order.status === "CONFIRMED" && (
                            <button onClick={() => updateStatus(order.id, "SHIPPED")} disabled={updating === order.id}
                              className="px-3 py-1.5 bg-purple-600/80 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors disabled:opacity-50">
                              {updating === order.id ? "..." : "Kargoya Ver"}
                            </button>
                          )}
                          {order.status === "SHIPPED" && (
                            <button onClick={() => updateStatus(order.id, "DELIVERED")} disabled={updating === order.id}
                              className="px-3 py-1.5 bg-green-600/80 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50">
                              {updating === order.id ? "..." : "Teslim Edildi"}
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-ena-light">
                          {new Date(order.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrackingSection({
  order, setOrders, setDetailOrder,
}: {
  order: StoreOrder;
  setOrders: React.Dispatch<React.SetStateAction<StoreOrder[]>>;
  setDetailOrder: React.Dispatch<React.SetStateAction<StoreOrder | null>>;
}) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(order.trackingCode || "");
  const [carrier, setCarrier] = useState(order.carrierName || "");
  const [saving, setSaving] = useState(false);

  const hasTracking = order.trackingCode && order.carrierName;

  if (order.status !== "CONFIRMED" && order.status !== "SHIPPED" && !hasTracking) return null;

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/dealer/dropship/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, trackingCode: code, carrierName: carrier }),
    });
    const d = await res.json();
    if (d.success) {
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, trackingCode: code, carrierName: carrier } : o));
      setDetailOrder((prev) => prev?.id === order.id ? { ...prev, trackingCode: code, carrierName: carrier } : prev);
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-2">
      <p className="flex items-center gap-1.5 text-purple-400 font-medium">
        <Truck size={12} /> Kargo Takibi
      </p>
      {editing ? (
        <div className="space-y-2">
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
            className="w-full px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50">
            <option value="">Kargo firması seç</option>
            <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
            <option value="MNG Kargo">MNG Kargo</option>
            <option value="Aras Kargo">Aras Kargo</option>
            <option value="Sürat Kargo">Sürat Kargo</option>
            <option value="PTT Kargo">PTT Kargo</option>
            <option value="Trendyol Express">Trendyol Express</option>
            <option value="Hepsijet">Hepsijet</option>
            <option value="Diğer">Diğer</option>
          </select>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Takip kodu"
            className="w-full px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !code || !carrier}
              className="px-3 py-1.5 bg-purple-600/80 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors disabled:opacity-50">
              {saving ? "..." : "Kaydet"}
            </button>
            <button onClick={() => { setEditing(false); setCode(order.trackingCode || ""); setCarrier(order.carrierName || ""); }}
              className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-colors">
              İptal
            </button>
          </div>
        </div>
      ) : hasTracking ? (
        <div className="flex items-center gap-2">
          <span className="text-white">{order.carrierName}</span>
          <span className="text-purple-300 font-mono">{order.trackingCode}</span>
          <button onClick={() => { setEditing(true); setCode(order.trackingCode); setCarrier(order.carrierName); }}
            className="ml-auto text-purple-400 hover:text-purple-300">
            Düzenle
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          className="text-purple-400 hover:text-purple-300 transition-colors">
          + Kargo bilgisi ekle
        </button>
      )}
    </div>
  );
}

function CustomDomainSection({ store }: { store: DealerStore | null }) {
  const [domain, setDomain] = useState(store?.customDomain || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requestDomain = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/dealer/dropship/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: domain }),
      });
      const d = await res.json();
      if (d.success) { setSuccess("Domain talebin alındı, admin onayı bekleniyor."); window.location.reload(); }
      else setError(d.error || "Hata");
    } catch { setError("Bir hata oluştu"); }
    finally { setSaving(false); }
  };

  const removeDomain = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/dealer/dropship/domain", { method: "DELETE" });
      const d = await res.json();
      if (d.success) { setSuccess("Domain bağlantısı kaldırıldı."); window.location.reload(); }
      else setError(d.error || "Hata");
    } catch { setError("Bir hata oluştu"); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Link size={18} className="text-orange-400" /> Custom Domain
      </h2>

      {store?.customDomainVerified ? (
        <div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-3">
            <CheckCircle size={16} />
            <span>
              <strong>{store.customDomain}</strong> — aktif. CNAME: <code className="text-xs">{store.slug}.enaunity.com.tr</code>
            </span>
          </div>
          <button onClick={removeDomain} disabled={saving}
            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors">
            {saving ? "Kaldırılıyor..." : "Domaini Kaldır"}
          </button>
        </div>
      ) : store?.customDomain && !store?.customDomainVerified ? (
        <div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm mb-3">
            <AlertCircle size={16} />
            <span><strong>{store.customDomain}</strong> — admin onayı bekleniyor.</span>
          </div>
          <button onClick={removeDomain} disabled={saving}
            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors">
            İptal Et
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ena-light">Kendi domain'ini mağazana bağla. CNAME kaydı otomatik oluşturulur.</p>
          <div className="flex items-center gap-2">
            <input type="text" value={domain}
              onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ""))}
              placeholder="ornek.com"
              className="flex-1 px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
            <button onClick={requestDomain} disabled={saving || !domain}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm whitespace-nowrap">
              {saving ? "..." : "Bağla"}
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}
        </div>
      )}
    </div>
  );
}
