"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeBannerSlotDTO } from "@/lib/homepage/service";

type BannerItem = HomeBannerSlotDTO["banners"][number];

function BannerMedia({
  banner,
  className = "",
  priority = false,
}: {
  banner: BannerItem;
  className?: string;
  priority?: boolean;
}) {
  if (banner.mediaType === "video" && banner.videoDesktop) {
    const mobile = banner.videoMobile || banner.videoDesktop;
    return (
      <video
        className={`w-full h-full object-cover ${className}`}
        autoPlay
        muted
        loop
        playsInline
        poster={banner.imageDesktop || undefined}
        preload={priority ? "auto" : "metadata"}
      >
        <source src={mobile} media="(max-width: 640px)" />
        <source src={banner.videoDesktop} />
      </video>
    );
  }

  const mobile = banner.imageMobile || banner.imageDesktop;
  const tablet = banner.imageTablet || banner.imageDesktop;
  const desktop = banner.imageDesktop;

  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={mobile} />
      <source media="(max-width: 1024px)" srcSet={tablet} />
      <img
        src={desktop}
        alt={banner.title || "Banner"}
        className={`w-full h-full object-cover ${className}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}

function BannerPicture({
  banner,
  className = "",
  priority = false,
}: {
  banner: BannerItem;
  className?: string;
  priority?: boolean;
}) {
  const inner = <BannerMedia banner={banner} className={className} priority={priority} />;

  if (banner.linkUrl) {
    return (
      <Link
        href={banner.linkUrl}
        target={banner.linkTarget === "_blank" ? "_blank" : undefined}
        rel={banner.linkTarget === "_blank" ? "noopener noreferrer" : undefined}
        className="block w-full h-full"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

function alignClass(align: string) {
  if (align === "left") return "mr-auto";
  if (align === "right") return "ml-auto";
  return "mx-auto";
}

function mobileLayoutClass(layout: string) {
  if (layout === "hidden") return "hidden md:block";
  if (layout === "full") return "max-w-none px-0 md:px-4";
  return "";
}

function BannerFrame({
  children,
  slot,
  className = "",
}: {
  children: React.ReactNode;
  slot: HomeBannerSlotDTO;
  className?: string;
}) {
  const style = slot.backgroundColor ? { backgroundColor: slot.backgroundColor } : undefined;
  return (
    <section className="py-4 md:py-6" style={style}>
      <div className={`mx-auto max-w-7xl px-4 ${mobileLayoutClass(slot.mobileLayout)} ${alignClass(slot.contentAlign)} ${className}`}>
        {children}
      </div>
    </section>
  );
}

export function HomeBannerSection({ slot, priority = false }: { slot: HomeBannerSlotDTO; priority?: boolean }) {
  const banners = slot.banners;
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (!slot.autoplay || slot.displayMode !== "carousel" || banners.length <= 1) return;
    const t = setInterval(next, slot.intervalMs || 5000);
    return () => clearInterval(t);
  }, [slot.autoplay, slot.displayMode, slot.intervalMs, banners.length, next]);

  if (!banners.length) return null;

  const aspect = "aspect-[2/1] sm:aspect-[21/9] md:aspect-[3/1]";
  const widthClass = slot.contentAlign === "center" ? "w-full max-w-5xl" : "w-full";

  if (slot.displayMode === "single") {
    return (
      <BannerFrame slot={slot}>
        <div className={`relative overflow-hidden rounded-xl md:rounded-2xl ${aspect} bg-ena-gray ${widthClass}`}>
          <BannerPicture banner={banners[0]} priority={priority} />
        </div>
      </BannerFrame>
    );
  }

  if (slot.displayMode === "grid") {
    const cols = slot.gridColumns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
    return (
      <BannerFrame slot={slot}>
        <div className={`grid grid-cols-1 ${cols} gap-3 md:gap-4 ${widthClass}`}>
          {banners.map((b, i) => (
            <div key={b.id} className={`relative overflow-hidden rounded-xl ${aspect} bg-ena-gray`}>
              <BannerPicture banner={b} priority={priority && i === 0} />
            </div>
          ))}
        </div>
      </BannerFrame>
    );
  }

  if (slot.displayMode === "strip") {
    return (
      <BannerFrame slot={slot}>
        <div className={`bleed-x-scroll flex gap-3 pb-2 snap-x scrollbar-none ${widthClass}`}>
          {banners.map((b, i) => (
            <div
              key={b.id}
              className={`snap-start shrink-0 w-[min(85vw,calc(100vw-2rem))] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] relative overflow-hidden rounded-xl ${aspect} bg-ena-gray`}
            >
              <BannerPicture banner={b} priority={priority && i === 0} />
            </div>
          ))}
        </div>
      </BannerFrame>
    );
  }

  const current = banners[index];

  return (
    <BannerFrame slot={slot}>
      <div className={`relative overflow-hidden rounded-xl md:rounded-2xl ${aspect} bg-ena-gray group ${widthClass}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0"
          >
            <BannerPicture banner={current} priority={priority} />
          </motion.div>
        </AnimatePresence>

        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity hover:bg-black/60"
              aria-label="Önceki"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity hover:bg-black/60"
              aria-label="Sonraki"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                  aria-label={`Banner ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </BannerFrame>
  );
}

export function HomeBannersAtPlacement({
  slots,
  placement,
  categorySectionId,
  priorityFirst = false,
}: {
  slots: HomeBannerSlotDTO[];
  placement: string;
  categorySectionId?: string;
  priorityFirst?: boolean;
}) {
  const matching = slots
    .filter((s) => {
      if (s.placement !== placement || !s.active || s.banners.length === 0) return false;
      if (placement === "before_category" || placement === "after_category") {
        return categorySectionId ? s.categorySectionId === categorySectionId : false;
      }
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!matching.length) return null;

  return (
    <>
      {matching.map((slot, i) => (
        <HomeBannerSection key={slot.key} slot={slot} priority={priorityFirst && i === 0} />
      ))}
    </>
  );
}
