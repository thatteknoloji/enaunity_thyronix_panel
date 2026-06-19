"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HomeHeroDTO } from "@/lib/homepage/service";

type Props = {
  hero: HomeHeroDTO;
  t: (key: string) => string;
};

export function HomeHeroSection({ hero, t }: Props) {
  const badge = hero.useCustomHeroText && hero.heroBadge ? hero.heroBadge : t("home.hero_badge");
  const desc = hero.useCustomHeroText && hero.heroDescription ? hero.heroDescription : t("home.hero_desc");
  const cta1 = hero.useCustomHeroText && hero.heroCtaPrimaryLabel ? hero.heroCtaPrimaryLabel : t("home.browse_catalog");
  const cta2 = hero.useCustomHeroText && hero.heroCtaSecondaryLabel ? hero.heroCtaSecondaryLabel : t("home.open_b2b_account");
  const cta1Url = hero.heroCtaPrimaryUrl || "/catalog";
  const cta2Url = hero.heroCtaSecondaryUrl || "/auth/register";
  const poster = hero.heroPoster || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=85";

  return (
    <section className="relative h-[90vh] min-h-[650px] overflow-hidden bg-[#141414]">
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-[#141414]/50 z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent z-10" />
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      >
        <source src={hero.heroVideoDesktop} type="video/mp4" />
        <source src={hero.heroVideoMobile || hero.heroVideoDesktop} type="video/mp4" media="(max-width: 768px)" />
      </video>
      <div className="relative z-20 mx-auto max-w-7xl px-4 h-full flex items-center">
        <div className="w-full max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="flex items-center gap-2 text-ena-primary mb-4">
              <Building2 size={16} />
              <span className="text-xs font-semibold uppercase tracking-widest">{badge}</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }} className="text-5xl font-black tracking-tight md:text-7xl">
              <span style={{ color: "#e50914" }}>ENA</span>
              <span className="relative">UNITY<sup className="absolute -top-[0.15em] -right-[0.35em] text-[0.35em]">®</sup></span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }} className="mt-4 text-lg text-ena-light max-w-xl leading-relaxed">
              {desc}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="mt-8 flex flex-wrap gap-3">
              <Link href={cta1Url}>
                <Button size="lg" className="gap-2 font-semibold">
                  <Play size={18} fill="currentColor" />
                  {cta1}
                </Button>
              </Link>
              <Link href={cta2Url}>
                <Button variant="outline" size="lg" className="gap-2">
                  <Building2 size={18} />
                  {cta2}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
