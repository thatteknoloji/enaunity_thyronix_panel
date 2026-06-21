"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  Play,
  ChevronRight,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HomeHeroDTO, HomepageHeroDTO } from "@/lib/homepage/service";
import {
  getHeroFontClass,
  getHeroHeightClass,
  getHeroTitleSizeClass,
  type HeroTitleSegment,
} from "@/lib/homepage/hero-presets";

const ICON_MAP: Record<string, LucideIcon> = {
  Play,
  Building2,
  ChevronRight,
  ArrowRight,
};

type Props = {
  hero: HomeHeroDTO;
  builderHero?: HomepageHeroDTO | null;
  t: (key: string) => string;
};

function HeroTitle({
  segments,
  showTrademark,
  titleFont,
  titleSize,
}: {
  segments: HeroTitleSegment[];
  showTrademark: boolean;
  titleFont: string;
  titleSize: string;
}) {
  const sizeClass = getHeroTitleSizeClass(titleSize);
  const fontClass = getHeroFontClass(titleFont, "title");
  const lastIdx = segments.length - 1;

  return (
    <h1 className={`${sizeClass} ${fontClass} break-words`}>
      {segments.map((seg, i) => (
        <span key={i} style={{ color: seg.color || "#ffffff" }} className={i === lastIdx && showTrademark ? "relative" : undefined}>
          {seg.text}
          {i === lastIdx && showTrademark && (
            <sup className="absolute -top-[0.15em] -right-[0.35em] text-[0.35em]">®</sup>
          )}
        </span>
      ))}
    </h1>
  );
}

function DefaultTitle() {
  return (
    <HeroTitle
      segments={[
        { text: "ENA", color: "#e50914" },
        { text: "UNITY", color: "#ffffff" },
      ]}
      showTrademark
      titleFont="geist-black"
      titleSize="xl"
    />
  );
}

function HeroContent({
  eyebrowText,
  eyebrowColor,
  eyebrowFont,
  segments,
  showTrademark,
  titleFont,
  titleSize,
  subtitle,
  subtitleColor,
  subtitleFont,
  textAlign,
  buttons,
  fallbackCta,
  t,
}: {
  eyebrowText: string;
  eyebrowColor: string;
  eyebrowFont: string;
  segments: HeroTitleSegment[];
  showTrademark: boolean;
  titleFont: string;
  titleSize: string;
  subtitle: string;
  subtitleColor: string;
  subtitleFont: string;
  textAlign: string;
  buttons: HomepageHeroDTO["buttons"];
  fallbackCta: { primaryUrl: string; secondaryUrl: string };
  t: (key: string) => string;
}) {
  const alignClass = textAlign === "center" ? "text-center mx-auto items-center" : "text-left items-start";
  const activeButtons = buttons.filter((b) => b.isActive && b.label);

  return (
    <div className={`w-full max-w-2xl flex flex-col ${alignClass}`}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className={`flex items-center gap-2 mb-4 ${textAlign === "center" ? "justify-center" : ""}`}
          style={{ color: eyebrowColor || "#e50914" }}
        >
          <Building2 size={16} />
          <span className={`text-xs font-semibold uppercase tracking-widest ${getHeroFontClass(eyebrowFont, "body")}`}>
            {eyebrowText}
          </span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
          {segments.length > 0 ? (
            <HeroTitle segments={segments} showTrademark={showTrademark} titleFont={titleFont} titleSize={titleSize} />
          ) : (
            <DefaultTitle />
          )}
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className={`mt-4 text-lg max-w-xl leading-relaxed ${getHeroFontClass(subtitleFont, "body")} ${subtitleColor ? "" : "text-ena-light"}`}
          style={subtitleColor ? { color: subtitleColor } : undefined}
        >
          {subtitle}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className={`mt-8 flex flex-wrap gap-3 ${textAlign === "center" ? "justify-center" : ""}`}
        >
          {activeButtons.length > 0 ? (
            activeButtons.map((btn) => {
              const Icon = ICON_MAP[btn.icon] || Play;
              return (
                <Link key={btn.id} href={btn.href || "/"}>
                  <Button variant={btn.variant === "ghost" ? "ghost" : btn.variant === "secondary" ? "secondary" : "primary"} size="lg" className="gap-2">
                    <Icon size={18} fill={btn.icon === "Play" ? "currentColor" : undefined} />
                    {btn.label}
                  </Button>
                </Link>
              );
            })
          ) : (
            <>
              <Link href={fallbackCta.primaryUrl}>
                <Button size="lg" className="gap-2 font-semibold">
                  <Play size={18} fill="currentColor" />
                  {t("home.browse_catalog")}
                </Button>
              </Link>
              <Link href={fallbackCta.secondaryUrl}>
                <Button variant="outline" size="lg" className="gap-2">
                  <Building2 size={18} />
                  {t("home.open_b2b_account")}
                </Button>
              </Link>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export function HomeHeroSection({ hero, builderHero, t }: Props) {
  if (builderHero) {
    const overlay = Math.min(1, Math.max(0, builderHero.overlayOpacity ?? 0.5));
    const poster = hero.heroPoster || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=85";
    const desktopBg = builderHero.backgroundImageUrl || poster;
    const mobileBg = builderHero.backgroundImageMobileUrl || desktopBg;
    const heightClass = getHeroHeightClass(builderHero.heroHeight);
    const alignWrap = builderHero.textAlign === "center" ? "justify-center" : "";

    return (
      <section className={`relative overflow-hidden bg-ena-dark ${heightClass}`}>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-ena-dark via-ena-dark/70 to-ena-dark/50" style={{ opacity: overlay }} />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-ena-dark via-ena-dark/30 to-transparent" style={{ opacity: overlay }} />
        {builderHero.backgroundImageUrl || builderHero.backgroundImageMobileUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={desktopBg} alt="" className="absolute inset-0 hidden h-full w-full object-cover opacity-80 md:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mobileBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 md:hidden" />
          </>
        ) : (
          <video autoPlay muted loop playsInline preload="metadata" poster={poster} className="absolute inset-0 h-full w-full object-cover opacity-60">
            <source src={hero.heroVideoDesktop} type="video/mp4" />
            <source src={hero.heroVideoMobile || hero.heroVideoDesktop} type="video/mp4" media="(max-width: 768px)" />
          </video>
        )}
        <div className={`relative z-20 mx-auto max-w-7xl px-4 h-full flex items-center ${alignWrap}`}>
          <HeroContent
            eyebrowText={builderHero.eyebrowText || t("home.hero_badge")}
            eyebrowColor={builderHero.eyebrowColor}
            eyebrowFont={builderHero.eyebrowFont}
            segments={builderHero.titleSegments}
            showTrademark={builderHero.showTrademark}
            titleFont={builderHero.titleFont}
            titleSize={builderHero.titleSize}
            subtitle={builderHero.subtitle || t("home.hero_desc")}
            subtitleColor={builderHero.subtitleColor}
            subtitleFont={builderHero.subtitleFont}
            textAlign={builderHero.textAlign}
            buttons={builderHero.buttons}
            fallbackCta={{ primaryUrl: hero.heroCtaPrimaryUrl || "/catalog", secondaryUrl: hero.heroCtaSecondaryUrl || "/auth/register" }}
            t={t}
          />
        </div>
      </section>
    );
  }

  const badge = hero.useCustomHeroText && hero.heroBadge ? hero.heroBadge : t("home.hero_badge");
  const desc = hero.useCustomHeroText && hero.heroDescription ? hero.heroDescription : t("home.hero_desc");
  const cta1 = hero.useCustomHeroText && hero.heroCtaPrimaryLabel ? hero.heroCtaPrimaryLabel : t("home.browse_catalog");
  const cta2 = hero.useCustomHeroText && hero.heroCtaSecondaryLabel ? hero.heroCtaSecondaryLabel : t("home.open_b2b_account");
  const cta1Url = hero.heroCtaPrimaryUrl || "/catalog";
  const cta2Url = hero.heroCtaSecondaryUrl || "/auth/register";
  const poster = hero.heroPoster || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=85";

  return (
    <section className="relative min-h-[70vh] sm:min-h-[650px] h-[85vh] sm:h-[90vh] overflow-hidden bg-ena-dark">
      <div className="absolute inset-0 bg-gradient-to-r from-ena-dark via-ena-dark/70 to-ena-dark/50 z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-ena-dark via-ena-dark/30 to-transparent z-10" />
      <video autoPlay muted loop playsInline preload="metadata" poster={poster} className="absolute inset-0 h-full w-full object-cover opacity-60">
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
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
              <DefaultTitle />
            </motion.div>
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
