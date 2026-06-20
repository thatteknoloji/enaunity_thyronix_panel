const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "twitch.tv"];
const SOCIAL_HOSTS = ["x.com", "twitter.com", "instagram.com", "linkedin.com", "tiktok.com", "facebook.com"];
const ARTICLE_HOSTS = ["medium.com", "substack.com", "dev.to", "news.ycombinator.com"];
const PRODUCT_HINTS = ["/product", "/products/", "/p/", "/dp/", "/urun/", "trendyol.com", "hepsiburada.com", "amazon.", "n11.com"];

export type LinkSlashSourceType =
  | "tweet"
  | "video"
  | "article"
  | "product"
  | "social"
  | "github"
  | "other";

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function detectSourceType(url: string): LinkSlashSourceType {
  if (!url) return "other";
  let hostname = "";
  let pathname = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    pathname = parsed.pathname.toLowerCase();
  } catch {
    return "other";
  }

  if (hostname === "github.com" || hostname.endsWith(".github.com")) return "github";
  if (hostname === "x.com" || hostname === "twitter.com") return "tweet";
  if (VIDEO_HOSTS.some((h) => hostname === h || hostname.endsWith("." + h))) return "video";
  if (hostname === "reddit.com" || hostname.endsWith(".reddit.com")) {
    return pathname.includes("/comments/") ? "article" : "social";
  }
  if (ARTICLE_HOSTS.some((h) => hostname === h || hostname.endsWith("." + h))) return "article";
  if (SOCIAL_HOSTS.some((h) => hostname === h || hostname.endsWith("." + h))) return "social";
  if (PRODUCT_HINTS.some((hint) => url.toLowerCase().includes(hint))) return "product";

  return "other";
}

export function sourceTypeToCategory(sourceType: LinkSlashSourceType): string {
  switch (sourceType) {
    case "video":
    case "article":
      return "kutuphane";
    case "github":
      return "atolye";
    case "product":
      return "atolye";
    case "tweet":
    case "social":
      return "diger";
    default:
      return "diger";
  }
}

export function buildDefaultTags(sourceType: LinkSlashSourceType, domain: string, extra: string[] = []): string[] {
  const tags = new Set<string>([sourceType, domain].filter(Boolean));
  extra.forEach((t) => {
    const trimmed = t.trim().toLowerCase();
    if (trimmed) tags.add(trimmed);
  });
  return Array.from(tags).slice(0, 12);
}
