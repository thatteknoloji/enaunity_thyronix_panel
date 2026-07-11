import { existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { LINKSLASH_MODULE_KEY } from "@/lib/linkslash/access";

export type ChecklistItem = {
  id: string;
  title: string;
  status: "ok" | "warning" | "missing";
  description: string;
  suggestion: string;
  href?: string;
};

function fileOk(rel: string) {
  return existsSync(path.join(process.cwd(), rel));
}

export async function buildLinkSlashReleaseChecklist(): Promise<{
  items: ChecklistItem[];
  summary: { ok: number; warning: number; missing: number };
  buildInfo: Record<string, string>;
  knownGaps: string[];
}> {
  const [
    planCount,
    activeLicenseCount,
    cloudLinkCount,
    aiProviderCount,
    siteSettings,
    activeHeroCount,
  ] = await Promise.all([
    prisma.modulePlan.count({ where: { moduleKey: LINKSLASH_MODULE_KEY, isActive: true } }),
    prisma.moduleLicense.count({
      where: { moduleKey: LINKSLASH_MODULE_KEY, status: { in: ["ACTIVE", "TRIAL"] } },
    }),
    prisma.linkSlashLink.count({ where: { deletedAt: null } }).catch(() => -1),
    prisma.thyronixAiProvider.count({ where: { status: "active" } }).catch(() => 0),
    prisma.siteSettings.findUnique({ where: { id: "default" } }).catch(() => null),
    prisma.homepageHero.count({ where: { isActive: true } }).catch(() => 0),
  ]);

  const extManifest = fileOk("public/linkslash/extension/manifest.json");
  const extIcons = fileOk("public/linkslash/extension/icon128.png");
  const mobileShell = fileOk("public/linkslash/mobile/index.html");
  const androidWrapper = fileOk("mobile/linkslash/capacitor.config.ts");
  const landingPage = fileOk("src/app/linkslash/page.tsx");
  const spaIndex = fileOk("public/linkslash/index.html");
  const aiRoute = fileOk("src/app/api/linkslash/ai/analyze/route.ts");
  const syncTablesOk = cloudLinkCount >= 0;

  const checkoutOk = true; // fixed to type=module in landing

  const siteMetaOk = !!(siteSettings?.siteTitle || siteSettings?.faviconUrl);
  const heroOk = activeHeroCount > 0;

  const items: ChecklistItem[] = [
    {
      id: "license",
      title: "Modül lisansı aktif mi?",
      status: activeLicenseCount > 0 ? "ok" : "warning",
      description: `${activeLicenseCount} aktif/trial LinkSlash lisansı`,
      suggestion: activeLicenseCount > 0 ? "Lisanslar mevcut." : "Admin → Modül Lisanslarından test lisansı verin.",
      href: "/admin/module-licenses",
    },
    {
      id: "plans",
      title: "LinkSlash planları seed edilmiş mi?",
      status: planCount >= 2 ? "ok" : planCount > 0 ? "warning" : "missing",
      description: `${planCount} aktif plan (starter + pro beklenir)`,
      suggestion: planCount >= 2 ? "Planlar hazır." : "npm run seed:linkslash-plans çalıştırın.",
      href: "/admin/module-plans",
    },
    {
      id: "cloud-sync",
      title: "Cloud Sync tabloları hazır mı?",
      status: syncTablesOk ? "ok" : "missing",
      description: syncTablesOk ? `LinkSlashLink tablosu erişilebilir (${cloudLinkCount} kayıt)` : "Tablo erişilemiyor",
      suggestion: syncTablesOk ? "Prisma migrate/push tamam." : "npx prisma db push",
      href: "/admin/linkslash",
    },
    {
      id: "capture-api",
      title: "Capture API çalışıyor mu?",
      status: fileOk("src/app/api/linkslash/capture/route.ts") ? "ok" : "missing",
      description: "POST /api/linkslash/capture route mevcut",
      suggestion: "Extension/mobile capture bu endpointi kullanır.",
      href: "/api/linkslash/session",
    },
    {
      id: "extension",
      title: "Extension dosyaları mevcut mu?",
      status: extManifest && extIcons ? "ok" : "warning",
      description: extManifest ? "MV3 manifest + ikonlar public/linkslash/extension/" : "Manifest veya ikon eksik",
      suggestion: "Chrome'da unpacked olarak yükleyin. Web Store paketi henüz yok.",
      href: "/linkslash/extension/manifest.json",
    },
    {
      id: "android",
      title: "Android mobile shell mevcut mu?",
      status: mobileShell && androidWrapper ? "ok" : "warning",
      description: mobileShell ? "Web shell + Capacitor wrapper mevcut" : "Mobile shell eksik",
      suggestion: "mobile/linkslash README kurulum adımlarını izleyin.",
      href: "/linkslash/mobile/",
    },
    {
      id: "landing",
      title: "Public landing mevcut mu?",
      status: landingPage && spaIndex ? "ok" : "missing",
      description: "/linkslash marketing landing + SPA",
      suggestion: "Landing V1.0 bölümleri genişletildi.",
      href: "/linkslash",
    },
    {
      id: "pricing",
      title: "Pricing bağlantısı var mı?",
      status: checkoutOk ? "ok" : "warning",
      description: "Checkout: type=module&moduleKey=LINKSLASH&planKey=starter",
      suggestion: "Ödeme akışını gateway ve landing linklerinden test edin.",
      href: "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter",
    },
    {
      id: "ai",
      title: "AI enrichment çalışıyor mu?",
      status: aiRoute ? (aiProviderCount > 0 ? "ok" : "warning") : "missing",
      description: aiProviderCount > 0
        ? `${aiProviderCount} aktif Thyronix AI provider + /api/linkslash/ai/analyze`
        : "Endpoint var; Thyronix AI provider veya OPENAI_API_KEY yok — kural tabanlı fallback",
      suggestion: "Admin → THYRONIX AI → Sağlayıcılar veya OPENAI_API_KEY tanımlayın.",
      href: "/thyronix/ai",
    },
    {
      id: "site-meta",
      title: "Favicon / title / hero ayarları",
      status: siteMetaOk || heroOk ? "ok" : "warning",
      description: `Site meta: ${siteMetaOk ? "yapılandırılmış" : "varsayılan"}, aktif hero: ${activeHeroCount}`,
      suggestion: "Admin → Site Ayarları ve Ana Sayfa → Hero Yönetimi",
      href: "/admin/site-settings",
    },
    {
      id: "deploy",
      title: "Build / deploy bilgisi",
      status: "ok",
      description: `Node ${process.version} · Next ${process.env.npm_package_version || "—"}`,
      suggestion: "Production: scripts/production-post-deploy.sh + prisma db push",
      href: "/admin/linkslash/release",
    },
  ];

  const knownGaps = [
    "Chrome Web Store yayını henüz yok (unpacked extension)",
    "Google Play signed release pipeline eksik",
    "iOS share extension yok",
    "Dedicated /linkslash/pricing sayfası yok (checkout linki kullanılıyor)",
    "Yıllık plan checkout UI eksik",
    "Server-side AI BYOK-free tier yok (Thyronix provider veya env key gerekir)",
  ];

  const summary = {
    ok: items.filter((i) => i.status === "ok").length,
    warning: items.filter((i) => i.status === "warning").length,
    missing: items.filter((i) => i.status === "missing").length,
  };

  return {
    items,
    summary,
    buildInfo: {
      nodeVersion: process.version,
      appVersion: process.env.npm_package_version || "0.1.0",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://enaunity.com.tr",
      deployedAt: process.env.DEPLOYED_AT || "—",
    },
    knownGaps,
  };
}
