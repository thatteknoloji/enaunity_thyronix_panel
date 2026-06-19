"use client";

import { motion } from "framer-motion";
import { MARKETPLACE_PARTNERS } from "@/lib/marketplace/partner-logos";

export function MarketplacePartnersSection() {
  const marqueeItems = [...MARKETPLACE_PARTNERS, ...MARKETPLACE_PARTNERS];

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="border-t border-ena-border py-16 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 mb-10">
        <div className="text-center">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-ena-primary mb-3">
            MARKETPLACE NETWORK
          </span>
          <h2 className="text-2xl font-black text-ena-text">İş Ortaklarımız</h2>
          <p className="mt-1.5 text-sm text-ena-light">İşletmenizi Büyütün</p>
          <p className="mt-0.5 text-xs text-ena-light/60">
            Kurumsal fiyatlar ve özel tedarik koşulları için hemen iletişime geçin.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-24 bg-gradient-to-r from-ena-dark to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-24 bg-gradient-to-l from-ena-dark to-transparent"
          aria-hidden
        />
        <div className="flex w-max items-center gap-12 sm:gap-16 animate-marquee [--marquee-speed:50s] hover:[animation-play-state:paused]">
          {marqueeItems.map((partner, i) => (
            <div
              key={`${partner.name}-${i}`}
              className="flex shrink-0 items-center justify-center h-16 w-36 sm:w-40"
              title={partner.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={partner.logo}
                alt={partner.name}
                width={128}
                height={128}
                loading={i < 8 ? "eager" : "lazy"}
                className="max-h-12 sm:max-h-14 w-auto max-w-full object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
