"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, ArrowLeft, Tag, Layout } from "lucide-react";
import toast from "react-hot-toast";
import { MediaSpecGuide } from "@/components/admin/homepage/MediaSpecGuide";
import { MediaUploadField } from "@/components/admin/homepage/MediaUploadField";
import { MEDIA_SPECS } from "@/lib/homepage/media-specs";
import { describeCampaignBannerLink, resolveCampaignBannerLink } from "@/lib/campaigns/banner-link";

const CAMPAIGN_TYPES = [
  { key: "quantity_discount", label: "Çoklu Alım İndirimi", desc: "X adet ürüne % veya ₺ indirim" },
  { key: "bogo", label: "Alana Bedava / İndirimli", desc: "X ürünü alana Y ürünü bedava/indirimli" },
  { key: "bundle", label: "Paket / Bundle", desc: "Seçili ürünler tek fiyata" },
  { key: "free_shipping", label: "Kargo Bedava", desc: "X ₺ üzerine kargo bedava" },
  { key: "category_discount", label: "Kategori İndirimi", desc: "Tüm X kategorisinde indirim" },
  { key: "first_order", label: "İlk Sipariş İndirimi", desc: "İlk siparişe özel" },
  { key: "loyalty", label: "Sadakat İndirimi", desc: "X sipariş sonrası indirim" },
];

const TARGET_OPTIONS = [
  { key: "all", label: "Tüm Herkes" },
  { key: "dealerGroups", label: "Bayi Grupları" },
  { key: "dealers", label: "Bayiler" },
  { key: "users", label: "Kullanıcılar" },
];

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [dealerGroups, setDealerGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bannerSlots, setBannerSlots] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", type: "quantity_discount", discountType: "percentage",
    discountValue: "10", minAmount: "0", maxDiscount: "0", minQuantity: "2",
    bundlePrice: "0", startsAt: "", endsAt: "", active: true,
    targetType: "all", targetIds: "[]", categoryScope: "[]",
    orderCountMin: "0", freeShipping: false, badge: "", badgeColor: "#e50914",
    buyProducts: [] as string[], getProducts: [] as string[],
    showOnHomepage: false, bannerSlotKey: "after_hero",
    bannerImageDesktop: "", bannerImageTablet: "", bannerImageMobile: "", bannerLinkUrl: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/campaigns").then(r => r.json()),
      fetch("/api/products?all=true").then(r => r.json()),
      fetch("/api/admin/dealers").then(r => r.json()),
      fetch("/api/admin/dealer-groups").then(r => r.json()),
      fetch("/api/admin/users").then(r => r.json()).then(d => {
        if (d.success) d.data = d.data.filter((u: any) => u.role === "dealer");
        return d;
      }),
      fetch("/api/admin/homepage").then(r => r.json()),
    ]).then(([c, p, d, g, u, home]) => {
      if (c.success) setCampaigns(c.data);
      if (p.success) setProducts(p.data);
      if (d.success) setDealers(d.data);
      if (g.success) setDealerGroups(g.data);
      if (u.success) setUsers(u.data);
      if (home.success && home.data?.slots) {
        setBannerSlots(home.data.slots.map((s: { key: string; label: string }) => ({ key: s.key, label: s.label })));
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Kampanya adı gerekli");
    if (form.showOnHomepage && !form.bannerImageDesktop) {
      return toast.error("Ana sayfa banner için masaüstü görseli gerekli");
    }
    setSaving(true);
    const body = {
      ...form,
      discountValue: parseFloat(form.discountValue) || 0,
      minAmount: parseFloat(form.minAmount) || 0,
      maxDiscount: parseFloat(form.maxDiscount) || 0,
      minQuantity: parseInt(form.minQuantity) || 0,
      bundlePrice: parseFloat(form.bundlePrice) || 0,
      orderCountMin: parseInt(form.orderCountMin) || 0,
    };
    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/admin/campaigns/${editingId}` : "/api/admin/campaigns";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast.success(editingId ? "Güncellendi" : "Oluşturuldu"); fetchCampaigns(); resetForm(); }
    else toast.error("Hata");
    setSaving(false);
  };

  const fetchCampaigns = () => {
    fetch("/api/admin/campaigns").then(r => r.json()).then(d => { if (d.success) setCampaigns(d.data); });
  };

  const resetForm = () => {
    setForm({ name: "", description: "", type: "quantity_discount", discountType: "percentage", discountValue: "10", minAmount: "0", maxDiscount: "0", minQuantity: "2", bundlePrice: "0", startsAt: "", endsAt: "", active: true, targetType: "all", targetIds: "[]", categoryScope: "[]", orderCountMin: "0", freeShipping: false, badge: "", badgeColor: "#e50914", buyProducts: [], getProducts: [], showOnHomepage: false, bannerSlotKey: "after_hero", bannerImageDesktop: "", bannerImageTablet: "", bannerImageMobile: "", bannerLinkUrl: "" });
    setEditingId(null); setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
    fetchCampaigns();
  };

  const toggleProduct = (type: "buy" | "get", productId: string) => {
    const key = type === "buy" ? "buyProducts" : "getProducts";
    setForm(prev => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(productId) ? arr.filter(id => id !== productId) : [...arr, productId] };
    });
  };

  const toggleTargetId = (id: string) => {
    setForm(prev => {
      let ids: string[] = [];
      try { ids = JSON.parse(prev.targetIds); } catch {}
      const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
      return { ...prev, targetIds: JSON.stringify(next) };
    });
  };

  const toggleCategoryScope = (cat: string) => {
    setForm(prev => {
      let cats: string[] = [];
      try { cats = JSON.parse(prev.categoryScope); } catch {}
      const next = cats.includes(cat) ? cats.filter(x => x !== cat) : [...cats, cat];
      return { ...prev, categoryScope: JSON.stringify(next) };
    });
  };

  const editCampaign = (c: any) => {
    setForm({
      name: c.name, description: c.description, type: c.type,
      discountType: c.discountType, discountValue: String(c.discountValue),
      minAmount: String(c.minAmount), maxDiscount: String(c.maxDiscount),
      minQuantity: String(c.minQuantity), bundlePrice: String(c.bundlePrice),
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : "",
      endsAt: c.endsAt ? c.endsAt.slice(0, 16) : "",
      active: c.active, targetType: c.targetType || "all",
      targetIds: c.targetIds || "[]", categoryScope: c.categoryScope || "[]",
      orderCountMin: String(c.orderCountMin), freeShipping: c.freeShipping,
      badge: c.badge, badgeColor: c.badgeColor || "#e50914",
      buyProducts: (c.products || []).filter((p: any) => p.type === "buy").map((p: any) => p.productId),
      getProducts: (c.products || []).filter((p: any) => p.type === "get").map((p: any) => p.productId),
      showOnHomepage: c.showOnHomepage ?? false,
      bannerSlotKey: c.bannerSlotKey || "after_hero",
      bannerImageDesktop: c.bannerImageDesktop || "",
      bannerImageTablet: c.bannerImageTablet || "",
      bannerImageMobile: c.bannerImageMobile || "",
      bannerLinkUrl: c.bannerLinkUrl || "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const categories = [...new Set(products.map(p => p.category))];

  const bannerLinkPreview = form.showOnHomepage
    ? resolveCampaignBannerLink({
        id: editingId || "yeni",
        type: form.type,
        categoryScope: form.categoryScope,
        bannerLinkUrl: form.bannerLinkUrl,
        products: [
          ...form.buyProducts.map((productId) => ({ productId, type: "buy" })),
          ...form.getProducts.map((productId) => ({ productId, type: "get" })),
        ],
      })
    : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900">Kampanyalar</h1><p className="mt-1 text-sm text-gray-500">Detaylı kampanya ve promosyon yönetimi</p></div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} className="mr-1" /> Yeni Kampanya</Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Kampanya Düzenle" : "Yeni Kampanya"}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kampanya Adı *</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tür</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{CAMPAIGN_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Rozet (ürün kartında)</label><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="örn: %50 İNDİRİM" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">İndirim Tipi</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}><option value="percentage">Yüzde (%)</option><option value="fixed">Sabit (₺)</option></select></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">İndirim Değeri</label><input type="number" step="1" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Min Sepet Tutarı</label><input type="number" step="1" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.minAmount} onChange={e => setForm({ ...form, minAmount: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Max İndirim (0=sınırsız)</label><input type="number" step="1" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })} /></div>
          </div>

          {(form.type === "quantity_discount" || form.type === "bogo") && (
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Min Adet</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none max-w-[200px]" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: e.target.value })} /></div>
          )}
          {form.type === "bundle" && (
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Paket Fiyatı (₺)</label><input type="number" step="1" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none max-w-[200px]" value={form.bundlePrice} onChange={e => setForm({ ...form, bundlePrice: e.target.value })} /></div>
          )}
          {form.type === "free_shipping" && (
            <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.freeShipping} onChange={e => setForm({ ...form, freeShipping: e.target.checked })} /> Kargo Bedava Aktif</label></div>
          )}
          {form.type === "category_discount" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Hedef Kategoriler</label>
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-lg p-2">
                {categories.map(cat => {
                  let cats: string[] = []; try { cats = JSON.parse(form.categoryScope); } catch {}
                  return <label key={cat} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${cats.includes(cat) ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={cats.includes(cat)} onChange={() => toggleCategoryScope(cat)} className="w-3.5 h-3.5" /> {cat}
                  </label>;
                })}
                {categories.length === 0 && <p className="text-xs text-gray-400 p-2">Kategori bulunamadı</p>}
              </div>
            </div>
          )}
          {form.type === "loyalty" && (
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Min Sipariş Sayısı</label><input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none max-w-[200px]" value={form.orderCountMin} onChange={e => setForm({ ...form, orderCountMin: e.target.value })} /></div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Başlangıç</label><input type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Bitiş</label><input type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} /></div>
          </div>

          {/* Hedef Kitle */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Hedef Kitle</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {TARGET_OPTIONS.map(t => (
                <button key={t.key} onClick={() => setForm({ ...form, targetType: t.key, targetIds: t.key === "all" ? "[]" : form.targetIds })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.targetType === t.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {form.targetType === "dealerGroups" && (
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-lg p-2">
                {dealerGroups.map((g: any) => {
                  let ids: string[] = []; try { ids = JSON.parse(form.targetIds); } catch {}
                  return <label key={g.id || g.name} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${ids.includes(g.name) ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={ids.includes(g.name)} onChange={() => toggleTargetId(g.name)} className="w-3.5 h-3.5" /> {g.name}
                  </label>;
                })}
              </div>
            )}

            {form.targetType === "dealers" && (
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-lg p-2">
                {dealers.map((d: any) => {
                  let ids: string[] = []; try { ids = JSON.parse(form.targetIds); } catch {}
                  return <label key={d.id} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${ids.includes(d.id) ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={ids.includes(d.id)} onChange={() => toggleTargetId(d.id)} className="w-3.5 h-3.5" /> {d.name} ({d.company})
                  </label>;
                })}
              </div>
            )}

            {form.targetType === "users" && (
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-lg p-2">
                {users.map((u: any) => {
                  let ids: string[] = []; try { ids = JSON.parse(form.targetIds); } catch {}
                  return <label key={u.id} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${ids.includes(u.id) ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={ids.includes(u.id)} onChange={() => toggleTargetId(u.id)} className="w-3.5 h-3.5" /> {u.name} ({u.email})
                  </label>;
                })}
              </div>
            )}
          </div>

          {/* Ürün seçimi */}
          {(form.type === "bogo" || form.type === "bundle" || form.type === "quantity_discount") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Alınacak Ürünler ({form.buyProducts.length})</label>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">{products.map(p => (
                  <label key={p.id} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${form.buyProducts.includes(p.id) ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={form.buyProducts.includes(p.id)} onChange={() => toggleProduct("buy", p.id)} className="w-3.5 h-3.5" /> {p.name} <span className="text-gray-400 ml-auto">{p.category}</span>
                  </label>
                ))}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Kampanyalı Ürünler ({form.getProducts.length})</label>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">{products.map(p => (
                  <label key={p.id} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${form.getProducts.includes(p.id) ? "bg-green-50 text-green-700" : "hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={form.getProducts.includes(p.id)} onChange={() => toggleProduct("get", p.id)} className="w-3.5 h-3.5" /> {p.name} <span className="text-gray-400 ml-auto">{p.category}</span>
                  </label>
                ))}</div>
              </div>
            </div>
          )}

          {/* Ana sayfa banner */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Layout size={16} className="text-purple-700" />
              <h3 className="font-semibold text-purple-950">Ana Sayfa Banner</h3>
            </div>
            <MediaSpecGuide variant="banner" />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.showOnHomepage}
                onChange={e => setForm({ ...form, showOnHomepage: e.target.checked })}
              />
              Bu kampanyayı ana sayfada banner olarak göster
            </label>
            {form.showOnHomepage && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Banner konumu</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                    value={form.bannerSlotKey}
                    onChange={e => setForm({ ...form, bannerSlotKey: e.target.value })}
                  >
                    {bannerSlots.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                    {bannerSlots.length === 0 && <option value="after_hero">Hero Altı</option>}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Kampanya tarihleri banner zamanlamasına otomatik yansır.</p>
                </div>
                <MediaUploadField
                  label="Masaüstü banner *"
                  value={form.bannerImageDesktop}
                  onChange={v => setForm({ ...form, bannerImageDesktop: v })}
                  maxBytes={(MEDIA_SPECS.banner.desktop.maxKb ?? 400) * 1024}
                />
                <MediaUploadField
                  label="Tablet banner"
                  value={form.bannerImageTablet}
                  onChange={v => setForm({ ...form, bannerImageTablet: v })}
                  maxBytes={(MEDIA_SPECS.banner.tablet.maxKb ?? 280) * 1024}
                />
                <MediaUploadField
                  label="Mobil banner"
                  value={form.bannerImageMobile}
                  onChange={v => setForm({ ...form, bannerImageMobile: v })}
                  maxBytes={(MEDIA_SPECS.banner.mobile.maxKb ?? 200) * 1024}
                />
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                  placeholder="Banner tıklama linki (boş = otomatik)"
                  value={form.bannerLinkUrl}
                  onChange={e => setForm({ ...form, bannerLinkUrl: e.target.value })}
                />
                {bannerLinkPreview && (
                  <div className="rounded-lg border border-purple-200 bg-white/80 p-3 text-xs space-y-1">
                    <p className="font-semibold text-purple-900">Otomatik banner linki</p>
                    <p className="text-purple-800 font-mono break-all">{bannerLinkPreview}</p>
                    <p className="text-gray-500">
                      {describeCampaignBannerLink({
                        id: editingId || "yeni",
                        type: form.type,
                        categoryScope: form.categoryScope,
                        bannerLinkUrl: form.bannerLinkUrl,
                        products: [
                          ...form.buyProducts.map((productId) => ({ productId, type: "buy" })),
                          ...form.getProducts.map((productId) => ({ productId, type: "get" })),
                        ],
                      })}
                      {form.bannerLinkUrl.trim() ? " — özel link girildiği için otomatik devre dışı." : ""}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1" /> {saving ? "Kaydediliyor..." : "Kaydet"}</Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>İptal</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-center py-12">Yükleniyor...</p> : campaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white"><Tag size={40} className="mx-auto text-gray-300" /><p className="mt-3 text-gray-500">Henüz kampanya yok</p></div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kampanya</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tür</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">İndirim</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Banner</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Süre</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">İşlem</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{c.name}</p>{c.badge && <span className="text-[10px] text-ena-primary bg-ena-primary/5 px-1.5 py-0.5 rounded">{c.badge}</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{CAMPAIGN_TYPES.find(t => t.key === c.type)?.label || c.type}</td>
                    <td className="px-4 py-3 text-xs font-medium text-emerald-600">{c.discountType === "percentage" ? `%${c.discountValue}` : `${c.discountValue} ₺`}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.showOnHomepage && c.bannerImageDesktop ? (
                        <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">Ana sayfa</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.endsAt ? new Date(c.endsAt).toLocaleDateString("tr-TR") : "Süresiz"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{c.active ? "Aktif" : "Pasif"}</span></td>
                    <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => editCampaign(c)}>Düzenle</Button><Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="text-ena-primary"><Trash2 size={14} /></Button></div></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
