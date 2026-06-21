import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { APPEARANCE_BLOCKING_SCRIPT } from "@/lib/theme/appearance-script";
import { I18nProvider } from "@/lib/i18n/provider";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import Analytics from "@/components/Analytics";
import PwaRegister from "@/components/PwaRegister";
import { getSiteSettings } from "@/lib/site-settings/service";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://enaunity.com";
const gaId = process.env.NEXT_PUBLIC_GA_ID || "";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const openGraph: Metadata["openGraph"] = {
    type: "website",
    url: siteUrl,
    title: settings.resolvedSiteTitle,
    description: settings.resolvedMetaDescription,
    siteName: settings.resolvedOgSiteName,
    locale: "tr_TR",
  };

  if (settings.resolvedOgImageUrl) {
    openGraph.images = [{ url: settings.resolvedOgImageUrl }];
  }

  return {
    metadataBase: new URL(siteUrl),
    manifest: "/manifest.json",
    title: {
      default: settings.resolvedSiteTitle,
      template: settings.resolvedTitleTemplate,
    },
    description: settings.resolvedMetaDescription,
    keywords: ["toptan", "B2B", "B4B", "kurumsal", "alışveriş", "cam tablo", "halı", "perde", "nevresim", "toptan satış"],
    authors: [{ name: "Enaunity" }],
    creator: "Enaunity",
    publisher: "Enaunity",
    robots: { index: true, follow: true },
    icons: {
      icon: settings.resolvedFaviconUrl,
      shortcut: settings.resolvedFaviconUrl,
    },
    openGraph,
    twitter: {
      card: settings.resolvedOgImageUrl ? "summary_large_image" : "summary",
      title: settings.resolvedSiteTitle,
      description: settings.resolvedMetaDescription,
      ...(settings.resolvedOgImageUrl ? { images: [settings.resolvedOgImageUrl] } : {}),
    },
    verification: {
      google: process.env.GOOGLE_VERIFICATION || "",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <html lang="tr" data-theme="dark" data-accent="orange" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BLOCKING_SCRIPT }} />
        {gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`,
              }}
            />
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: settings.resolvedOgSiteName,
              url: siteUrl,
              description: "B4B Toptan Alışveriş Platformu",
              contactPoint: { "@type": "ContactPoint", contactType: "customer service" },
              sameAs: ["https://instagram.com/enaunity", "https://linkedin.com/company/enaunity"],
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen min-w-0 max-w-full flex-col overflow-x-clip font-sans antialiased bg-ena-dark text-ena-text`}>
        <ThemeProvider>
          <I18nProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="bottom-right" toastOptions={{ style: { background: "#303030", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" } }} />
          </I18nProvider>
        </ThemeProvider>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <PwaRegister />
      </body>
    </html>
  );
}
