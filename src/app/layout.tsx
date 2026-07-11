import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings();
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: settings.resolvedThemeColor,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const openGraph: Metadata["openGraph"] = {
    type: "website",
    url: siteUrl,
    title: settings.resolvedSiteTitle,
    description: settings.resolvedMetaDescription,
    siteName: settings.resolvedOgSiteName,
    locale: settings.resolvedLocale.replace("-", "_"),
  };

  if (settings.resolvedOgImageUrl) {
    openGraph.images = [{ url: settings.resolvedOgImageUrl }];
  }

  const icons: Metadata["icons"] = {
    icon: settings.resolvedFaviconUrl,
    shortcut: settings.resolvedFaviconUrl,
    apple: settings.resolvedAppleTouchIconUrl,
  };

  return {
    metadataBase: new URL(siteUrl),
    manifest: "/manifest.json",
    title: {
      default: settings.resolvedSiteTitle,
      template: settings.resolvedTitleTemplate,
    },
    description: settings.resolvedMetaDescription,
    keywords: settings.resolvedKeywords,
    authors: [{ name: settings.resolvedOrganizationName }],
    creator: settings.resolvedOrganizationName,
    publisher: settings.resolvedOrganizationName,
    robots: settings.robotsNoIndex ? { index: false, follow: false } : { index: true, follow: true },
    icons,
    openGraph,
    twitter: {
      card: settings.resolvedOgImageUrl ? "summary_large_image" : "summary",
      title: settings.resolvedSiteTitle,
      description: settings.resolvedMetaDescription,
      ...(settings.twitterHandle ? { site: `@${settings.twitterHandle}`, creator: `@${settings.twitterHandle}` } : {}),
      ...(settings.resolvedOgImageUrl ? { images: [settings.resolvedOgImageUrl] } : {}),
    },
    verification: {
      google: process.env.GOOGLE_VERIFICATION || "",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const brandStyle = settings.resolvedBrandPrimaryColor
    ? { ["--color-ena-primary" as string]: settings.resolvedBrandPrimaryColor, ["--color-ena-btn" as string]: settings.resolvedBrandPrimaryColor }
    : undefined;

  return (
    <html lang={settings.resolvedLang} data-theme="dark" data-accent="orange" suppressHydrationWarning style={brandStyle}>
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
              name: settings.resolvedOrganizationName,
              url: siteUrl,
              description: settings.resolvedMetaDescription,
              ...(settings.supportEmail
                ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: settings.supportEmail } }
                : { contactPoint: { "@type": "ContactPoint", contactType: "customer service" } }),
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
