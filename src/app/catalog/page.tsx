"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";
import { useCartStore } from "@/lib/cart-store";
import { Building2 } from "lucide-react";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const addItem = useCartStore((s) => s.addItem);

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

  const title = subcategory || category || "Tüm Ürünler";
  const desc = subcategory
    ? `${category} / ${subcategory}`
    : category
    ? `${category} kategorisindeki ürünler`
    : "İşletmeniz için toptan fiyatlarla binlerce ürün";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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
      ) : products.length === 0 ? (
        <p className="text-center text-ena-light py-16">Bu kategoride ürün bulunamadı.</p>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={itemVariants}>
              <div className="group">
                <Link href={`/products/${product.id}`}>
                  <motion.div initial="rest" whileHover="hover" style={{ originX: "center", originY: "bottom" }}>
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
                  <Link href={`/products/${product.id}`}>
                    <h3 className="text-sm font-medium text-ena-text truncate hover:text-ena-primary transition-colors">{product.name}</h3>
                  </Link>
                  <p className="text-sm font-bold text-ena-primary">{formatPrice(product.price)}</p>
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" className="flex-1 text-xs" onClick={() => addItem(product.id)} disabled={product.stock === 0}>
                      {product.stock === 0 ? "Stokta Yok" : "Sepete Ekle"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
