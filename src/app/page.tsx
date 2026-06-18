"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";
import SmartSearch from "@/components/ui/smart-search";
import { Play, ChevronRight, Building2, Truck, BarChart3, Headphones } from "lucide-react";
import { EcosystemShowcaseSection } from "@/components/ecosystem/EcosystemShowcaseSection";
import { useT } from "@/lib/i18n/provider";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const categories = ["Cam Tablo", "Mdf Tablo", "Halı", "Kilim", "Perde", "Nevresim", "Yastık Kılıfı", "Minder", "Puzzle", "Hediyelik Ürünler"];

function useHorizontalScroll() {
  const ref = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!ref.current) return;
    const isOver = ref.current.matches(":hover");
    if (!isOver) return;
    const delta = e.deltaY;
    ref.current.scrollLeft += delta;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return ref;
}

function ProductRow({ products }: { products: Product[] }) {
  const scrollRef = useHorizontalScroll();

  if (products.length === 0) return null;

  return (
    <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x scrollbar-none cursor-grab active:cursor-grabbing">
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants} className="snap-start shrink-0 w-44 md:w-52">
          <Link href={`/products/${product.id}`} className="group block">
            <motion.div
              initial="rest"
              whileHover="hover"
              className="rounded-md"
              style={{ originX: "center", originY: "bottom" }}
            >
              <motion.div
                variants={{
                  rest: { y: 0, scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" },
                  hover: { y: -12, scale: 1.12, boxShadow: "0 20px 40px rgba(0,0,0,0.6)", transition: { type: "spring", stiffness: 300, damping: 15 } },
                }}
                className="aspect-[2/3] overflow-hidden rounded-md bg-ena-gray"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-all duration-500 group-hover:scale-125"
                />
              </motion.div>
              <div className="mt-2 space-y-0.5">
                <h3 className="text-sm font-medium text-ena-text truncate group-hover:text-ena-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm font-bold text-ena-primary">{formatPrice(product.price)}</p>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

const partners = [
  { name: "Trendyol", short: "Trendyol", logo: "/images/partners/trendyol.png" },
  { name: "Hepsiburada", short: "Hepsiburada", logo: "/images/partners/hepsiburada.png" },
  { name: "N11", short: "N11", logo: "/images/partners/n11.png" },
  { name: "Amazon Türkiye", short: "Amazon.tr", logo: "/images/partners/amazontr.png" },
  { name: "ÇiçekSepeti", short: "ÇiçekSepeti", logo: "/images/partners/ciceksepeti.png" },
  { name: "PttAVM", short: "PttAVM", logo: "/images/partners/pttavm.png" },
  { name: "Pazarama", short: "Pazarama", logo: "/images/partners/pazarama.png" },
  { name: "Morhipo", short: "Morhipo", logo: "/images/partners/morhipo.png" },
  { name: "Teknosa", short: "Teknosa", logo: "/images/partners/teknosa.png" },
  { name: "İdefix", short: "İdefix", logo: "/images/partners/idefix.png" },
  { name: "GittiGidiyor", short: "GittiGidiyor", logo: "/images/partners/gittigidiyor.png" },
  { name: "Vivense", short: "Vivense", logo: "/images/partners/vivense.png" },
  { name: "Modanisa", short: "Modanisa", logo: "/images/partners/modanisa.png" },
  { name: "Boyner", short: "Boyner", logo: "/images/partners/boyner.png" },
  { name: "Amazon", short: "Amazon", logo: "/images/partners/amazon.png" },
  { name: "eBay", short: "eBay", logo: "/images/partners/ebay.png" },
  { name: "Walmart", short: "Walmart", logo: "/images/partners/walmart.png" },
  { name: "Alibaba", short: "Alibaba", logo: "/images/partners/alibaba.png" },
  { name: "AliExpress", short: "AliExpress", logo: "/images/partners/aliexpress.png" },
  { name: "Etsy", short: "Etsy", logo: "/images/partners/etsy.png" },
  { name: "Mercado Libre", short: "M. Libre", logo: "/images/partners/mercadolibre.png" },
  { name: "Rakuten", short: "Rakuten", logo: "/images/partners/rakuten.png" },
  { name: "Zalando", short: "Zalando", logo: "/images/partners/zalando.png" },
  { name: "Otto", short: "Otto", logo: "/images/partners/otto.png" },
  { name: "JD.com", short: "JD.com", logo: "/images/partners/jd.png" },
  { name: "Flipkart", short: "Flipkart", logo: "/images/partners/flipkart.png" },
  { name: "Shopee", short: "Shopee", logo: "/images/partners/shopee.png" },
  { name: "Lazada", short: "Lazada", logo: "/images/partners/lazada.png" },
  { name: "Wish", short: "Wish", logo: "/images/partners/wish.png" },
  { name: "Allegro", short: "Allegro", logo: "/images/partners/allegro.png" },
  { name: "bol.com", short: "bol.com", logo: "/images/partners/bol.png" },
  { name: "Cdiscount", short: "Cdiscount", logo: "/images/partners/cdiscount.png" },
  { name: "Wayfair", short: "Wayfair", logo: "/images/partners/wayfair.png" },
  { name: "Target", short: "Target", logo: "/images/partners/target.png" },
  { name: "Best Buy", short: "Best Buy", logo: "/images/partners/bestbuy.png" },
  { name: "Carrefour", short: "Carrefour", logo: "/images/partners/carrefour.png" },
  { name: "Costco", short: "Costco", logo: "/images/partners/costco.png" },
  { name: "Fnac", short: "Fnac", logo: "/images/partners/fnac.png" },
  { name: "ASOS", short: "ASOS", logo: "/images/partners/asos.png" },
];

export default function HomePage() {
  const { t } = useT();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.data || []));
  }, []);

  return (
    <div className="bg-ena-dark">
      <section className="relative h-[90vh] min-h-[650px] overflow-hidden bg-[#141414]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-[#141414]/50 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent z-10" />
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=85"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
          <source src="/hero-bg-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
        </video>
        <div className="relative z-20 mx-auto max-w-7xl px-4 h-full flex items-center">
          <div className="w-full max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="flex items-center gap-2 text-ena-primary mb-4">
                <Building2 size={16} />
                <span className="text-xs font-semibold uppercase tracking-widest">{t("home.hero_badge")}</span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }} className="text-5xl font-black tracking-tight md:text-7xl">
                <span style={{color:"#e50914"}}>ENA</span><span className="relative">UNITY<sup className="absolute -top-[0.15em] -right-[0.35em] text-[0.35em]">®</sup></span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }} className="mt-4 text-lg text-ena-light max-w-xl leading-relaxed">
                {t("home.hero_desc")}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="mt-8 flex flex-wrap gap-3">
                <Link href="/catalog">
                  <Button size="lg" className="gap-2 font-semibold">
                    <Play size={18} fill="currentColor" />
                    {t("home.browse_catalog")}
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Building2 size={18} />
                    {t("home.open_b2b_account")}
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-16 border-t border-ena-border"
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Building2, title: t("home.feature_corporate_pricing"), desc: t("home.feature_corporate_pricing_desc") },
              { icon: BarChart3, title: t("home.feature_bulk_order"), desc: t("home.feature_bulk_order_desc") },
              { icon: Truck, title: t("home.feature_free_shipping"), desc: t("home.feature_free_shipping_desc") },
              { icon: Headphones, title: t("home.feature_support_247"), desc: t("home.feature_support_247_desc") },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                variants={itemVariants}
                whileHover={{ y: -6, scale: 1.02, borderColor: "rgba(229, 9, 20, 0.3)", transition: { type: "spring", stiffness: 300, damping: 20 } }}
                className="rounded border border-ena-border bg-ena-card/30 p-6 transition-colors"
              >
                <f.icon size={24} className="text-ena-primary" />
                <h3 className="mt-4 font-bold text-ena-text">{f.title}</h3>
                <p className="mt-1 text-sm text-ena-light">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="border-t border-ena-border py-10">
        <div className="mx-auto max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <h2 className="text-xl font-bold text-ena-text">{t("home.search_title")}</h2>
            <p className="mt-1 text-sm text-ena-light">{t("home.search_desc")}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="w-full"
          >
            <SmartSearch variant="hero" />
          </motion.div>
        </div>
      </section>

      {categories.map((category) => {
        const catProducts = products.filter((p) => p.category === category);
        if (catProducts.length === 0) return null;
        return (
          <motion.section
            key={category}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="py-8"
          >
            <div className="mx-auto max-w-7xl px-4">
              <motion.div variants={itemVariants} className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-ena-text">{category}</h2>
                <Link
                  href={`/products?category=${category}`}
                  className="text-sm text-ena-light hover:text-ena-text transition-colors flex items-center gap-1"
                >
                  {t("home.view_all")} <ChevronRight size={14} />
                </Link>
              </motion.div>
              <ProductRow products={catProducts} />
            </div>
          </motion.section>
        );
      })}

      <EcosystemShowcaseSection />

      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="border-t border-ena-border py-16 overflow-hidden"
      >
        <div className="mx-auto max-w-7xl px-4 mb-8">
          <div className="text-center">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-ena-primary mb-3">MARKETPLACE NETWORK</span>
            <h2 className="text-2xl font-black text-ena-text">İş Ortaklarımız</h2>
            <p className="mt-1.5 text-sm text-ena-light">İşletmenizi Büyütün</p>
            <p className="mt-0.5 text-xs text-ena-light/60">Kurumsal fiyatlar ve özel tedarik koşulları için hemen iletişime geçin.</p>
          </div>
        </div>
        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-20 bg-gradient-to-r from-ena-dark to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-20 bg-gradient-to-l from-ena-dark to-transparent"
            aria-hidden
          />
          <div className="flex w-max gap-12 animate-marquee [--marquee-speed:45s] hover:[animation-play-state:paused]">
            {[...partners, ...partners].map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                className="shrink-0 flex flex-col items-center justify-center gap-2 w-32"
              >
                <div className="flex h-14 w-28 items-center justify-center rounded-xl border border-white/10 bg-white px-3 py-2 shadow-sm">
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="max-h-9 max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[10px] text-ena-light/70 text-center leading-tight">{p.short}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="border-t border-ena-border py-16 text-center"
      >
        <div className="mx-auto max-w-xl px-4">
          <h2 className="text-3xl font-black text-ena-text">{t("home.cta_title")}</h2>
          <p className="mt-2 text-ena-light">{t("home.cta_desc")}</p>
            <div className="mx-auto mt-6 flex max-w-md gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="email"
              placeholder={t("home.cta_email_placeholder")}
              className="flex-1 rounded border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-border/40"
            />
            <Button>{t("home.cta_button")}</Button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
