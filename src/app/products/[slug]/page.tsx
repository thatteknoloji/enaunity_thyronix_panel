"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import type { Product } from "@/types";
import { Play, ChevronLeft, ChevronRight, Building2, Package, Truck, Minus, Plus, Star, Clock, Heart, Download } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import { VariantSelector } from "@/components/products/VariantSelector";
import { ProductTrustBadges } from "@/components/products/ProductTrustBadges";
import { ProductStockStatus } from "@/components/products/ProductStockStatus";
import { normalizeVariantDisplayMode } from "@/lib/products/variant-display";
import { resolveProductStockStatus } from "@/lib/products/stock-status";
import type { ResolvedProductPresentation } from "@/lib/products/presentation";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product & { effectivePrice?: number; dealerDiscount?: number; isDealer?: boolean; minOrderQuantity?: number; tieredPrices?: { id: string; minQuantity: number; price: number }[]; presentation?: ResolvedProductPresentation } | null>(null);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"desc" | "details" | "reviews">("desc");
  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState<{ average: number; count: number; reviews: Array<{ id: string; rating: number; comment: string; createdAt: string; user: { name: string } }> }>({ average: 0, count: 0, reviews: [] });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [productCampaigns, setProductCampaigns] = useState<any[]>([]);
  const [productBundles, setProductBundles] = useState<any[]>([]);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [isDealerUser, setIsDealerUser] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.data?.role === "dealer") {
        setIsDealerUser(true);
      }
    });
  }, []);

  const toggleFavorite = async () => {
    if (!product) return;
    setFavLoading(true);
    try {
      const res = await fetch(`/api/dealer/wishlist/${product.id}`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        setIsFavorite(d.action === "added");
        toast.success(d.action === "added" ? "Favorilere eklendi" : "Favorilerden çıkarıldı");
      }
    } catch { toast.error("Hata oluştu"); }
    finally { setFavLoading(false); }
  };

  useEffect(() => {
    if (!slug) { setPageError("Geçersiz ürün linki"); setLoading(false); return; }
    let productId = "";
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { setPageError(d.error || "Ürün bulunamadı"); setLoading(false); return; }
        productId = d.data.id;
        setProduct(d.data);
        setLoading(false);
        fetch(`/api/reviews?productId=${productId}`)
          .then(r => r.json()).then(d2 => { if (d2.success) setReviews(d2.data); });
        fetch(`/api/campaigns`)
          .then(r => r.json()).then(d2 => setProductCampaigns(d2.data || []));
        fetch(`/api/bundles`)
          .then(r => r.json()).then(d2 => setProductBundles((d2.data || []).filter((b: any) =>
            b.items?.some((i: any) => i.productId === productId)
          )));
        if (d.data.productType !== "digital") {
          fetch(`/api/shipping?productId=${productId}`)
            .then(r => r.json()).then(d2 => { if (d2.success) setShippingInfo(d2.data); });
        } else {
          setShippingInfo(null);
        }
      })
      .catch(() => { setPageError("Veri yüklenemedi"); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    setQuantity(1);
    setActiveImage(0);
  }, [slug]);

  useEffect(() => {
    if (!product || productCampaigns.length === 0) return;
    setProductCampaigns(prev => (Array.isArray(prev) ? prev : []).filter(c => {
      if (c.products?.some((p: any) => p.productId === product.id)) return true;
      let catScope: string[] = [];
      try { catScope = JSON.parse(c.categoryScope || "[]"); } catch {}
      return catScope.length > 0 && catScope.includes(product.category);
    }));
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 animate-pulse">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="aspect-[3/4] rounded-md bg-ena-gray" />
          <div className="space-y-4">
            <div className="h-4 w-1/4 rounded bg-ena-gray" />
            <div className="h-8 w-3/4 rounded bg-ena-gray" />
            <div className="h-6 w-1/3 rounded bg-ena-gray" />
            <div className="h-24 rounded bg-ena-gray" />
          </div>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ena-text">Hata</h1>
        <p className="text-ena-light mt-2">{pageError}</p>
        <Link href="/catalog"><Button variant="outline" className="mt-4">Kataloğa Dön</Button></Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ena-text">Ürün bulunamadı</h1>
        <Link href="/catalog"><Button variant="outline" className="mt-4">Kataloğa Dön</Button></Link>
      </div>
    );
  }

  const images = (() => {
    try { const p = JSON.parse(product.images); return Array.isArray(p) && p.length ? p : [product.image]; }
    catch { return [product.image]; }
  })();

  const effectivePrice = product.effectivePrice ?? product.price;
  const dealerDiscount = product.dealerDiscount ?? 0;
  const isDealer = product.isDealer ?? false;
  const variants = (product as any)?.variants || [];
  const rawSpecs = (() => { try { const s = JSON.parse((product as any)?.specs || "[]"); return Array.isArray(s) ? s : []; } catch { return []; } })();
  const specs = rawSpecs;

  // Parse variant options + build grouped selectors
  const parsedVariants = variants.map((v: any) => {
    let options: Array<{ group: string; value: string }> = [];
    try { options = JSON.parse(v.options || "[]"); } catch {}
    return { ...v, parsedOptions: options };
  });
  const variantGroups: Record<string, string[]> = {};
  parsedVariants.forEach((v: any) => {
    v.parsedOptions.forEach((opt: { group: string; value: string }) => {
      if (!variantGroups[opt.group]) variantGroups[opt.group] = [];
      if (!variantGroups[opt.group].includes(opt.value)) variantGroups[opt.group].push(opt.value);
    });
  });

  // Match selected options to a variant
  const matchedVariant = Object.keys(variantGroups).length > 0
    ? parsedVariants.find((v: any) =>
        v.parsedOptions.length > 0 &&
        v.parsedOptions.every((opt: { group: string; value: string }) => selectedOptions[opt.group] === opt.value)
      )
    : null;

  const basePrice = product.effectivePrice ?? product.price;
  const productSalePrice = (product as any).salePrice as number | undefined;
  const hasProductSale = productSalePrice != null && productSalePrice > 0 && productSalePrice < basePrice;
  const variantDisplayMode = normalizeVariantDisplayMode((product as any).variantDisplayMode);
  const discountLabel = ((product as any).discountLabel as string) || "";

  const displayPrice = matchedVariant?.price || (hasProductSale ? productSalePrice! : basePrice);
  const compareAtPrice = matchedVariant?.price
    ? (matchedVariant.price < basePrice ? basePrice : undefined)
    : hasProductSale
      ? basePrice
      : undefined;
  const stockStatus = resolveProductStockStatus({
    productStock: product.stock,
    variants: parsedVariants,
    selectedVariant: matchedVariant,
    backorderable: product.backorderable,
  });
  const minOrderQty = product.minOrderQuantity ?? 1;
  const bulkPrice = effectivePrice * 0.85;

  const tiers = (product?.tieredPrices || []).filter((t) => t.minQuantity > 1);
  const activeTier = tiers.length > 0
    ? tiers.reduce((best, t) => t.minQuantity <= quantity && t.minQuantity > best.minQuantity ? t : best, tiers[0])
    : null;
  const totalPrice = displayPrice * quantity;
  const isDigitalProduct = product.productType === "digital";

  const variantAvailability = (() => {
    const map: Record<string, Record<string, { inStock: boolean; lowStock: boolean }>> = {};
    for (const [group, values] of Object.entries(variantGroups)) {
      map[group] = {};
      for (const value of values) {
        const matching = parsedVariants.filter((v: { parsedOptions: Array<{ group: string; value: string }> }) =>
          v.parsedOptions.some((opt) => opt.group === group && opt.value === value),
        );
        const maxStock = matching.reduce((max, v: { stock: number }) => Math.max(max, v.stock || 0), 0);
        map[group][value] = {
          inStock: maxStock > 0,
          lowStock: maxStock > 0 && maxStock <= 5,
        };
      }
    }
    return map;
  })();

  const handleAddToCart = () => {
    if (Object.keys(variantGroups).length > 0 && !matchedVariant) {
      toast.error("Lütfen tüm varyant seçeneklerini belirleyin");
      return;
    }
    for (let i = 0; i < quantity; i++) addItem(product.id, 1, matchedVariant?.id || "");
    toast.success(`${quantity} adet sepete eklendi`);
  };

  const submitReview = async () => {
    setReviewSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product!.id, rating: reviewForm.rating, comment: reviewForm.comment }),
    });
    if (res.ok) {
      toast.success("Yorumunuz onay bekliyor");
      setReviewForm({ rating: 5, comment: "" });
      fetch(`/api/reviews?productId=${product!.id}`).then(r => r.json()).then(d => { if (d.success) setReviews(d.data); });
    } else {
      const err = await res.json();
      toast.error(err.error || "Hata");
    }
    setReviewSubmitting(false);
  };

  try {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link href="/catalog" className="inline-flex items-center gap-1 text-sm text-ena-light hover:text-ena-text transition-colors mb-4">
          <ChevronLeft size={16} /> Kataloğa Dön
        </Link>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        {/* ---- LEFT: Image Gallery ---- */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-3"
        >
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ena-card group relative">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage}
                src={images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.15 }}
              />
            </AnimatePresence>
            {images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setActiveImage((activeImage - 1 + images.length) % images.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setActiveImage((activeImage + 1) % images.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all bg-ena-card ${
                  i === activeImage ? "border-ena-primary ring-1 ring-ena-primary" : "border-transparent hover:border-ena-primary/50"
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* ---- RIGHT ---- */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="space-y-5"
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {product.presentation?.badge && (
              <div className="flex items-center gap-2 text-ena-primary mb-1">
                <Building2 size={14} />
                <span className="text-xs font-semibold uppercase tracking-widest">{product.presentation.badge}</span>
              </div>
            )}
            <p className="text-xs text-ena-light uppercase tracking-wide">{product.category}{product.subcategory ? ` / ${product.subcategory}` : ""}</p>
            <h1 className="mt-1 text-2xl font-black text-ena-text md:text-3xl">{product.name}</h1>
            {product.presentation?.subtitle && (
              <p className="mt-1.5 text-sm text-ena-light/90">{product.presentation.subtitle}</p>
            )}
            {product.presentation?.shortDescription && (
              <p className="mt-2 text-sm text-ena-text/80 leading-relaxed max-w-xl">{product.presentation.shortDescription}</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={14} className={s <= Math.round(reviews.average || 0) ? "text-yellow-500 fill-yellow-500" : "text-ena-light"} />
              ))}
            </div>
            <span className="text-xs text-ena-light">{reviews.count > 0 ? `(${reviews.count} değerlendirme)` : "(Henüz değerlendirme yok)"}</span>
          </motion.div>

          {/* Fiyat + Varyantlar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-ena-card rounded-xl p-4 space-y-2">
            {Object.keys(variantGroups).length > 0 && (
              <VariantSelector
                variantGroups={variantGroups}
                selectedOptions={selectedOptions}
                onSelect={(group, v) => setSelectedOptions({ ...selectedOptions, [group]: v })}
                mode={variantDisplayMode}
                variantAvailability={variantAvailability}
              />
            )}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold text-ena-primary">{formatPrice(displayPrice)}</span>
              {compareAtPrice != null && compareAtPrice > displayPrice && (
                <span className="text-sm text-ena-light line-through">{formatPrice(compareAtPrice)}</span>
              )}
              {discountLabel && (
                <span className="text-xs bg-ena-primary/20 text-ena-primary px-2 py-0.5 rounded-full font-semibold">{discountLabel}</span>
              )}
              {isDealer && dealerDiscount > 0 ? (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Bayi %{dealerDiscount} İndirim</span>
              ) : null}
            </div>
          </motion.div>

          {/* Toptan Fiyat Tablosu */}
          {tiers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="bg-ena-card rounded-xl border border-ena-border overflow-hidden">
              <div className="border-b border-ena-border px-3 py-2">
                <span className="text-xs font-bold text-ena-text">Toptan Fiyatlar</span>
              </div>
              <div className="divide-y divide-ena-border text-sm">
                {[{ minQuantity: 1, price: displayPrice }, ...tiers].sort((a, b) => a.minQuantity - b.minQuantity).map((t, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 ${quantity >= t.minQuantity ? "bg-ena-primary/5" : ""}`}>
                    <span className="text-xs text-ena-light">{i === 0 ? "1 adet" : `${t.minQuantity}+ adet`}</span>
                    <span className={`text-xs font-bold ${quantity >= t.minQuantity ? "text-ena-primary" : "text-ena-text"}`}>
                      {formatPrice(t.price)}
                      {i > 0 && (
                        <span className="text-[10px] text-green-400 ml-1">(%{Math.round((1 - t.price / displayPrice) * 100)} tasarruf)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Toplu Sipariş Hesaplayıcı */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }} className="bg-ena-card rounded-xl border border-ena-border p-3">
            <p className="text-xs font-bold text-ena-text mb-2">Toplu Sipariş Hesaplayıcı</p>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-ena-border bg-ena-dark/50 px-2 py-1.5 text-xs text-ena-text text-center focus:outline-none focus:border-ena-primary"
              />
              <span className="text-xs text-ena-light">adet</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-ena-dark/30 rounded-lg px-2.5 py-1.5">
                <span className="text-ena-light">Birim Fiyat</span>
                <p className="font-bold text-ena-text">{formatPrice(activeTier && quantity >= activeTier.minQuantity ? activeTier.price : displayPrice)}</p>
              </div>
              <div className="bg-ena-dark/30 rounded-lg px-2.5 py-1.5">
                <span className="text-ena-light">Toplam</span>
                <p className="font-bold text-ena-primary">{formatPrice((activeTier && quantity >= activeTier.minQuantity ? activeTier.price : displayPrice) * quantity)}</p>
              </div>
            </div>
            {activeTier && quantity >= activeTier.minQuantity && (
              <p className="text-[10px] text-green-400 mt-1.5">Toptan fiyat uygulandı! %{Math.round((1 - activeTier.price / displayPrice) * 100)} tasarruf.</p>
            )}
          </motion.div>

          {/* Campaigns with Countdown */}
          {productCampaigns.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }} className="space-y-2">
              {productCampaigns.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between bg-ena-primary/50/10 border border-ena-primary/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ena-primary">{c.badge || c.name}</span>
                    {c.description && <span className="text-xs text-ena-primary/60 hidden sm:inline">{c.description}</span>}
                  </div>
                  {c.endsAt && <CountdownTimer endsAt={c.endsAt} />}
                </div>
              ))}
            </motion.div>
          )}

          {/* Bundles */}
          {productBundles.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
              {productBundles.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package size={14} className="text-purple-400 shrink-0" />
                    <span className="text-xs font-semibold text-purple-400">{b.name}</span>
                    <span className="text-xs text-purple-400/60 hidden sm:inline">({b.items?.length || 0} ürün)</span>
                  </div>
                  <span className="text-xs font-bold text-purple-400">{b.price?.toFixed(2)} ₺</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Adet + Sepete Ekle */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex items-center gap-4">
            <span className="text-sm text-ena-light font-medium">Adet:</span>
            <div className="flex items-center border border-ena-border rounded-lg overflow-hidden bg-ena-card">
              <button onClick={() => setQuantity(Math.max(minOrderQty, quantity - 1))} className="p-2.5 text-ena-light hover:text-ena-text hover:bg-ena-gray transition-colors">
                <Minus size={16} />
              </button>
              <span className="w-12 text-center text-sm font-semibold text-ena-text">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(99, quantity + 1))} className="p-2.5 text-ena-light hover:text-ena-text hover:bg-ena-gray transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <span className="text-sm text-ena-light">Toplam: <span className="font-bold text-ena-primary">{formatPrice(totalPrice)}</span></span>
            {minOrderQty > 1 && (
              <span className="text-xs text-amber-400">Min. {minOrderQty} adet</span>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex gap-3">
            <Button size="lg" className="flex-1 gap-2 font-semibold" disabled={!stockStatus.canPurchase} onClick={handleAddToCart}>
              <Play size={16} fill="currentColor" />
              {stockStatus.level === "out" && product.backorderable ? "Ön Sipariş Ver" : "Sepete Ekle"}
            </Button>
            <Button variant="outline" size="lg" className="flex-1" disabled={!stockStatus.canPurchase}>Hemen Al</Button>
            {isDealerUser && (
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                className={`p-3 rounded-xl border transition-all duration-200 shrink-0 ${isFavorite ? "border-ena-primary bg-ena-primary/10 text-ena-primary" : "border-ena-border text-ena-light hover:text-ena-primary hover:border-ena-primary/50"}`}
              >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            )}
          </motion.div>

          {/* Stok + Kargo */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="space-y-3 text-sm">
            <ProductStockStatus status={stockStatus} />
            {isDigitalProduct && (
              <div className="flex items-center gap-2 text-indigo-300 text-sm">
                <Download size={14} />
                <span>
                  Dijital teslim: {(product.digitalAssetName || product.digitalDeliveryMode || "erişim").toString()}
                </span>
              </div>
            )}
            {stockStatus.level === "out" && product.backorderable && product.eta && (
              <div className="flex items-center gap-2 text-amber-400 text-xs">
                <Clock size={13} />
                Tahmini Teslimat: {product.eta}
              </div>
            )}
            {shippingInfo && (
              <div className="flex items-center gap-2 text-ena-light text-sm">
                <Truck size={14} />
                {shippingInfo.freeShipping ? (
                  <span className="text-emerald-400 font-medium">
                    Ücretsiz Kargo ({shippingInfo.carrier})
                  </span>
                ) : (
                  <span>{shippingInfo.carrier}</span>
                )}
              </div>
            )}
            <ProductTrustBadges badges={product.presentation?.trustBadges || []} />
          </motion.div>

          {/* Hızlı Bilgi Kartı */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.47 }} className="bg-ena-card rounded-xl border border-ena-border overflow-hidden">
            <div className="border-b border-ena-border px-3 py-2">
              <span className="text-xs font-bold text-ena-text">Hızlı Bilgi</span>
            </div>
            <div className="divide-y divide-ena-border text-xs">
              {(product as any).sku && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-ena-light">Stok Kodu</span>
                  <span className="text-ena-text font-medium">{(product as any).sku}</span>
                </div>
              )}
              {(product as any).barcode && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-ena-light">Barkod</span>
                  <span className="text-ena-text font-medium">{(product as any).barcode}</span>
                </div>
              )}
              {specs.filter((s: any) => s.key).slice(0, 3).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="text-ena-light">{s.key}</span>
                  <span className="text-ena-text font-medium">{s.value}</span>
                </div>
              ))}
              {(product as any).weight > 0 && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-ena-light">Ağırlık</span>
                  <span className="text-ena-text font-medium">{(product as any).weight} kg</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Campaigns */}
          {productCampaigns.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="flex flex-wrap gap-2">
              {productCampaigns.map((c: any) => (
                <div key={c.id} className="flex items-center gap-1.5 bg-ena-primary/5 border border-ena-primary/20 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-semibold text-ena-primary">{c.badge || c.name}</span>
                  {c.description && <span className="text-[10px] text-ena-primary/60 hidden sm:inline">{c.description}</span>}
                  {c.endsAt && <CountdownTimer endsAt={c.endsAt} />}
                </div>
              ))}
            </motion.div>
          )}

          {/* ---- REVIEWS (sağ blok içinde) ---- */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-ena-card rounded-xl border border-ena-border overflow-hidden">
            <div className="border-b border-ena-border px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-ena-text">Değerlendirmeler</span>
              {reviews.count > 0 && (
                <span className="text-[10px] text-ena-light">{reviews.average.toFixed(1)} <Star size={10} className="inline text-yellow-500 fill-yellow-500" /> ({reviews.count})</span>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2">
              {reviews.reviews.length === 0 ? (
                <p className="text-xs text-ena-light text-center py-4">Henüz değerlendirme yapılmadı.</p>
              ) : reviews.reviews.map(r => (
                <div key={r.id} className="border-b border-ena-border last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-ena-text">{r.user.name}</span>
                    <div className="flex">{Array.from({length:5}).map((_,s) => <Star key={s} size={9} className={s < r.rating ? "text-yellow-500 fill-yellow-500" : "text-ena-light"} />)}</div>
                  </div>
                  {r.comment && <p className="text-[10px] text-ena-light leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
            <div className="border-t border-ena-border px-3 py-2">
              <div className="flex items-center gap-1 mb-1.5">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setReviewForm({...reviewForm, rating: s})}
                    className="transition-colors"><Star size={13} className={s <= reviewForm.rating ? "text-yellow-500 fill-yellow-500" : "text-ena-light"} />
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                  placeholder="Yorumunuz..."
                  className="flex-1 rounded-lg border border-ena-border bg-ena-dark/50 px-2 py-1 text-[10px] text-ena-text placeholder:text-ena-light focus:outline-none focus:border-ena-primary"
                />
                <button onClick={submitReview} disabled={reviewSubmitting}
                  className="shrink-0 px-2.5 py-1 bg-ena-primary text-white text-[10px] rounded-lg hover:brightness-90 transition-colors disabled:opacity-50">
                  {reviewSubmitting ? "..." : "Gönder"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ---- TABS ---- */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12">
        <div className="flex border-b border-ena-border mb-6">
          {(["desc", "details", "reviews"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                tab === t ? "text-ena-primary border-ena-primary" : "text-ena-light border-transparent hover:text-ena-text"
              }`}
            >
              {t === "desc" ? "Ürün Açıklaması" : t === "details" ? "Özellikler" : "Değerlendirmeler"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "desc" && (
            <motion.div key="desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-ena-card rounded-xl p-6">
              {product.description?.trim() ? (
                <p className="text-ena-text leading-relaxed whitespace-pre-line">{product.description}</p>
              ) : (
                <p className="text-ena-light text-sm">Bu ürün için henüz detaylı açıklama girilmemiş.</p>
              )}
              {(product.presentation?.highlights?.length ?? 0) > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-ena-light">
                  {product.presentation!.highlights.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-ena-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "details" && (
            <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-ena-card rounded-xl p-6">
              {specs.length > 0 ? (
                <dl className="divide-y divide-ena-border">
                  {specs.filter((s: any) => s.key).map((s: any, i: number) => (
                    <div key={i} className="flex py-3 text-sm">
                      <dt className="w-1/3 text-ena-light font-medium">{s.key}</dt>
                      <dd className="w-2/3 text-ena-text">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-ena-light text-sm">Bu ürün için henüz detaylı özellik girilmemiş.</p>
              )}
              <dl className="divide-y divide-ena-border">
                {[
                  ["Kategori", product.category],
                  ["Alt Kategori", product.subcategory || "-"],
                  ["Stok Durumu", product.stock > 0 ? "Stokta" : "Stokta Yok"],
                  ["Minimum Sipariş", `${minOrderQty} adet`],
                  ["Birim Fiyat", formatPrice(product.price)],
                  [isDealer ? "Bayi Fiyatı" : "Birim Fiyat", formatPrice(effectivePrice)],
                  ...tiers.sort((a, b) => b.minQuantity - a.minQuantity).slice(0, 1).map((t) => [`Toptan (${t.minQuantity}+)`, formatPrice(t.price)] as [string, string]),
                  ["Kargo", "1000TL üzeri ücretsiz"],
                  ["İade", "30 gün içinde iade"],
                  ["Ürün Kodu", product.id.slice(0, 8).toUpperCase()],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2.5 text-sm">
                    <dt className="text-ena-light">{label}</dt>
                    <dd className="text-ena-text font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          )}

          {tab === "reviews" && (
            <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-ena-card rounded-xl p-6 space-y-5">
              {/* Review form */}
              <div className="bg-ena-dark/50 rounded-lg p-4">
                <p className="text-sm font-semibold text-ena-text mb-3">Değerlendirme Yap</p>
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setReviewForm({...reviewForm, rating: s})}
                      className="transition-colors"><Star size={20} className={s <= reviewForm.rating ? "text-yellow-500 fill-yellow-500" : "text-ena-light"} />
                    </button>
                  ))}
                </div>
                <textarea className="w-full rounded-lg border border-ena-border bg-ena-card px-3 py-2 text-sm text-ena-text placeholder:text-ena-light focus:outline-none focus:border-ena-primary"
                  rows={2} value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} placeholder="Deneyiminizi paylaşın..." />
                <button onClick={submitReview} disabled={reviewSubmitting}
                  className="mt-2 px-4 py-1.5 bg-ena-primary text-white text-sm rounded-lg hover:brightness-90 transition-colors disabled:opacity-50">
                  {reviewSubmitting ? "Gönderiliyor..." : "Gönder"}
                </button>
              </div>

              {/* Reviews header */}
              {reviews.count > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-ena-text">{reviews.average}</span>
                    <Star size={18} className="text-yellow-500 fill-yellow-500" />
                  </div>
                  <span className="text-sm text-ena-light">{reviews.count} değerlendirme</span>
                </div>
              )}

              {/* Review list */}
              {reviews.reviews.length === 0 ? (
                <p className="text-sm text-ena-light text-center py-4">Henüz değerlendirme yapılmadı. İlk yorumu sen yap!</p>
              ) : reviews.reviews.map(r => (
                <div key={r.id} className="py-3 border-b border-ena-border last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-ena-text">{r.user.name}</span>
                    <div className="flex">{Array.from({length:5}).map((_,s) => <Star key={s} size={12} className={s < r.rating ? "text-yellow-500 fill-yellow-500" : "text-ena-light"} />)}</div>
                    <span className="text-xs text-ena-light ml-auto">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span>
                  </div>
                  {r.comment && <p className="text-sm text-ena-light">{r.comment}</p>}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
  } catch (e) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ena-text">Bir hata oluştu</h1>
        <p className="text-ena-light mt-2 text-sm">{(e as Error).message}</p>
        <Link href="/catalog"><Button variant="outline" className="mt-4">Kataloğa Dön</Button></Link>
      </div>
    );
  }
}
