import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Chrome,
  Cloud,
  Download,
  Layers,
  Share2,
  Smartphone,
  Sparkles,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { LinkSlashMarketingShell } from "@/components/linkslash/LinkSlashMarketingShell";
import {
  LINKSLASH_BRAND,
  LINKSLASH_FEATURES,
  LINKSLASH_FLOW,
  LINKSLASH_SOURCES,
  LINKSLASH_USE_CASES,
} from "@/lib/linkslash/brand";

export const metadata: Metadata = {
  title: "LinkSlash — Kişisel Link Kütüphanesi | ENAUNITY",
  description: LINKSLASH_BRAND.subtitle,
};

const FEATURE_ICONS = [Zap, Chrome, Smartphone, Cloud, Brain, Tag, Sparkles, Layers, Share2, Brain] as const;

export default function LinkSlashProductPage() {
  const { colors, routes, tagline, subtitle } = LINKSLASH_BRAND;

  return (
    <LinkSlashMarketingShell active="product">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${colors.primary}33, transparent)` }}
        />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: colors.primary }}>
            ENAUNITY Modülü · V1.0
          </p>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">{tagline}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">{subtitle}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href={routes.gateway}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              LinkSlash&apos;ı Başlat <ArrowRight size={16} />
            </Link>
            <Link
              href={routes.downloads}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold hover:bg-white/5"
            >
              <Download size={16} /> İndirme Merkezi
            </Link>
            <Link
              href={routes.checkout}
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
              style={{ borderColor: `${colors.accent}66`, color: colors.accent }}
            >
              Planları Gör
            </Link>
          </div>
        </div>
      </section>

      {/* Brand palette */}
      <section className="border-b border-white/10 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-white/50">Görsel Kimlik</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: "Primary", value: colors.primary },
              { label: "Accent", value: colors.accent },
              { label: "Dark", value: colors.dark },
            ].map((swatch) => (
              <div key={swatch.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="h-10 w-10 rounded-lg border border-white/20" style={{ backgroundColor: swatch.value }} />
                <div className="text-left">
                  <p className="text-xs text-white/50">{swatch.label}</p>
                  <p className="font-mono text-sm">{swatch.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-white/10 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Özellikler</h2>
          <p className="mb-10 text-center text-white/60">Tek platformda kayıt, senkron ve AI analiz</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LINKSLASH_FEATURES.map((f, i) => {
              const Icon = FEATURE_ICONS[i] || Zap;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border p-5 transition-colors hover:border-cyan-500/30"
                  style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                >
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${colors.primary}18` }}
                  >
                    <Icon size={20} style={{ color: colors.primary }} />
                  </div>
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="border-b border-white/10 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Desteklenen kaynaklar</h2>
          <p className="mb-10 text-center text-white/60">Paylaşım menüsü ve extension ile geniş platform desteği</p>
          <div className="flex flex-wrap justify-center gap-2">
            {LINKSLASH_SOURCES.map((src) => (
              <span
                key={src}
                className="rounded-full border px-3 py-1.5 text-sm text-white/80"
                style={{ borderColor: colors.cardBorder, backgroundColor: colors.cardBg }}
              >
                {src}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-white/10 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-10 text-3xl font-bold">Nasıl çalışır?</h2>
          <div
            className="rounded-2xl border p-8 font-mono text-sm leading-loose"
            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, color: colors.primary }}
          >
            {LINKSLASH_FLOW.map((step, i) => (
              <span key={step}>
                {step}
                {i < LINKSLASH_FLOW.length - 1 && (
                  <>
                    <br />
                    ↓<br />
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-b border-white/10 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Kullanım senaryoları</h2>
          <p className="mb-10 text-center text-white/60">Bireysel kullanım için optimize — ekip özellikleri yol haritasında</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {LINKSLASH_USE_CASES.map((u) => (
              <div
                key={u.title}
                className="rounded-2xl border p-5"
                style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
              >
                <h3 className="font-semibold" style={{ color: colors.primary }}>
                  {u.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{u.desc}</p>
              </div>
            ))}
          </div>
          <div
            className="mt-8 flex items-start gap-3 rounded-xl border p-4 text-sm text-white/70"
            style={{ borderColor: `${colors.accent}44`, backgroundColor: `${colors.accent}11` }}
          >
            <Users size={18} className="mt-0.5 shrink-0" style={{ color: colors.accent }} />
            <p>
              <strong className="text-white">Ekipler için:</strong> Team Workspace ve paylaşılabilir vault özellikleri sonraki fazlarda
              gelecek. Bu sprintte dağıtım ve bireysel kullanım paketi kilitlenmiştir.
            </p>
          </div>
        </div>
      </section>

      {/* AI connection */}
      <section className="border-b border-white/10 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-2 text-center text-3xl font-bold">Yapay zeka bağlantısı</h2>
          <p className="mb-10 text-center text-white/60">İki katmanlı AI — kişisel anahtarınız veya platform sağlayıcısı</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-6" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
              <h3 className="font-semibold text-lg" style={{ color: colors.primary }}>Kişisel AI (BYOK)</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                LinkSlash uygulamasında Ayarlar → Groq, DeepSeek veya Ollama API anahtarınızı girin.
                Kategorize, özet ve toplu AI bu anahtarlarla çalışır. Anahtarlar yalnızca cihazınızda saklanır.
              </p>
              <Link href={routes.gateway} className="mt-4 inline-block text-sm text-cyan-400 hover:underline">
                Uygulamayı aç → Ayarlar
              </Link>
            </div>
            <div className="rounded-2xl border p-6" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
              <h3 className="font-semibold text-lg" style={{ color: colors.accent }}>Sunucu AI Analyze</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                SEO brief, sosyal medya taslakları ve gelişmiş analiz platform AI sağlayıcısı ile çalışır.
                Lisanslı kullanıcılar ekstra anahtar girmeden AI Analyze butonunu kullanabilir (admin yapılandırması gerekir).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section className="py-16">
        <div
          className="mx-auto max-w-4xl rounded-3xl border px-6 py-12 text-center md:px-12"
          style={{
            borderColor: `${colors.primary}33`,
            background: `linear-gradient(135deg, ${colors.primary}11, ${colors.accent}11)`,
          }}
        >
          <h2 className="text-2xl font-bold md:text-3xl">Chrome Extension ve Android APK</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/65">
            Extension paketi, Android APK doğrulama durumu ve kurulum adımları indirme merkezinde.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={routes.downloads}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-black"
              style={{ backgroundColor: colors.primary }}
            >
              <Download size={16} /> İndirme Merkezi
            </Link>
            <Link href={routes.gateway} className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold hover:bg-white/5">
              Web uygulamasını aç
            </Link>
          </div>
        </div>
      </section>
    </LinkSlashMarketingShell>
  );
}
