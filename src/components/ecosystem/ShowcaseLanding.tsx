"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ProductShowcaseDTO } from "@/lib/ecosystem/types";
import { ShowcaseIcon, hexToRgb } from "./ShowcaseIcon";
import { resolvePlanCheckoutUrl } from "@/lib/ecosystem/plan-urls";

type Props = {
  product: ProductShowcaseDTO;
  preview?: boolean;
};

export function ShowcaseLanding({ product, preview }: Props) {
  const rgb = hexToRgb(product.themeColor);
  const activeFaq = product.faq.filter((f) => f.active);
  const sortedPlans = [...product.plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const ctaHref = product.ctaUrl || product.productUrl || "#";
  const openInNewTab = product.linkTarget === "_blank";

  return (
    <div className="bg-ena-dark min-h-screen">
      {preview && (
        <div className="sticky top-0 z-50 bg-amber-500/90 text-black text-center text-xs font-semibold py-2">
          Önizleme modu — kaydedilmemiş değişiklikler
        </div>
      )}

      <section
        className="relative border-b border-ena-border overflow-hidden"
        style={{ background: `linear-gradient(135deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.12), transparent 60%)` }}
      >
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 border"
            style={{
              backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
              borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`,
              color: product.accentColor,
            }}
          >
            <ShowcaseIcon name={product.icon} size={32} />
          </div>
          {product.badgeText && (
            <span
              className="inline-block text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-4 border"
              style={{ color: product.accentColor, borderColor: `${product.themeColor}44` }}
            >
              {product.badgeText}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-ena-text tracking-tight">
            {product.heroTitle || product.name}
          </h1>
          {product.heroSubtitle && (
            <p className="mt-3 text-lg font-medium" style={{ color: product.accentColor }}>
              {product.heroSubtitle}
            </p>
          )}
          {product.heroDescription && (
            <p className="mt-4 text-ena-light max-w-2xl mx-auto leading-relaxed">{product.heroDescription}</p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={ctaHref} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noopener noreferrer" : undefined}>
              <Button>{product.ctaText || "Başla"}</Button>
            </Link>
            {product.monthlyPrice != null && (
              <span className="inline-flex items-center px-4 py-2 rounded-xl border border-ena-border text-sm text-ena-light">
                {product.monthlyPrice.toLocaleString("tr-TR")} ₺/ay
              </span>
            )}
            {product.yearlyPrice != null && (
              <span className="inline-flex items-center px-4 py-2 rounded-xl border border-ena-border text-sm text-ena-light">
                {product.yearlyPrice.toLocaleString("tr-TR")} ₺/yıl
              </span>
            )}
          </div>
        </div>
      </section>

      {product.features.length > 0 && (
        <section className="py-16 border-b border-ena-border">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-ena-text mb-8 text-center">
              {product.featuresSectionTitle || "Özellikler"}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.features.map((f, i) => (
                <div key={`${f.title}-${i}`} className="acc-card p-5">
                  {f.icon && (
                    <div className="mb-3" style={{ color: product.accentColor }}>
                      <ShowcaseIcon name={f.icon} size={22} />
                    </div>
                  )}
                  <h3 className="font-semibold text-ena-text">{f.title}</h3>
                  {f.description && <p className="text-sm text-ena-light mt-2">{f.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {product.gallery.length > 0 && (
        <section className="py-16 border-b border-ena-border">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-ena-text mb-8 text-center">
              {product.gallerySectionTitle || "Galeri"}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.gallery.map((item, i) => (
                <div key={`${item.url}-${i}`} className="acc-card overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.alt || ""} className="w-full h-48 object-cover" />
                  {item.alt && <p className="p-3 text-xs text-ena-light">{item.alt}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sortedPlans.length > 0 && (
        <section className="py-16 border-b border-ena-border">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-ena-text mb-8 text-center">
              {product.plansSectionTitle || "Paketler"}
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {sortedPlans.map((plan, planIndex) => (
                <div
                  key={plan.id}
                  className={`acc-card p-6 ${plan.highlighted ? "ring-2" : ""}`}
                  style={plan.highlighted ? { borderColor: product.accentColor } : undefined}
                >
                  <h3 className="text-lg font-bold text-ena-text">{plan.name}</h3>
                  {plan.description && <p className="text-sm text-ena-light mt-1">{plan.description}</p>}
                  {plan.monthlyPrice != null && (
                    <p className="text-2xl font-bold mt-4 text-ena-text">
                      {plan.monthlyPrice.toLocaleString("tr-TR")} ₺
                      <span className="text-sm font-normal text-ena-light">/ay</span>
                    </p>
                  )}
                  {plan.yearlyPrice != null && (
                    <p className="text-sm text-ena-light mt-1">
                      {plan.yearlyPrice.toLocaleString("tr-TR")} ₺/yıl
                    </p>
                  )}
                  <ul className="mt-4 space-y-2 text-sm text-ena-light">
                    {plan.features.map((feat) => (
                      <li key={feat}>• {feat}</li>
                    ))}
                  </ul>
                  {(plan.ctaUrl || product.slug === "thyronix" || product.slug === "hive") && (
                    <Link
                      href={resolvePlanCheckoutUrl(product.slug, plan, planIndex)}
                      className="block mt-6"
                      target={openInNewTab ? "_blank" : undefined}
                    >
                      <Button variant={plan.highlighted ? "primary" : "outline"} className="w-full">
                        {plan.ctaText || "Seç"}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeFaq.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold text-ena-text mb-8 text-center">
              {product.faqSectionTitle || "Sık Sorulan Sorular"}
            </h2>
            <div className="space-y-3">
              {activeFaq.map((item) => (
                <details key={item.id} className="acc-card p-4 group">
                  <summary className="font-medium text-ena-text cursor-pointer list-none flex justify-between">
                    {item.question}
                    <span className="text-ena-light group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-sm text-ena-light mt-3 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
