"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";
import { useCartStore } from "@/lib/cart-store";
import { Building2 } from "lucide-react";
import { CampaignCatalogBanner } from "@/components/catalog/CampaignCatalogBanner";
import { CatalogStockBadge } from "@/components/products/ProductStockStatus";
import { filterProductsForCampaign } from "@/lib/campaigns/banner-link";
import { resolveCatalogStockStatus } from "@/lib/products/stock-status";

type CatalogCampaign = {
  id: string;
  name: string;
  description: string;
  type: string;
  discountType: string;
  discountValue: number;
  badge: string;
  badgeColor: string;
  categoryScope: string;
  endsAt: string | null;
  freeShipping: boolean;
  products: { productId: string; type: string }[];
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function CatalogContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<(Product & { shortDescription?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShortOnCatalog, setShowShortOnCatalog] = useState(true);
  const [campaign, setCampaign] = useState<CatalogCampaign | null>(null);
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const campaignId = searchParams.get("campaign");
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    fetch("/api/product-page/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setShowShortOnCatalog(d.data.showShortOnCatalog !== false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!campaignId) {
      setCampaign(null);
      return;
    }
    fetch(`/api/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then((d) => setCampaign(d.success ? d.data : null))
      .catch(() => setCampaign(null));
  }, [campaignId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category && category !== "Tümü") params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    const qs = params.toString();
    fetch(`/api/products${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.data || []);
        setLoading(false);
      })
      .catch(() => { setProducts([]); setLoading(false); });
  }, [category, subcategory]);

  const visibleProducts = useMemo(
    () => (campaign ? filterProductsForCampaign(products, campaign) : products),
    [products, campaign],
  );

  const title = campaign
    ? campaign.name
    : subcategory || category || "Tüm Ürünler";
  const desc = campaign?.description
    ? campaign.description
    : subcategory
    ? `${category} / ${subcategory}`
    : category
    ? `${category} kategorisindeki ürünler`
    : "İşletmeniz için toptan fiyatlarla binlerce ürün";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {campaign && <CampaignCatalogBanner campaign={campaign} />}

      <div className="mb-8">
        <div className="flex items-center gap-2 text-ena-primary mb-2">
          <Building2 size={16} />
          <span className="text-xs font-semibold uppercase tracking-widest">B4B Katalog</span>
        </div>
        <h1 className="text-3xl font-black text-ena-text">{title}</h1>
        <p className="mt-1 text-ena-light">{desc}</p>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="aspect-[2/3] rounded-md bg-ena-gray" />
              <div className="h-3 w-2/3 rounded bg-ena-gray" />
              <div className="h-3 w-1/3 rounded bg-ena-gray" />
            </div>
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <p className="text-center text-ena-light py-16">
          {campaign ? "Bu kampanyaya uygun ürün bulunamadı." : "Bu kategoride ürün bulunamadı."}
        </p>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {visibleProducts.map((product) => {
            const catalogStock = resolveCatalogStockStatus({
              productStock: product.stock,
              variants: (product as { variants?: Array<{ stock: number; options: string }> }).variants,
            });
            return (
            <motion.div key={product.id} variants={itemVariants}>
              <div className="group">
                <Link href={`/products/${product.id}${campaignId ? `?campaign=${campaignId}` : ""}`}>
                  <motion.div initial="rest" whileHover="hover" style={{ originX: "center", originY: "bottom" }} className="relative">
                    <CatalogStockBadge status={catalogStock} />
                    <motion.div
                      variants={{
                        rest: { y: 0, scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" },
                        hover: { y: -12, scale: 1.12, boxShadow: "0 20px 40px rgba(0,0,0,0.6)", transition: { type: "spring", stiffness: 300, damping: 15 } },
                      }}
                      className="aspect-[2/3] overflow-hidden rounded-md bg-ena-card"
                    >
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-all duration-500 group-hover:scale-125" />
                    </motion.div>
                  </motion.div>
                </Link>
                <div className="mt-2 space-y-1 px-0.5">
                  <p className="text-xs text-ena-light">{product.subcategory || product.category}</p>
                  <Link href={`/products/${product.id}${campaignId ? `?campaign=${campaignId}` : ""}`}>
                    <h3 className="text-sm font-medium text-ena-text truncate hover:text-ena-primary transition-colors">{product.name}</h3>
                  </Link>
                  {showShortOnCatalog && (product as { shortDescription?: string }).shortDescription?.trim() && (
                    <p className="text-[11px] text-ena-light line-clamp-2 leading-snug">
                      {(product as { shortDescription?: string }).shortDescription}
                    </p>
                  )}
                  {campaign?.badge && (
                    <span
                      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded text-white mt-0.5"
                      style={{ background: campaign.badgeColor || "#e50914" }}
                    >
                      {campaign.badge}
                    </span>
                  )}
                  <p className="text-sm font-bold text-ena-primary">{formatPrice(product.price)}</p>
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" className="flex-1 text-xs" onClick={() => addItem(product.id)} disabled={!catalogStock.canPurchase}>
                      {catalogStock.level === "out" ? "Stokta Yok" : "Sepete Ekle"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="aspect-[2/3] rounded-md bg-ena-gray" />
              <div className="h-3 w-2/3 rounded bg-ena-gray" />
              <div className="h-3 w-1/3 rounded bg-ena-gray" />
            </div>
          ))}
        </div>
      </div>
    }>
      <CatalogContent />
    </Suspense>
  );
}
