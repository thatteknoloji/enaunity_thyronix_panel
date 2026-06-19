"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ProductShowcaseDTO } from "@/lib/ecosystem/types";
import { ShowcaseIcon, hexToRgb } from "./ShowcaseIcon";

type Props = {
  product: ProductShowcaseDTO;
  index?: number;
  preview?: boolean;
};

export function ShowcaseCard({ product, index = 0, preview }: Props) {
  const rgb = hexToRgb(product.themeColor);
  const href = product.ctaUrl || product.productUrl || `/ecosystem/${product.slug}`;
  const chips = product.cardFeatures.length > 0 ? product.cardFeatures : product.features.map((f) => f.title);
  const maxChips = product.maxCardChips > 0 ? product.maxCardChips : 8;
  const subtitle = product.shortDescription;
  const openInNewTab = product.linkTarget === "_blank";

  const Wrapper = preview ? "div" : Link;
  const wrapperProps = preview
    ? { className: "group relative flex h-full flex-col rounded-[1.75rem] p-8 md:p-10 lg:p-12 transition-all duration-500" }
    : {
        href,
        target: openInNewTab ? "_blank" : undefined,
        rel: openInNewTab ? "noopener noreferrer" : undefined,
        className: "group relative flex h-full flex-col rounded-[1.75rem] p-8 md:p-10 lg:p-12 transition-all duration-500 hover:-translate-y-2",
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: index * 0.12, ease: [0.23, 1, 0.32, 1] }}
      className="h-full"
    >
      <Wrapper
        {...(wrapperProps as any)}
        style={
          preview
            ? undefined
            : ({
                "--card-r": rgb.r,
                "--card-g": rgb.g,
                "--card-b": rgb.b,
                "--card-accent": product.accentColor,
              } as React.CSSProperties)
        }
      >
        <div
          className="absolute inset-0 rounded-[1.75rem] p-px pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.45), rgba(${rgb.r},${rgb.g},${rgb.b},0.05) 50%, rgba(${rgb.r},${rgb.g},${rgb.b},0.25))`,
          }}
        />
        <div className="absolute inset-px rounded-[calc(1.75rem-1px)] bg-ena-card/90 backdrop-blur-md" />

        <div
          className="absolute inset-0 rounded-[1.75rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: `0 32px 64px -16px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        />
        <div
          className="absolute inset-0 rounded-[1.75rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(${rgb.r},${rgb.g},${rgb.b},0.12), transparent 70%)`,
          }}
        />

        <div className="relative flex flex-col flex-1">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div
              className="w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] rounded-2xl flex items-center justify-center border group-hover:scale-105 transition-transform duration-500"
              style={{
                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
                borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`,
                color: product.accentColor,
                boxShadow: `0 8px 24px rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`,
              }}
            >
              <ShowcaseIcon name={product.icon} size={30} />
            </div>
            <div className="flex flex-col items-end gap-2">
              {product.badgeText && (
                <span
                  className="text-[10px] px-3 py-1.5 rounded-full font-bold tracking-[0.15em] uppercase border"
                  style={{
                    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
                    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`,
                    color: product.accentColor,
                  }}
                >
                  {product.badgeText}
                </span>
              )}
              {product.status === "COMING_SOON" && product.comingSoonText && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-ena-dark/50 border border-ena-border text-ena-light">
                  {product.comingSoonText}
                </span>
              )}
            </div>
          </div>

          <h3 className="text-3xl md:text-4xl font-black text-ena-text tracking-tight leading-none">
            {product.name}
          </h3>
          {subtitle && (
            <p className="mt-3 text-sm md:text-base font-semibold tracking-wide" style={{ color: product.accentColor }}>
              {subtitle}
            </p>
          )}

          {product.longDescription && (
            <p className="mt-5 text-sm md:text-[15px] text-ena-light leading-relaxed flex-1 line-clamp-4">
              {product.longDescription}
            </p>
          )}

          {product.showPriceOnCard && product.monthlyPrice != null && (
            <p className="mt-4 text-lg font-bold text-ena-text">
              {product.monthlyPrice.toLocaleString("tr-TR")} ₺
              <span className="text-sm font-normal text-ena-light">/ay</span>
              {product.yearlyPrice != null && (
                <span className="text-xs text-ena-light ml-2">
                  · {product.yearlyPrice.toLocaleString("tr-TR")} ₺/yıl
                </span>
              )}
            </p>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8">
              {chips.slice(0, maxChips).map((f) => (
                <span
                  key={f}
                  className="text-[11px] px-3 py-1.5 rounded-lg border font-medium"
                  style={{
                    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`,
                    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`,
                    color: product.accentColor,
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-ena-border/60">
            <span
              className="inline-flex items-center gap-2 text-sm font-bold group-hover:gap-3 transition-all duration-300"
              style={{ color: product.accentColor }}
            >
              {product.ctaText || "Keşfet"}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </div>
        </div>
      </Wrapper>
    </motion.div>
  );
}
