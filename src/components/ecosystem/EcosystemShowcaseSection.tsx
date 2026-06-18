"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { ProductShowcaseDTO } from "@/lib/ecosystem/types";
import type { EcosystemShowcaseSettingsDTO } from "@/lib/ecosystem/section-settings";
import { DEFAULT_ECOSYSTEM_SECTION } from "@/lib/ecosystem/section-settings";
import { ShowcaseCard } from "./ShowcaseCard";

type Props = {
  settingsOverride?: EcosystemShowcaseSettingsDTO;
  preview?: boolean;
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return { r: 59, g: 130, b: 246 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function EcosystemShowcaseSection({ settingsOverride, preview }: Props) {
  const [products, setProducts] = useState<ProductShowcaseDTO[]>([]);
  const [settings, setSettings] = useState<EcosystemShowcaseSettingsDTO>({
    id: "default",
    ...DEFAULT_ECOSYSTEM_SECTION,
    updatedAt: "",
  });
  const [loading, setLoading] = useState(!settingsOverride);

  useEffect(() => {
    if (settingsOverride) {
      setSettings(settingsOverride);
      setLoading(false);
    } else {
      fetch("/api/ecosystem/settings")
        .then((r) => r.json())
        .then((d) => { if (d.success) setSettings(d.data); })
        .catch(() => {});
    }
  }, [settingsOverride]);

  useEffect(() => {
    fetch("/api/ecosystem/products")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProducts(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!preview && !settings.enabled) return null;
  if (!loading && products.length === 0 && !preview) return null;

  const primary = hexToRgb(settings.bgPrimaryColor);
  const secondary = hexToRgb(settings.bgSecondaryColor);
  const gridClass =
    settings.columns === 1
      ? "grid-cols-1"
      : settings.columns === 2
        ? "md:grid-cols-2"
        : settings.columns === 4
          ? "md:grid-cols-2 xl:grid-cols-4"
          : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      id={settings.anchorId || "ecosystem"}
      className="relative border-t border-ena-border overflow-hidden"
    >
      {preview && (
        <div className="bg-amber-500/90 text-black text-center text-xs font-semibold py-2">
          Bölüm önizleme — kaydedilmemiş ayarlar
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-[28rem] h-[28rem] rounded-full blur-[140px]"
          style={{ backgroundColor: `rgba(${primary.r},${primary.g},${primary.b},0.05)` }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full blur-[140px]"
          style={{ backgroundColor: `rgba(${secondary.r},${secondary.g},${secondary.b},0.05)` }}
        />
      </div>

      <div
        className="relative mx-auto max-w-7xl px-4"
        style={{
          paddingTop: `${settings.paddingTop || "24"}px`,
          paddingBottom: `${settings.paddingBottom || "28"}px`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 md:mb-20 max-w-3xl mx-auto"
        >
          {settings.badgeText && (
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ena-card/60 border border-ena-border text-[11px] font-semibold uppercase tracking-[0.25em] text-ena-light mb-6">
              {settings.badgeText}
            </span>
          )}
          {settings.title && (
            <h2 className="text-3xl md:text-5xl font-black text-ena-text mb-4 tracking-tight leading-tight">
              {settings.title}
            </h2>
          )}
          {settings.description && (
            <p className="text-ena-light text-base md:text-lg leading-relaxed">
              {settings.description}
            </p>
          )}
        </motion.div>

        {loading ? (
          <div className={`grid gap-8 ${gridClass}`}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[420px] rounded-[1.75rem] acc-skeleton" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-8 ${gridClass}`}>
            {products.map((p, i) => (
              <ShowcaseCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
