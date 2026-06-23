"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store, Globe, ShoppingCart, Package, Settings, ExternalLink,
  CheckCircle, AlertCircle, Loader2, Eye, EyeOff, ArrowRight
} from "lucide-react";

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
  products: Array<{
    id: string;
    productCatalogItemId: string;
    dealerPrice: number;
    isActive: boolean;
  }>;
};

export default function DealerDropshipPage() {
  const router = useRouter();
  const [store, setStore] = useState<DealerStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"setup" | "overview">("setup");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    aboutText: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dealer/dropship/store")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setStore(d.data);
          setForm({
            name: d.data.name,
            slug: d.data.slug,
            aboutText: d.data.aboutText,
            contactEmail: d.data.contactEmail,
            contactPhone: d.data.contactPhone,
          });
          setStep("overview");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const createStore = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dealer/dropship/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        setStore(d.data);
        setStep("overview");
      } else {
        setError(d.error || "Bir hata oluştu");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const updateStore = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dealer/dropship/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        setStore(d.data);
      } else {
        setError(d.error || "Bir hata oluştu");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
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
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Korhan'ın Dünyası"
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">
                Alt Domain
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.slug}
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
                rows={3}
                placeholder="Mağazan hakkında kısa bir açıklama..."
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">E-posta</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="ornek@email.com"
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">Telefon</label>
                <input
                  type="tel"
                  value={form.contactPhone}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-ena-dark via-[#1a1a2e] to-ena-dark p-6">
      <div className="max-w-4xl mx-auto pt-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Store size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{store?.name}</h1>
              <p className="text-sm text-ena-light">{store?.slug}.enaunity.com.tr</p>
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

        <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Mağaza Ayarları</h2>
          <div>
            <label className="block text-sm font-medium text-ena-light mb-1">Mağaza Adı</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ena-light mb-1">Alt Domain</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className="flex-1 px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              />
              <span className="text-ena-light text-sm">.enaunity.com.tr</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ena-light mb-1">Hakkımızda</label>
            <textarea
              value={form.aboutText}
              onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">E-posta</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Telefon</label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={updateStore}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {store?.status === "DRAFT" && (
              <button
                onClick={async () => {
                  await fetch("/api/dealer/dropship/store", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "ACTIVE" }),
                  });
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600/80 text-white rounded-xl font-medium hover:bg-green-600 transition-all text-sm"
              >
                <Eye size={16} />
                Yayına Al
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={`https://${store?.slug}.enaunity.com.tr`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-orange-400" />
              <div>
                <p className="text-sm font-medium text-white">Mağazayı Görüntüle</p>
                <p className="text-xs text-ena-light">{store?.slug}.enaunity.com.tr</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-ena-light group-hover:text-white transition-colors" />
          </a>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <Package size={20} className="text-orange-400" />
              <div>
                <p className="text-sm font-medium text-white">Ürün Ekle</p>
                <p className="text-xs text-ena-light">Hazır Ürün Deposu'ndan seç</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-ena-light group-hover:text-white transition-colors" />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <ShoppingCart size={20} className="text-orange-400" />
              <div>
                <p className="text-sm font-medium text-white">Siparişler</p>
                <p className="text-xs text-ena-light">Gelen siparişleri yönet</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-ena-light group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}
