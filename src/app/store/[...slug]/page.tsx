"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Store, ShoppingCart, Package, ChevronRight, Search, Plus, Minus, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";

type StoreData = {
  id: string; name: string; slug: string; logo: string; coverImage: string;
  aboutText: string; contactEmail: string; contactPhone: string; themeJson: string;
};

type ProductData = {
  id: string; storeProductId: string; dealerPrice: number;
  name: string; sku: string; image: string; imagesJson: string;
  description: string; category: string; basePrice: number;
};

type Theme = {
  primaryColor?: string; secondaryColor?: string;
  fontFamily?: string; backgroundColor?: string;
};

export default function StorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug || "";
  const subPath = Array.isArray(params.slug) ? params.slug.slice(1).join("/") : "";

  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>({});
  const [viewingProduct, setViewingProduct] = useState<ProductData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { items, addItem, updateQuantity, removeItem, clearCart, total, count, mounted } = useCart(slug);
  const [showCart, setShowCart] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState("");

  const isCheckout = subPath === "checkout";

  useEffect(() => {
    fetch(`/api/public/store?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStore(d.data.store);
          setProducts(d.data.products);
          try { setTheme(JSON.parse(d.data.store.themeJson || "{}")); } catch {}
        } else {
          setStore(null);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#ef4444";
  const bgColor = theme.backgroundColor || "#0f0f1a";
  const fontFamily = theme.fontFamily || "Inter";

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ background: bgColor }} className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div style={{ background: bgColor }} className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Store size={48} className="mx-auto text-gray-500 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Mağaza Bulunamadı</h1>
          <p className="text-gray-400">Bu mağaza mevcut değil veya yayında değil.</p>
        </div>
      </div>
    );
  }

  const handleAddToCart = (p: ProductData) => {
    addItem({ storeProductId: p.storeProductId, name: p.name, image: p.image, price: p.dealerPrice });
    setAddedFeedback(p.name);
    setTimeout(() => setAddedFeedback(""), 2000);
  };

  if (isCheckout) {
    return <CheckoutPage slug={slug} store={store} theme={{ primary, secondary, bgColor, fontFamily }}
      items={items} total={total} clearCart={clearCart} router={router} />;
  }

  if (viewingProduct) {
    const inCart = items.find((i) => i.storeProductId === viewingProduct.storeProductId);
    return (
      <div style={{ background: bgColor, fontFamily }} className="min-h-screen">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setViewingProduct(null)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={16} className="rotate-180" /> Geri
            </button>
            <button onClick={() => setShowCart(!showCart)} className="relative text-gray-400 hover:text-white">
              <ShoppingCart size={20} />
              {count > 0 && (
                <span style={{ background: primary }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <img src={viewingProduct.image || "/placeholder.svg"} alt={viewingProduct.name}
                className="w-full aspect-square object-cover rounded-2xl bg-white/5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{viewingProduct.name}</h1>
              <p className="text-sm text-gray-400 mb-4">SKU: {viewingProduct.sku}</p>
              <p className="text-sm text-gray-300 mb-6">{viewingProduct.description || "Açıklama mevcut değil."}</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span style={{ color: primary }} className="text-3xl font-bold">
                  {viewingProduct.dealerPrice.toFixed(2)} TL
                </span>
                {viewingProduct.basePrice > viewingProduct.dealerPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    {viewingProduct.basePrice.toFixed(2)} TL
                  </span>
                )}
              </div>
              <button onClick={() => handleAddToCart(viewingProduct)}
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-all">
                <ShoppingCart size={18} />
                {inCart ? "Sepete Eklendi (+1)" : "Sepete Ekle"}
              </button>
            </div>
          </div>
        </div>

        <CartDrawer show={showCart} onClose={() => setShowCart(false)} items={items}
          total={total} count={count} updateQuantity={updateQuantity} removeItem={removeItem}
          primary={primary} slug={slug} />
      </div>
    );
  }

  return (
    <div style={{ background: bgColor, fontFamily }} className="min-h-screen">
      {store.coverImage && (
        <div className="h-48 md:h-64 w-full overflow-hidden">
          <img src={store.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            {store.logo && <img src={store.logo} alt={store.name} className="h-16 w-16 rounded-2xl object-cover mb-4" />}
            <h1 className="text-3xl font-bold text-white mb-2">{store.name}</h1>
            {store.aboutText && <p className="text-gray-400 max-w-2xl">{store.aboutText}</p>}
          </div>
          <button onClick={() => setShowCart(!showCart)} className="relative p-2 text-gray-400 hover:text-white">
            <ShoppingCart size={24} />
            {count > 0 && (
              <span style={{ background: primary }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>

        {addedFeedback && (
          <div style={{ background: primary }} className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-white text-sm shadow-lg">
            {addedFeedback} sepete eklendi
          </div>
        )}

        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Ürünlerde ara..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all group">
              <div onClick={() => setViewingProduct(p)} className="aspect-square bg-ena-dark overflow-hidden cursor-pointer">
                <img src={p.image || "/placeholder.svg"} alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-3">
                <p onClick={() => setViewingProduct(p)} className="text-sm font-medium text-white truncate cursor-pointer">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <p style={{ color: primary }} className="text-lg font-bold">{p.dealerPrice.toFixed(2)} TL</p>
                  <button onClick={() => handleAddToCart(p)}
                    style={{ background: primary }}
                    className="p-1.5 rounded-lg text-white hover:opacity-80 transition-opacity">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">{searchQuery ? "Aranan ürün bulunamadı." : "Henüz ürün eklenmemiş."}</p>
          </div>
        )}

        <footer className="mt-16 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          <p>© 2026 {store.name} — ENAUNITY AI Dropship Store</p>
        </footer>
      </div>

      <CartDrawer show={showCart} onClose={() => setShowCart(false)} items={items}
        total={total} count={count} updateQuantity={updateQuantity} removeItem={removeItem}
        primary={primary} slug={slug} />
    </div>
  );
}

function CartDrawer({ show, onClose, items, total, count, updateQuantity, removeItem, primary, slug }: {
  show: boolean; onClose: () => void; items: Array<{ storeProductId: string; name: string; image: string; price: number; quantity: number }>;
  total: number; count: number; updateQuantity: (id: string, q: number) => void; removeItem: (id: string) => void;
  primary: string; slug: string;
}) {
  const router = useRouter();

  return (
    <>
      {show && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#1a1a2e] z-50 transform transition-transform border-l border-white/10 ${show ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Sepet ({count})</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(100vh - 180px)" }}>
          {items.length === 0 && (
            <p className="text-gray-400 text-center py-8">Sepet boş</p>
          )}
          {items.map((item) => (
            <div key={item.storeProductId} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              <img src={item.image || "/placeholder.svg"} alt={item.name}
                className="w-14 h-14 rounded-lg object-cover bg-ena-dark" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.name}</p>
                <p style={{ color: primary }} className="text-sm font-semibold">{item.price.toFixed(2)} TL</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQuantity(item.storeProductId, item.quantity - 1)}
                  className="p-1 rounded hover:bg-white/10 text-gray-400"><Minus size={14} /></button>
                <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.storeProductId, item.quantity + 1)}
                  className="p-1 rounded hover:bg-white/10 text-gray-400"><Plus size={14} /></button>
              </div>
              <button onClick={() => removeItem(item.storeProductId)}
                className="p-1 text-red-400 hover:bg-red-500/20 rounded"><X size={14} /></button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between text-white">
              <span className="font-medium">Toplam</span>
              <span style={{ color: primary }} className="text-xl font-bold">{total.toFixed(2)} TL</span>
            </div>
            <button onClick={() => { onClose(); router.push(`/store/${slug}/checkout`); }}
              style={{ background: `linear-gradient(135deg, ${primary}, ${primary}dd)` }}
              className="w-full py-3 rounded-xl text-white font-medium hover:opacity-90 transition-all">
              Siparişi Tamamla
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function CheckoutPage({ slug, store, theme, items, total, router }: {
  slug: string; store: StoreData;
  theme: { primary: string; secondary: string; bgColor: string; fontFamily: string };
  items: Array<{ storeProductId: string; name: string; image: string; price: number; quantity: number }>;
  total: number; clearCart: () => void; router: ReturnType<typeof useRouter>;
}) {
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", shippingAddress: "", city: "", district: "", zipCode: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderResult, setOrderResult] = useState<{ id: string; totalAmount: number } | null>(null);

  const submitOrder = async () => {
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/public/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          ...form,
          items: items.map((i) => ({ storeProductId: i.storeProductId, quantity: i.quantity })),
        }),
      });
      const d = await res.json();
      if (d.success) {
        setOrderResult(d.data);
        localStorage.removeItem("ena_dropship_cart");
      } else {
        setError(d.error || "Sipariş oluşturulamadı");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderResult) {
    return (
      <div style={{ background: theme.bgColor, fontFamily: theme.fontFamily }} className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sipariş Alındı!</h1>
          <p className="text-gray-400 mb-2">Sipariş numaran: <span className="text-white font-mono">{orderResult.id}</span></p>
          <p className="text-gray-400 mb-6">Toplam: <span style={{ color: theme.primary }} className="font-bold">{orderResult.totalAmount.toFixed(2)} TL</span></p>
          <p className="text-sm text-gray-500 mb-8">Siparişin incelenip onaylandıktan sonra e-posta ile bilgilendirileceksin.</p>
          <button onClick={() => router.push(`/store/${slug}`)}
            style={{ background: theme.primary }}
            className="px-6 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-all">
            Mağazaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: theme.bgColor, fontFamily: theme.fontFamily }} className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto pt-8">
        <button onClick={() => router.push(`/store/${slug}`)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
          <ChevronRight size={16} className="rotate-180" /> Mağazaya Dön
        </button>

        <h1 className="text-2xl font-bold text-white mb-6">Siparişi Tamamla — {store.name}</h1>

        <div className="space-y-4">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Teslimat Bilgileri</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ena-light mb-1">Ad Soyad *</label>
                  <input type="text" value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-xs text-ena-light mb-1">E-posta *</label>
                  <input type="email" value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ena-light mb-1">Telefon</label>
                <input type="tel" value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2" />
              </div>
              <div>
                <label className="block text-xs text-ena-light mb-1">Adres *</label>
                <textarea value={form.shippingAddress}
                  onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-ena-light mb-1">İl</label>
                  <input type="text" value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-xs text-ena-light mb-1">İlçe</label>
                  <input type="text" value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-xs text-ena-light mb-1">Posta Kodu</label>
                  <input type="text" value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ena-light mb-1">Sipariş Notu</label>
                <textarea value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Sipariş Özeti ({items.length} ürün)</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.storeProductId} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">{item.quantity}x</span>
                  <span className="text-white flex-1 truncate">{item.name}</span>
                  <span style={{ color: theme.primary }}>{(item.price * item.quantity).toFixed(2)} TL</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <span className="text-white font-medium">Toplam</span>
              <span style={{ color: theme.primary }} className="text-xl font-bold">{total.toFixed(2)} TL</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <button onClick={submitOrder} disabled={submitting || !form.customerName || !form.customerEmail || !form.shippingAddress || items.length === 0}
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Gönderiliyor..." : `Siparişi Tamamla (${total.toFixed(2)} TL)`}
          </button>
        </div>
      </div>
    </div>
  );
}
