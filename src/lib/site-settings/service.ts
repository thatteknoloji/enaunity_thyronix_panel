import { prisma } from "@/lib/db";
import {
  DEFAULT_FAVICON,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_OG_SITE_NAME,
  DEFAULT_SITE_TITLE,
  DEFAULT_SITE_TITLE_TEMPLATE,
} from "./defaults";

export type SiteSettingsDTO = {
  faviconUrl: string;
  siteTitle: string;
  defaultMetaDescription: string;
  ogImageUrl: string;
  updatedAt: string;
};

export type ResolvedSiteSettings = SiteSettingsDTO & {
  resolvedFaviconUrl: string;
  resolvedSiteTitle: string;
  resolvedMetaDescription: string;
  resolvedOgImageUrl: string;
  resolvedOgSiteName: string;
  resolvedTitleTemplate: string;
};

export function withCacheVersion(url: string, updatedAt: Date | string): string {
  if (!url) return url;
  const v = typeof updatedAt === "string" ? new Date(updatedAt).getTime() : updatedAt.getTime();
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${v}`;
}

function stripVersion(url: string): string {
  return url.split("?")[0] || url;
}

export async function getSiteSettings(): Promise<ResolvedSiteSettings> {
  const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const updatedAt = row?.updatedAt ?? new Date(0);

  const faviconUrl = row?.faviconUrl?.trim() || "";
  const siteTitle = row?.siteTitle?.trim() || "";
  const defaultMetaDescription = row?.defaultMetaDescription?.trim() || "";
  const ogImageUrl = row?.ogImageUrl?.trim() || "";

  const resolvedFavicon = faviconUrl || DEFAULT_FAVICON;
  const resolvedSiteTitle = siteTitle || DEFAULT_SITE_TITLE;
  const resolvedMetaDescription = defaultMetaDescription || DEFAULT_META_DESCRIPTION;
  const resolvedTitleTemplate = siteTitle
    ? `%s | ${siteTitle.replace(/\s*®?\s*-.*$/, "").trim() || "Enaunity"}`
    : DEFAULT_SITE_TITLE_TEMPLATE;

  return {
    faviconUrl,
    siteTitle,
    defaultMetaDescription,
    ogImageUrl,
    updatedAt: updatedAt.toISOString(),
    resolvedFaviconUrl: withCacheVersion(resolvedFavicon, updatedAt),
    resolvedSiteTitle,
    resolvedMetaDescription,
    resolvedOgImageUrl: ogImageUrl ? withCacheVersion(ogImageUrl, updatedAt) : "",
    resolvedOgSiteName: siteTitle ? siteTitle.split(" - ")[0]?.trim() || DEFAULT_OG_SITE_NAME : DEFAULT_OG_SITE_NAME,
    resolvedTitleTemplate,
  };
}

export async function updateSiteSettings(input: Partial<SiteSettingsDTO>): Promise<SiteSettingsDTO> {
  const data: Record<string, string> = {};
  if (input.faviconUrl !== undefined) data.faviconUrl = stripVersion(input.faviconUrl.trim());
  if (input.siteTitle !== undefined) data.siteTitle = input.siteTitle.trim();
  if (input.defaultMetaDescription !== undefined) data.defaultMetaDescription = input.defaultMetaDescription.trim();
  if (input.ogImageUrl !== undefined) data.ogImageUrl = stripVersion(input.ogImageUrl.trim());

  const row = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  return {
    faviconUrl: row.faviconUrl,
    siteTitle: row.siteTitle,
    defaultMetaDescription: row.defaultMetaDescription,
    ogImageUrl: row.ogImageUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}
