"use client";

import Link from "next/link";
import { Fragment, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";
import SmartSearch from "@/components/ui/smart-search";
import { ChevronRight, Building2, Truck, BarChart3, Headphones, ShoppingBag } from "lucide-react";
import { EcosystemShowcaseSection } from "@/components/ecosystem/EcosystemShowcaseSection";
import { MarketplacePartnersSection } from "@/components/home/MarketplacePartnersSection";
import { HomeBannersAtPlacement } from "@/components/home/HomeBannerSection";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { useT } from "@/lib/i18n/provider";
import type { HomeBannerSlotDTO, HomeHeroDTO, HomepageHeroDTO } from "@/lib/homepage/service";
import { DEFAULT_HERO } from "@/lib/homepage/defaults";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

type HomeCategoryConfig = {
  id: string;
  categoryName: string;
  title: string;
  maxProducts: number;
  active: boolean;
};

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
    <div ref={scrollRef} className="bleed-x-scroll flex gap-3 pb-4 snap-x scrollbar-none cursor-grab active:cursor-grabbing">
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

export default function HomePage() {
  const { t } = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [homeCategories, setHomeCategories] = useState<HomeCategoryConfig[]>([]);
  const [bannerSlots, setBannerSlots] = useState<HomeBannerSlotDTO[]>([]);
  const [hero, setHero] = useState<HomeHeroDTO>(DEFAULT_HERO);
  const [builderHero, setBuilderHero] = useState<HomepageHeroDTO | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/homepage").then((r) => r.json()),
    ]).then(([prodRes, homeRes]) => {
      setProducts(prodRes.data || []);
      if (homeRes.success && homeRes.data) {
        setHomeCategories(homeRes.data.categories || []);
        setBannerSlots(homeRes.data.slots || []);
        if (homeRes.data.hero) setHero(homeRes.data.hero);
        if (homeRes.data.builderHero) setBuilderHero(homeRes.data.builderHero);
      }
    });
  }, []);

  const categorySections = useMemo(() => {
    const activeCount = homeCategories.filter(
      (s) => s.active !== false && products.some((p) => p.category === s.categoryName),
    ).length;
    const mid = Math.max(0, Math.ceil(activeCount / 2) - 1);
    let activeIdx = -1;

    return homeCategories.map((section) => {
      const category = section.categoryName;
      const catProducts = products.filter((p) => p.category === category).slice(0, section.maxProducts || 12);
      const showCategoryRow = section.active !== false && catProducts.length > 0;
      const hasCategoryBanners = bannerSlots.some(
        (s) =>
          s.active &&
          s.banners.length > 0 &&
          (s.placement === "before_category" || s.placement === "after_category") &&
          s.categorySectionId === section.id,
      );
      if (showCategoryRow) activeIdx += 1;

      return {
        section,
        catProducts,
        showCategoryRow,
        hasCategoryBanners,
        showBetween: showCategoryRow && activeIdx === mid,
        visible: showCategoryRow || hasCategoryBanners,
      };
    }).filter((row) => row.visible);
  }, [homeCategories, products, bannerSlots]);

  return (
    <div className="bg-ena-dark overflow-x-clip">
      <HomeHeroSection hero={hero} builderHero={builderHero} t={t} />

      <HomeBannersAtPlacement slots={bannerSlots} placement="after_hero" priorityFirst />

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-16 border-t border-ena-border"
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: Building2, title: t("home.feature_corporate_pricing"), desc: t("home.feature_corporate_pricing_desc") },
              { icon: BarChart3, title: t("home.feature_bulk_order"), desc: t("home.feature_bulk_order_desc") },
              { icon: Truck, title: t("home.feature_free_shipping"), desc: t("home.feature_free_shipping_desc") },
              { icon: Headphones, title: t("home.feature_support_247"), desc: t("home.feature_support_247_desc") },
              { icon: ShoppingBag, title: t("home.feature_dropship_store"), desc: t("home.feature_dropship_store_desc") },
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

      <HomeBannersAtPlacement slots={bannerSlots} placement="after_features" />

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

      <HomeBannersAtPlacement slots={bannerSlots} placement="after_search" />

      {categorySections.map(({ section, catProducts, showCategoryRow, showBetween }) => {
        const category = section.categoryName;
        return (
          <Fragment key={section.id}>
            <HomeBannersAtPlacement
              slots={bannerSlots}
              placement="before_category"
              categorySectionId={section.id}
            />
            {showCategoryRow && (
              <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={containerVariants}
                className="overflow-x-clip py-8"
              >
                <div className="mx-auto max-w-7xl min-w-0 px-4">
                  <motion.div variants={itemVariants} className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-ena-text">{section.title || category}</h2>
                    <Link
                      href={`/products?category=${encodeURIComponent(category)}`}
                      className="text-sm text-ena-light hover:text-ena-text transition-colors flex items-center gap-1"
                    >
                      {t("home.view_all")} <ChevronRight size={14} />
                    </Link>
                  </motion.div>
                  <ProductRow products={catProducts} />
                </div>
              </motion.section>
            )}
            {showBetween && (
              <HomeBannersAtPlacement slots={bannerSlots} placement="between_categories" />
            )}
            <HomeBannersAtPlacement
              slots={bannerSlots}
              placement="after_category"
              categorySectionId={section.id}
            />
          </Fragment>
        );
      })}

      <HomeBannersAtPlacement slots={bannerSlots} placement="before_ecosystem" />

      <EcosystemShowcaseSection />

      <HomeBannersAtPlacement slots={bannerSlots} placement="before_partners" />

      <MarketplacePartnersSection />

      <HomeBannersAtPlacement slots={bannerSlots} placement="before_cta" />

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
