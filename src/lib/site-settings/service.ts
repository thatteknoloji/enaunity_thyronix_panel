import { prisma } from "@/lib/db";
import {
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_FAVICON,
  DEFAULT_KEYWORDS,
  DEFAULT_LOCALE,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_OG_SITE_NAME,
  DEFAULT_NOT_FOUND_BODY,
  DEFAULT_NOT_FOUND_FOOTER_NOTE,
  DEFAULT_NOT_FOUND_HINT,
  DEFAULT_NOT_FOUND_SEARCH_PLACEHOLDER,
  DEFAULT_NOT_FOUND_SUBTITLE,
  DEFAULT_NOT_FOUND_TITLE,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_SITE_TITLE,
  DEFAULT_SITE_TITLE_TEMPLATE,
  DEFAULT_THEME_COLOR,
} from "./defaults";
import {
  parseNotFoundQuickLinks,
  parseNotFoundRedirectRules,
  type NotFoundQuickLink,
  type NotFoundRedirectRule,
} from "./not-found";

export type SiteSettingsDTO = {
  faviconUrl: string;
  siteTitle: string;
  defaultMetaDescription: string;
  ogImageUrl: string;
  ogSiteName: string;
  titleTemplate: string;
  themeColor: string;
  brandPrimaryColor: string;
  defaultKeywords: string;
  appleTouchIconUrl: string;
  organizationName: string;
  supportEmail: string;
  robotsNoIndex: boolean;
  twitterHandle: string;
  locale: string;
  copyrightText: string;
  notFoundTitle: string;
  notFoundSubtitle: string;
  notFoundBody: string;
  notFoundHint: string;
  notFoundSearchPlaceholder: string;
  notFoundFooterNote: string;
  notFoundQuickLinksJson: string;
  notFoundRedirectRulesJson: string;
  updatedAt: string;
};

export type ResolvedSiteSettings = SiteSettingsDTO & {
  resolvedFaviconUrl: string;
  resolvedSiteTitle: string;
  resolvedMetaDescription: string;
  resolvedOgImageUrl: string;
  resolvedOgSiteName: string;
  resolvedTitleTemplate: string;
  resolvedThemeColor: string;
  resolvedBrandPrimaryColor: string;
  resolvedKeywords: string[];
  resolvedAppleTouchIconUrl: string;
  resolvedOrganizationName: string;
  resolvedLocale: string;
  resolvedLang: string;
  resolvedNotFoundTitle: string;
  resolvedNotFoundSubtitle: string;
  resolvedNotFoundBody: string;
  resolvedNotFoundHint: string;
  resolvedNotFoundSearchPlaceholder: string;
  resolvedNotFoundFooterNote: string;
  resolvedNotFoundQuickLinks: NotFoundQuickLink[];
  resolvedNotFoundRedirectRules: NotFoundRedirectRule[];
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

function parseKeywords(raw: string): string[] {
  if (!raw.trim()) return DEFAULT_KEYWORDS;
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

function mapRow(row: Awaited<ReturnType<typeof prisma.siteSettings.findUnique>>): SiteSettingsDTO {
  const updatedAt = row?.updatedAt ?? new Date(0);
  return {
    faviconUrl: row?.faviconUrl?.trim() || "",
    siteTitle: row?.siteTitle?.trim() || "",
    defaultMetaDescription: row?.defaultMetaDescription?.trim() || "",
    ogImageUrl: row?.ogImageUrl?.trim() || "",
    ogSiteName: row?.ogSiteName?.trim() || "",
    titleTemplate: row?.titleTemplate?.trim() || "",
    themeColor: row?.themeColor?.trim() || "",
    brandPrimaryColor: row?.brandPrimaryColor?.trim() || "",
    defaultKeywords: row?.defaultKeywords?.trim() || "",
    appleTouchIconUrl: row?.appleTouchIconUrl?.trim() || "",
    organizationName: row?.organizationName?.trim() || "",
    supportEmail: row?.supportEmail?.trim() || "",
    robotsNoIndex: row?.robotsNoIndex ?? false,
    twitterHandle: row?.twitterHandle?.trim() || "",
    locale: row?.locale?.trim() || "",
    copyrightText: row?.copyrightText?.trim() || "",
    notFoundTitle: row?.notFoundTitle?.trim() || "",
    notFoundSubtitle: row?.notFoundSubtitle?.trim() || "",
    notFoundBody: row?.notFoundBody?.trim() || "",
    notFoundHint: row?.notFoundHint?.trim() || "",
    notFoundSearchPlaceholder: row?.notFoundSearchPlaceholder?.trim() || "",
    notFoundFooterNote: row?.notFoundFooterNote?.trim() || "",
    notFoundQuickLinksJson: row?.notFoundQuickLinksJson?.trim() || "[]",
    notFoundRedirectRulesJson: row?.notFoundRedirectRulesJson?.trim() || "[]",
    updatedAt: updatedAt.toISOString(),
  };
}

export async function getSiteSettings(): Promise<ResolvedSiteSettings> {
  const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const base = mapRow(row);
  const updatedAt = base.updatedAt;

  const resolvedSiteTitle = base.siteTitle || DEFAULT_SITE_TITLE;
  const resolvedTitleTemplate = base.titleTemplate || (base.siteTitle
    ? `%s | ${base.siteTitle.replace(/\s*®?\s*-.*$/, "").trim() || "Enaunity"}`
    : DEFAULT_SITE_TITLE_TEMPLATE);

  const locale = base.locale || DEFAULT_LOCALE;
  const lang = locale.split("_")[0] || "tr";

  return {
    ...base,
    resolvedFaviconUrl: withCacheVersion(base.faviconUrl || DEFAULT_FAVICON, updatedAt),
    resolvedSiteTitle,
    resolvedMetaDescription: base.defaultMetaDescription || DEFAULT_META_DESCRIPTION,
    resolvedOgImageUrl: base.ogImageUrl ? withCacheVersion(base.ogImageUrl, updatedAt) : "",
    resolvedOgSiteName: base.ogSiteName || base.siteTitle.split(" - ")[0]?.trim() || DEFAULT_OG_SITE_NAME,
    resolvedTitleTemplate,
    resolvedThemeColor: base.themeColor || DEFAULT_THEME_COLOR,
    resolvedBrandPrimaryColor: base.brandPrimaryColor || DEFAULT_BRAND_PRIMARY,
    resolvedKeywords: parseKeywords(base.defaultKeywords),
    resolvedAppleTouchIconUrl: base.appleTouchIconUrl
      ? withCacheVersion(base.appleTouchIconUrl, updatedAt)
      : withCacheVersion(DEFAULT_FAVICON, updatedAt),
    resolvedOrganizationName: base.organizationName || DEFAULT_ORGANIZATION_NAME,
    resolvedLocale: locale,
    resolvedLang: lang,
    resolvedNotFoundTitle: base.notFoundTitle || DEFAULT_NOT_FOUND_TITLE,
    resolvedNotFoundSubtitle: base.notFoundSubtitle || DEFAULT_NOT_FOUND_SUBTITLE,
    resolvedNotFoundBody: base.notFoundBody || DEFAULT_NOT_FOUND_BODY,
    resolvedNotFoundHint: base.notFoundHint || DEFAULT_NOT_FOUND_HINT,
    resolvedNotFoundSearchPlaceholder:
      base.notFoundSearchPlaceholder || DEFAULT_NOT_FOUND_SEARCH_PLACEHOLDER,
    resolvedNotFoundFooterNote: base.notFoundFooterNote || DEFAULT_NOT_FOUND_FOOTER_NOTE,
    resolvedNotFoundQuickLinks: parseNotFoundQuickLinks(base.notFoundQuickLinksJson, []),
    resolvedNotFoundRedirectRules: parseNotFoundRedirectRules(base.notFoundRedirectRulesJson, []),
  };
}

export async function updateSiteSettings(input: Partial<SiteSettingsDTO>): Promise<SiteSettingsDTO> {
  const data: Record<string, unknown> = {};
  if (input.faviconUrl !== undefined) data.faviconUrl = stripVersion(input.faviconUrl.trim());
  if (input.siteTitle !== undefined) data.siteTitle = input.siteTitle.trim();
  if (input.defaultMetaDescription !== undefined) data.defaultMetaDescription = input.defaultMetaDescription.trim();
  if (input.ogImageUrl !== undefined) data.ogImageUrl = stripVersion(input.ogImageUrl.trim());
  if (input.ogSiteName !== undefined) data.ogSiteName = input.ogSiteName.trim();
  if (input.titleTemplate !== undefined) data.titleTemplate = input.titleTemplate.trim();
  if (input.themeColor !== undefined) data.themeColor = input.themeColor.trim();
  if (input.brandPrimaryColor !== undefined) data.brandPrimaryColor = input.brandPrimaryColor.trim();
  if (input.defaultKeywords !== undefined) data.defaultKeywords = input.defaultKeywords.trim();
  if (input.appleTouchIconUrl !== undefined) data.appleTouchIconUrl = stripVersion(input.appleTouchIconUrl.trim());
  if (input.organizationName !== undefined) data.organizationName = input.organizationName.trim();
  if (input.supportEmail !== undefined) data.supportEmail = input.supportEmail.trim();
  if (input.robotsNoIndex !== undefined) data.robotsNoIndex = !!input.robotsNoIndex;
  if (input.twitterHandle !== undefined) data.twitterHandle = input.twitterHandle.trim().replace(/^@/, "");
  if (input.locale !== undefined) data.locale = input.locale.trim();
  if (input.copyrightText !== undefined) data.copyrightText = input.copyrightText.trim();
  if (input.notFoundTitle !== undefined) data.notFoundTitle = input.notFoundTitle.trim();
  if (input.notFoundSubtitle !== undefined) data.notFoundSubtitle = input.notFoundSubtitle.trim();
  if (input.notFoundBody !== undefined) data.notFoundBody = input.notFoundBody.trim();
  if (input.notFoundHint !== undefined) data.notFoundHint = input.notFoundHint.trim();
  if (input.notFoundSearchPlaceholder !== undefined)
    data.notFoundSearchPlaceholder = input.notFoundSearchPlaceholder.trim();
  if (input.notFoundFooterNote !== undefined) data.notFoundFooterNote = input.notFoundFooterNote.trim();
  if (input.notFoundQuickLinksJson !== undefined)
    data.notFoundQuickLinksJson = input.notFoundQuickLinksJson.trim();
  if (input.notFoundRedirectRulesJson !== undefined)
    data.notFoundRedirectRulesJson = input.notFoundRedirectRulesJson.trim();

  const row = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  return mapRow(row);
}
