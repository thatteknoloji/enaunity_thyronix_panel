"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { resolveFooterIntro } from "@/lib/footer-intro";
import { openCookiePreferences } from "@/components/legal/CookieConsentBanner";

const footerCategories = ["Cam Tablo","Mdf Tablo","Halı","Kilim","Perde","Nevresim","Yastık Kılıfı","Minder","Puzzle","Hediyelik Ürünler"];

interface PageLink { id: string; title: string; slug: string; }

export default function Footer() {
  const { t } = useT();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [pages, setPages] = useState<PageLink[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/public/footer-settings").then(r => r.json()),
      fetch("/api/public/pages").then(r => r.json()),
    ]).then(([s, p]) => {
      if (s.success) setSettings(s.data);
      if (p.success) setPages(p.data);
    }).catch(() => {});
  }, []);

  const intro = resolveFooterIntro(settings);
  const helpPages = pages.filter((p) => p.slug !== "hakkimizda");
  const aboutPage = pages.find((p) => p.slug === "hakkimizda");

  return (
    <footer className="w-full max-w-full overflow-x-clip border-t border-ena-border bg-ena-dark">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black" style={{color:"#e50914"}}>ENA</span>
              <span className="text-xl font-light text-ena-text relative">UNITY<sup className="absolute -top-[0.15em] -right-[0.35em] text-[0.35em] font-light">®</sup></span>
            </div>
            <p className="mt-2 text-sm text-ena-light leading-relaxed max-w-xs line-clamp-4">{intro}</p>
            <Link
              href={aboutPage ? `/${aboutPage.slug}` : "/hakkimizda"}
              className="mt-3 inline-flex text-sm font-medium text-ena-primary hover:text-ena-text transition-colors"
            >
              Hakkımızda →
            </Link>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ena-light">{t("footer.categories")}</h3>
            <ul className="space-y-2 text-sm text-ena-light/70">
              {footerCategories.map(cat => <li key={cat}><Link href={`/products?category=${encodeURIComponent(cat)}`} className="hover:text-ena-text transition-colors">{cat}</Link></li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ena-light">{t("footer.help")}</h3>
            <ul className="space-y-2 text-sm text-ena-light/70">
              {aboutPage ? (
                <li><Link href={`/${aboutPage.slug}`} className="hover:text-ena-text transition-colors font-medium text-ena-primary/90">Hakkımızda</Link></li>
              ) : (
                <li><Link href="/hakkimizda" className="hover:text-ena-text transition-colors font-medium text-ena-primary/90">Hakkımızda</Link></li>
              )}
              <li><Link href="/is-ortakligi" className="hover:text-ena-text transition-colors text-ena-primary/80 font-medium">İş Ortaklığı</Link></li>
              <li><Link href="/contracts" className="hover:text-ena-text transition-colors">{t("common.contracts")}</Link></li>
              {helpPages.map((p) => (
                <li key={p.id}><Link href={`/${p.slug}`} className="hover:text-ena-text transition-colors">{p.title}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ena-light">{t("footer.follow_us")}</h3>
            <ul className="space-y-2 text-sm text-ena-light/70">
              {settings.instagram && <li><a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-ena-text transition-colors">Instagram</a></li>}
              {!settings.instagram && <li className="hover:text-ena-text cursor-pointer transition-colors">Instagram</li>}
              {settings.twitter && <li><a href={settings.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-ena-text transition-colors">X (Twitter)</a></li>}
              {!settings.twitter && <li className="hover:text-ena-text cursor-pointer transition-colors">X (Twitter)</li>}
              {settings.linkedin && <li><a href={settings.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-ena-text transition-colors">LinkedIn</a></li>}
              {!settings.linkedin && <li className="hover:text-ena-text cursor-pointer transition-colors">LinkedIn</li>}
              {settings.youtube && <li><a href={settings.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-ena-text transition-colors">YouTube</a></li>}
              {!settings.youtube && <li className="hover:text-ena-text cursor-pointer transition-colors">YouTube</li>}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-ena-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ena-light/50">
          <div className="shrink-0">
            <a
              href="https://etbis.ticaret.gov.tr/SiteSorgulama/SiteDogrulama?url=www.enaunity.com.tr"
              target="_blank"
              rel="noopener noreferrer"
              title="ETBİS'e Kayıtlı Site"
            >
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://etbis.ticaret.gov.tr/SiteSorgulama/SiteDogrulama?url=www.enaunity.com.tr"
                alt="ETBİS Karekod"
                className="w-[70px] h-[70px] sm:w-[60px] sm:h-[60px] border border-white/10 rounded p-0.5 bg-white/5"
              />
            </a>
          </div>
          <div className="text-center sm:text-right space-y-1">
            <p>
              © 2026 Enaunity®. {t("footer.rights") || "Tüm hakları saklıdır."}{" "}
              <button
                type="button"
                onClick={() => openCookiePreferences(true)}
                className="text-ena-primary/70 hover:text-ena-primary transition-colors underline-offset-2 hover:underline"
              >
                Çerez Tercihleri
              </button>
            </p>
            <p className="text-[10px] text-ena-light/40">
              Teknoloji altyapısı{" "}
              <a href="https://thatteknoloji.com" target="_blank" rel="noopener noreferrer" className="hover:text-ena-light/60 transition-colors">
                THAT Teknoloji
              </a>{" "}
              tarafından geliştirilmiştir.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
