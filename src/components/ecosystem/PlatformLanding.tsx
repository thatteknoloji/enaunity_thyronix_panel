"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlatformContent } from "@/lib/ecosystem/platform-content";
import { ShowcaseIcon, hexToRgb } from "./ShowcaseIcon";
import { resolvePlanCheckoutUrl } from "@/lib/ecosystem/plan-urls";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

function FlowDiagram({ steps, rgb }: { steps: string[]; rgb: { r: number; g: number; b: number } }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-0">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div
            className="px-4 py-2.5 rounded-xl border text-sm font-semibold text-ena-text whitespace-nowrap"
            style={{
              backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
              borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
            }}
          >
            {step}
          </div>
          {i < steps.length - 1 && (
            <ChevronDown size={16} className="mx-1 md:mx-2 rotate-[-90deg] text-ena-light/40 shrink-0 hidden sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}

export function PlatformLanding({ content }: { content: PlatformContent }) {
  const rgb = hexToRgb(content.themeColor);
  const activeFaq = content.faq.filter((f) => f.active);
  const sortedPlans = [...content.plans].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="bg-ena-dark min-h-screen text-ena-text">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ena-border">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(${rgb.r},${rgb.g},${rgb.b},0.18), transparent)`,
          }}
        />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent,rgba(var(--ena-dark-rgb,20,20,20),0.4))]" />

        <div className="relative mx-auto max-w-5xl px-4 pt-24 pb-20 md:pt-32 md:pb-28 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <div
              className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl mb-8 border"
              style={{
                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
                borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
                color: content.accentColor,
                boxShadow: `0 0 40px rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`,
              }}
            >
              <ShowcaseIcon name={content.icon} size={36} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: content.accentColor }}>
              {content.hero.subtitle}
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-ena-text whitespace-pre-line leading-[1.1]">
              {content.hero.title}
            </h1>
            <p className="mt-6 text-base md:text-lg text-ena-light max-w-2xl mx-auto leading-relaxed">
              {content.hero.description}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href={content.cta.primaryUrl}>
                <Button size="lg" className="group">
                  {content.cta.primaryText}
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              {content.cta.secondaryUrl && (
                <Link href={content.cta.secondaryUrl}>
                  <Button variant="outline" size="lg">
                    {content.cta.secondaryText}
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {content.slug === "linkslash" && (
        <section className="border-b border-ena-border py-12">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-xl font-bold text-ena-text mb-2">İndirmeler</h2>
            <p className="text-sm text-ena-light mb-6">Chrome eklentisi, Android APK ve PWA — lisanslı bayiler için.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/linkslash/downloads">
                <Button variant="outline" size="lg">İndirme Merkezi</Button>
              </Link>
              <Link href="/gateway/linkslash">
                <Button size="lg">LinkSlash&apos;a Giriş</Button>
              </Link>
            </div>
          </div>
        </section>
      )}
      {content.stats.length > 0 && (
        <section className="border-b border-ena-border py-12">
          <div className="mx-auto max-w-4xl px-4 grid grid-cols-3 gap-6 text-center">
            {content.stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <p className="text-3xl md:text-4xl font-black" style={{ color: content.accentColor }}>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs md:text-sm text-ena-light mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Problems */}
      <section className="py-20 border-b border-ena-border">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-ena-text">Sorunlar</h2>
            <p className="mt-2 text-ena-light">Operasyonel darboğazlar büyümeyi yavaşlatıyor.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {content.problems.map((p, i) => (
              <motion.div
                key={p.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.08 }}
                className="acc-card p-6"
              >
                <h3 className="font-semibold text-ena-text">{p.title}</h3>
                <p className="text-sm text-ena-light mt-2 leading-relaxed">{p.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 border-b border-ena-border">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <span className="text-xs font-semibold uppercase tracking-widest text-ena-light">Çözüm</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-ena-text">{content.solution.title}</h2>
            <p className="mt-4 text-ena-light leading-relaxed">{content.solution.description}</p>
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 border-b border-ena-border">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-ena-text">Özellikler</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {content.features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.06 }}
                className="group acc-card p-6 hover:-translate-y-1 transition-transform duration-300"
                style={{ borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` }}
              >
                {f.icon && (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border"
                    style={{
                      backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
                      borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
                      color: content.accentColor,
                    }}
                  >
                    <ShowcaseIcon name={f.icon} size={20} />
                  </div>
                )}
                <h3 className="font-semibold text-ena-text">{f.title}</h3>
                <p className="text-sm text-ena-light mt-2 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="py-20 border-b border-ena-border">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-ena-text">{content.flow.label}</h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <FlowDiagram steps={content.flow.steps} rgb={rgb} />
          </motion.div>
        </div>
      </section>

      {/* Extra sections */}
      {content.sections.map((section) => (
        <section key={section.id} className="py-20 border-b border-ena-border">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-ena-text">{section.title}</h2>
              {section.description && <p className="mt-2 text-ena-light max-w-2xl">{section.description}</p>}
            </motion.div>
            {section.items && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    transition={{ delay: i * 0.06 }}
                    className="acc-card p-5"
                  >
                    <h3 className="font-semibold text-ena-text">{item.title}</h3>
                    <p className="text-sm text-ena-light mt-2">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}

      {/* Plans */}
      <section id="plans" className="py-20 border-b border-ena-border scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-ena-text">Paketler</h2>
            <p className="mt-2 text-ena-light">İhtiyacınıza uygun ölçekte başlayın.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {sortedPlans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className={`acc-card p-7 flex flex-col ${plan.highlighted ? "ring-2 -translate-y-1" : ""}`}
                style={plan.highlighted ? { borderColor: content.accentColor, boxShadow: `0 20px 40px rgba(${rgb.r},${rgb.g},${rgb.b},0.12)` } : undefined}
              >
                {plan.highlighted && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider mb-3 self-start px-2 py-1 rounded-full"
                    style={{ backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`, color: content.accentColor }}
                  >
                    Popüler
                  </span>
                )}
                <h3 className="text-xl font-bold text-ena-text">{plan.name}</h3>
                {plan.description && <p className="text-sm text-ena-light mt-1">{plan.description}</p>}
                <div className="mt-5 mb-6">
                  {plan.monthlyPrice != null && plan.monthlyPrice > 0 ? (
                    <p className="text-3xl font-black text-ena-text">
                      {plan.monthlyPrice.toLocaleString("tr-TR")} ₺
                      <span className="text-sm font-normal text-ena-light">/ay</span>
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-ena-text">Özel Fiyat</p>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-ena-light flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <span style={{ color: content.accentColor }}>✓</span> {feat}
                    </li>
                  ))}
                </ul>
                {plan.ctaUrl && (
                  <Link href={resolvePlanCheckoutUrl(content.slug, plan, i)} className="block mt-6">
                    <Button variant={plan.highlighted ? "primary" : "outline"} className="w-full group">
                      {plan.ctaText || "Seç"}
                      <ArrowRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-b border-ena-border">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-ena-text">Sık Sorulan Sorular</h2>
          </motion.div>
          <div className="space-y-3">
            {activeFaq.map((item, i) => (
              <motion.div
                key={item.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
              >
                <details className="acc-card p-5 group">
                  <summary className="font-medium text-ena-text cursor-pointer list-none flex justify-between gap-4">
                    {item.question}
                    <span className="text-ena-light group-open:rotate-45 transition-transform shrink-0">+</span>
                  </summary>
                  <p className="text-sm text-ena-light mt-3 leading-relaxed">{item.answer}</p>
                </details>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="acc-card p-10 md:p-14 relative overflow-hidden"
            style={{
              borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
              background: `linear-gradient(135deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.08), transparent)`,
            }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-ena-text">{content.cta.title}</h2>
            <p className="mt-3 text-ena-light">{content.cta.description}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={content.cta.primaryUrl}>
                <Button size="lg" className="group">
                  {content.cta.primaryText}
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              {content.cta.secondaryUrl && (
                <Link href={content.cta.secondaryUrl}>
                  <Button variant="outline" size="lg">{content.cta.secondaryText}</Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
