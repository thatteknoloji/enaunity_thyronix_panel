"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Store, ShoppingCart, Package, ChevronRight, Search, Plus, Minus, X, ChevronLeft } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { parseTheme, getButtonRadius } from "@/components/storefront/theme-utils";
import type { StoreTheme } from "@/lib/store-themes/types";
import StorefrontHeader from "@/components/storefront/Header";
import StorefrontBanner from "@/components/storefront/Banner";
import StorefrontFooter from "@/components/storefront/Footer";

type StoreData = {
  id: string; name: string; slug: string; logo: string; coverImage: string;
  aboutText: string; contactEmail: string; contactPhone: string; themeJson: string;
};

type ProductData = {
  id: string; storeProductId: string; dealerPrice: number; stock: number;
  name: string; sku: string; image: string; imagesJson: string;
  description: string; category: string; basePrice: number;
};

type StoreCategoryData = {
  id: string; name: string; catalogCategory: string | null;
  slug: string; sortOrder: number; isActive: boolean;
};

export default function StorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug || "";
  const subPath = Array.isArray(params.slug) ? params.slug.slice(1).join("/") : "";

  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreCategoryData[]>([]);
  const [banners, setBanners] = useState<Array<{ id: string; imageUrl: string; title: string; subtitle: string; ctaText: string; ctaLink: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<StoreTheme | null>(null);
  const [viewingProduct, setViewingProduct] = useState<ProductData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { items, addItem, updateQuantity, removeItem, clearCart, total, count, mounted } = useCart(slug);
  const [showCart, setShowCart] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState("");
  const [galleryIndex, setGalleryIndex] = useState(0);

  const isCheckout = subPath === "checkout";

  useEffect(() => {
    fetch(`/api/public/store?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStore(d.data.store);
          setProducts(d.data.products);
          setStoreCategories(d.data.categories || []);
          setBanners(d.data.banners || []);
          const parsed = parseTheme(d.data.store.themeJson || "{}");
          setTheme(parsed);
          if (parsed.seo?.title) document.title = parsed.seo.title;
        } else {
          setStore(null);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!theme?.seo) return;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", theme.seo.description || store?.name || "");
  }, [theme, store]);

  const categories = useMemo(() => {
    if (storeCategories.length > 0) {
      return storeCategories;
    }
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats).sort().map((name) => ({
      id: name, name, catalogCategory: name, slug: name, sortOrder: 0, isActive: true,
    }));
  }, [storeCategories, products]);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory) return "";
    const cat = storeCategories.find((c) => c.id === selectedCategory);
    return cat ? (cat.catalogCategory || cat.name) : selectedCategory;
  }, [selectedCategory, storeCategories]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const catName = selectedCategoryName;
    const matchesCategory = !catName || p.category === catName;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (p: ProductData) => {
    addItem({ storeProductId: p.storeProductId, name: p.name, image: p.image, price: p.dealerPrice });
    setAddedFeedback(p.name);
    setTimeout(() => setAddedFeedback(""), 2000);
  };

  if (loading) {
    const bg = theme?.colors?.backgroundColor || "#0f0f1a";
    return (
      <div style={{ background: bg }} className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!store || !theme) {
    return (
      <div style={{ background: "#0f0f1a" }} className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Store size={48} className="mx-auto text-gray-500 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Mağaza Bulunamadı</h1>
          <p className="text-gray-400">Bu mağaza mevcut değil veya yayında değil.</p>
        </div>
      </div>
    );
  }

  const c = theme.colors;
  const f = theme.fonts;
  const buttonRadius = getButtonRadius(c.buttonStyle);

  if (isCheckout) {
    return (
      <CheckoutPage
        slug={slug} store={store} theme={theme}
        items={items} total={total} clearCart={clearCart} router={router}
      />
    );
  }

  if (viewingProduct) {
    const inCart = items.find((i) => i.storeProductId === viewingProduct.storeProductId);
    let allImages: string[] = [];
    try { const arr = JSON.parse(viewingProduct.imagesJson || "[]"); allImages = Array.isArray(arr) ? arr.filter(Boolean) : []; }
    catch {}
    const safeImages = allImages.length > 0 ? allImages : [viewingProduct.image || "/placeholder.svg"];
    const currentImage = safeImages[galleryIndex] || safeImages[0];
    return (
      <div style={{ background: c.backgroundColor, fontFamily: f.bodyFont }} className="min-h-screen">
        <StorefrontHeader
          theme={theme} storeName={store.name} storeLogo={store.logo}
          cartCount={count} onCartClick={() => setShowCart(true)}
        />
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setViewingProduct(null)}
              className="flex items-center gap-1 text-sm transition-colors"
              style={{ color: c.textColor, opacity: 0.5 }}>
              <ChevronRight size={16} className="rotate-180" /> Geri
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="relative group">
                <img src={currentImage} alt={viewingProduct.name}
                  className="w-full aspect-square object-cover rounded-2xl" style={{ background: c.cardBg }} />
                {safeImages.length > 1 && (
                  <>
                    <button onClick={() => setGalleryIndex((g) => (g - 1 + safeImages.length) % safeImages.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                      <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => setGalleryIndex((g) => (g + 1) % safeImages.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
              {safeImages.length > 1 && (
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                  {safeImages.map((img, i) => (
                    <button key={i} onClick={() => setGalleryIndex(i)}
                      className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        i === galleryIndex ? "border-white/60" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      style={{ background: c.cardBg }}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: f.headingFont, color: c.textColor }}>
                {viewingProduct.name}
              </h1>
              <p className="text-sm mb-4" style={{ color: c.textColor, opacity: 0.6 }}>SKU: {viewingProduct.sku}</p>
              {viewingProduct.category && (
                <span className="inline-block text-xs px-2 py-1 rounded-full mb-4" style={{ background: c.primaryColor + "20", color: c.primaryColor }}>
                  {viewingProduct.category}
                </span>
              )}
              <p className="text-sm mb-6" style={{ color: c.textColor, opacity: 0.7 }}>
                {viewingProduct.description || "Açıklama mevcut değil."}
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span style={{ color: c.primaryColor }} className="text-3xl font-bold">
                  {viewingProduct.dealerPrice.toFixed(2)} TL
                </span>
                {viewingProduct.basePrice > viewingProduct.dealerPrice && (
                  <span className="text-sm line-through" style={{ color: c.textColor, opacity: 0.4 }}>
                    {viewingProduct.basePrice.toFixed(2)} TL
                  </span>
                )}
              </div>
              {viewingProduct.stock > 0 && viewingProduct.stock <= 10 && (
                <p className="text-sm mb-4" style={{ color: c.primaryColor }}>
                  Son {viewingProduct.stock} adet kaldı!
                </p>
              )}
              {viewingProduct.stock <= 0 ? (
                <p className="text-sm mb-4 text-red-400">Bu ürün tükendi.</p>
              ) : (
                <p className="text-xs mb-4" style={{ color: c.textColor, opacity: 0.4 }}>
                  Stok: {viewingProduct.stock} adet
                </p>
              )}
              <button onClick={() => handleAddToCart(viewingProduct)}
                disabled={viewingProduct.stock <= 0}
                style={{ background: viewingProduct.stock <= 0 ? "#555" : c.primaryColor, borderRadius: buttonRadius }}
                className="flex items-center gap-2 px-6 py-3 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <ShoppingCart size={18} />
                {viewingProduct.stock <= 0 ? "Stokta Yok" : inCart ? "Sepete Eklendi (+1)" : "Sepete Ekle"}
              </button>
            </div>
          </div>
        </div>
        <CartDrawer show={showCart} onClose={() => setShowCart(false)} items={items}
          total={total} count={count} updateQuantity={updateQuantity} removeItem={removeItem}
          primary={c.primaryColor} buttonRadius={buttonRadius} slug={slug} theme={theme} />
        <StorefrontFooter theme={theme} storeName={store.name} />
      </div>
    );
  }

  const bg = c.backgroundColor;

  return (
    <div style={{ background: bg, fontFamily: f.bodyFont }} className="min-h-screen">
      <StorefrontHeader
        theme={theme} storeName={store.name} storeLogo={store.logo}
        cartCount={count} onCartClick={() => setShowCart(true)}
      />

      {store.coverImage && !theme.banner.imageUrl && (
        <div className="h-48 md:h-56 w-full overflow-hidden">
          <img src={store.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <StorefrontBanner theme={theme} banners={banners} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            {store.logo && <img src={store.logo} alt={store.name} className="h-16 w-16 rounded-2xl object-cover mb-4" />}
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: f.headingFont, color: c.textColor }}>{store.name}</h1>
            {store.aboutText && <p className="max-w-2xl" style={{ color: c.textColor, opacity: 0.6 }}>{store.aboutText}</p>}
          </div>
        </div>

        {addedFeedback && (
          <div style={{ background: c.primaryColor }} className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-white text-sm shadow-lg">
            {addedFeedback} sepete eklendi
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex-1 relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textColor, opacity: 0.4 }} />
            <input type="text" placeholder="Ürünlerde ara..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl placeholder:text-sm focus:outline-none focus:ring-2 text-sm"
              style={{ background: c.cardBg, borderColor: c.textColor + "15", color: c.textColor }} />
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("")}
              style={{
                background: !selectedCategory ? c.primaryColor : "transparent",
                color: !selectedCategory ? "#fff" : c.textColor,
                borderColor: c.textColor + "20",
                borderRadius: buttonRadius,
              }}
              className="shrink-0 px-3 py-1.5 text-xs font-medium border transition-all hover:opacity-80"
            >
              Tümü
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? "" : cat.id)}
                style={{
                  background: selectedCategory === cat.id ? c.primaryColor : "transparent",
                  color: selectedCategory === cat.id ? "#fff" : c.textColor,
                  borderColor: c.textColor + "20",
                  borderRadius: buttonRadius,
                }}
                className="shrink-0 px-3 py-1.5 text-xs font-medium border whitespace-nowrap transition-all hover:opacity-80"
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => (
            <div key={p.id}
              style={{ background: c.cardBg, borderColor: c.textColor + "15" }}
              className="rounded-2xl border overflow-hidden hover:opacity-90 transition-all group">
              <div onClick={() => setViewingProduct(p)} className="aspect-square overflow-hidden cursor-pointer"
                style={{ background: c.backgroundColor }}>
                <img src={p.image || "/placeholder.svg"} alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-3">
                <p onClick={() => setViewingProduct(p)} className="text-sm font-medium truncate cursor-pointer"
                  style={{ color: c.textColor }}>{p.name}</p>
                <p className="text-xs mt-0.5" style={{ color: c.textColor, opacity: 0.5 }}>{p.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <p style={{ color: c.primaryColor }} className="text-lg font-bold">{p.dealerPrice.toFixed(2)} TL</p>
                  <div className="flex items-center gap-2">
                    {p.stock > 0 && p.stock <= 10 && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${c.primaryColor}20`, color: c.primaryColor }}>
                        {p.stock} adet
                      </span>
                    )}
                    {p.stock <= 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Tükendi</span>
                    )}
                    <button onClick={() => handleAddToCart(p)}
                      disabled={p.stock <= 0}
                      style={{ background: p.stock <= 0 ? "#555" : c.primaryColor, borderRadius: buttonRadius }}
                      className="p-1.5 text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto mb-4" style={{ color: c.textColor, opacity: 0.3 }} />
            <p style={{ color: c.textColor, opacity: 0.5 }}>
              {searchQuery || selectedCategory ? "Aranan ürün bulunamadı." : "Henüz ürün eklenmemiş."}
            </p>
          </div>
        )}
      </div>

      <StorefrontFooter theme={theme} storeName={store.name} />

      <CartDrawer show={showCart} onClose={() => setShowCart(false)} items={items}
        total={total} count={count} updateQuantity={updateQuantity} removeItem={removeItem}
        primary={c.primaryColor} buttonRadius={buttonRadius} slug={slug} theme={theme} />
    </div>
  );
}

function CartDrawer({ show, onClose, items, total, count, updateQuantity, removeItem, primary, buttonRadius, slug, theme }: {
  show: boolean; onClose: () => void;
  items: Array<{ storeProductId: string; name: string; image: string; price: number; quantity: number }>;
  total: number; count: number; updateQuantity: (id: string, q: number) => void;
  removeItem: (id: string) => void; primary: string; buttonRadius: string; slug: string;
  theme: StoreTheme;
}) {
  const router = useRouter();
  const c = theme.colors;

  return (
    <>
      {show && <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md z-50 transform transition-transform border-l ${show ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: c.cardBg, borderColor: c.textColor + "15" }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: c.textColor + "15" }}>
          <h2 className="text-lg font-semibold" style={{ color: c.textColor }}>Sepet ({count})</h2>
          <button onClick={onClose} style={{ color: c.textColor, opacity: 0.5 }}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(100vh - 180px)" }}>
          {items.length === 0 && (
            <p className="text-center py-8" style={{ color: c.textColor, opacity: 0.5 }}>Sepet boş</p>
          )}
          {items.map((item) => (
            <div key={item.storeProductId} className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: c.backgroundColor + "80" }}>
              <img src={item.image || "/placeholder.svg"} alt={item.name}
                className="w-14 h-14 rounded-lg object-cover" style={{ background: c.backgroundColor }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: c.textColor }}>{item.name}</p>
                <p style={{ color: primary }} className="text-sm font-semibold">{item.price.toFixed(2)} TL</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQuantity(item.storeProductId, item.quantity - 1)}
                  className="p-1 rounded hover:opacity-70" style={{ color: c.textColor, opacity: 0.5 }}><Minus size={14} /></button>
                <span className="text-sm w-6 text-center" style={{ color: c.textColor }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.storeProductId, item.quantity + 1)}
                  className="p-1 rounded hover:opacity-70" style={{ color: c.textColor, opacity: 0.5 }}><Plus size={14} /></button>
              </div>
              <button onClick={() => removeItem(item.storeProductId)}
                className="p-1 text-red-400 hover:bg-red-500/20 rounded"><X size={14} /></button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-3" style={{ borderColor: c.textColor + "15" }}>
            <div className="flex items-center justify-between" style={{ color: c.textColor }}>
              <span className="font-medium">Toplam</span>
              <span style={{ color: primary }} className="text-xl font-bold">{total.toFixed(2)} TL</span>
            </div>
            <button onClick={() => { onClose(); router.push(`/store/${slug}/checkout`); }}
              style={{ background: primary, borderRadius: buttonRadius }}
              className="w-full py-3 rounded-xl text-white font-medium hover:opacity-90 transition-all">
              Siparişi Tamamla
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function CheckoutPage({ slug, store, theme, items, total, clearCart, router }: {
  slug: string; store: StoreData; theme: StoreTheme;
  items: Array<{ storeProductId: string; name: string; image: string; price: number; quantity: number }>;
  total: number; clearCart: () => void; router: ReturnType<typeof useRouter>;
}) {
  const c = theme.colors;
  const f = theme.fonts;
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
      <div style={{ background: c.backgroundColor, fontFamily: f.bodyFont }} className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: f.headingFont, color: c.textColor }}>Sipariş Alındı!</h1>
          <p className="mb-2" style={{ color: c.textColor, opacity: 0.6 }}>Sipariş numaran: <span className="text-white font-mono">{orderResult.id}</span></p>
          <p className="mb-6" style={{ color: c.textColor, opacity: 0.6 }}>Toplam: <span style={{ color: c.primaryColor }} className="font-bold">{orderResult.totalAmount.toFixed(2)} TL</span></p>
          <p className="text-sm mb-4" style={{ color: c.textColor, opacity: 0.5 }}>Siparişin incelenip onaylandıktan sonra e-posta ile bilgilendirileceksin.</p>
          <p className="text-xs mb-6" style={{ color: c.textColor, opacity: 0.4 }}>
            Siparişini <a href="/siparis-takip" className="underline" style={{ color: c.primaryColor }}>buradan</a> takip edebilirsin.
          </p>
          <button onClick={() => router.push(`/store/${slug}`)}
            style={{ background: c.primaryColor }}
            className="px-6 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-all">
            Mağazaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: c.backgroundColor, fontFamily: f.bodyFont }} className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto pt-8">
        <button onClick={() => router.push(`/store/${slug}`)}
          className="flex items-center gap-1 text-sm mb-6 transition-colors"
          style={{ color: c.textColor, opacity: 0.5 }}>
          <ChevronRight size={16} className="rotate-180" /> Mağazaya Dön
        </button>

        <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: f.headingFont, color: c.textColor }}>
          Siparişi Tamamla — {store.name}
        </h1>

        <div className="space-y-4">
          <div className="rounded-2xl border p-4" style={{ background: c.cardBg, borderColor: c.textColor + "15" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: c.textColor }}>Teslimat Bilgileri</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: c.textColor, opacity: 0.6 }}>Ad Soyad *</label>
                  <input type="text" value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ background: c.backgroundColor, borderColor: c.textColor + "15", color: c.textColor }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: c.textColor, opacity: 0.6 }}>E-posta *</label>
                  <input type="email" value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ background: c.backgroundColor, borderColor: c.textColor + "15", color: c.textColor }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: c.textColor, opacity: 0.6 }}>Telefon</label>
                <input type="tel" value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ background: c.backgroundColor, borderColor: c.textColor + "15", color: c.textColor }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: c.textColor, opacity: 0.6 }}>Adres *</label>
                <textarea value={form.shippingAddress}
                  onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{ background: c.backgroundColor, borderColor: c.textColor + "15", color: c.textColor }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: c.textColor, opacity: 0.6 }}>İl</label>
                  <input type="text" value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ background: c.backgroundColor, borderColor: c.textColor + "15", color: c.textColor }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: c.textColor, opacity: 0.6 }}>İlçe</label>
                  <input type="text" value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ background: c.backgroundColor, borderColor: c.textColor + "15", color: c.textColor }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: c.textColor, opacity: 0.6 }}>Posta Kodu</label>
                  <input type="text" value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ background: c.backgroundColor, borderColor: c.textColor + "15", color: c.textColor }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: c.textColor, opacity: 0.6 }}>Sipariş Notu</label>
                <textarea value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{ background: c.backgroundColor, borderColor: c.textColor + "15", color: c.textColor }} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ background: c.cardBg, borderColor: c.textColor + "15" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: c.textColor }}>Sipariş Özeti ({items.length} ürün)</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.storeProductId} className="flex items-center gap-2 text-sm">
                  <span style={{ color: c.textColor, opacity: 0.5 }}>{item.quantity}x</span>
                  <span className="flex-1 truncate" style={{ color: c.textColor }}>{item.name}</span>
                  <span style={{ color: c.primaryColor }}>{(item.price * item.quantity).toFixed(2)} TL</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: c.textColor + "15" }}>
              <span className="font-medium" style={{ color: c.textColor }}>Toplam</span>
              <span style={{ color: c.primaryColor }} className="text-xl font-bold">{total.toFixed(2)} TL</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <button onClick={submitOrder} disabled={submitting || !form.customerName || !form.customerEmail || !form.shippingAddress || items.length === 0}
            style={{ background: c.primaryColor }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Gönderiliyor..." : `Siparişi Tamamla (${total.toFixed(2)} TL)`}
          </button>
        </div>
      </div>
    </div>
  );
}
