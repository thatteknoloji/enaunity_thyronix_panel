/**
 * Granular mobile share source detection for LinkSlash capture.
 */
export type MobileSourceType =
  | "instagram_post"
  | "instagram_reel"
  | "threads_post"
  | "tweet"
  | "reddit_post"
  | "youtube_video"
  | "youtube_shorts"
  | "linkedin_post"
  | "facebook_post"
  | "tiktok_video"
  | "github_repo"
  | "article"
  | "google_doc"
  | "notion_page"
  | "pdf"
  | "whatsapp"
  | "telegram"
  | "web"
  | "video"
  | "social"
  | "product"
  | "github"
  | "other";

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX) || [];
  return [...new Set(matches.map((u) => u.replace(/[.,;:!?)]+$/, "")))];
}

export function extractPrimaryUrl(text: string, html?: string): string {
  const fromText = extractUrlsFromText(text);
  if (fromText.length) return fromText[0];

  if (html) {
    const hrefMatch = html.match(/href=["'](https?:\/\/[^"']+)["']/i);
    if (hrefMatch?.[1]) return hrefMatch[1];
    const fromHtml = extractUrlsFromText(html);
    if (fromHtml.length) return fromHtml[0];
  }

  const trimmed = (text || "").trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed.split(/\s/)[0];
  return "";
}

export function detectMobileSourceType(url: string, sharedFrom = ""): MobileSourceType {
  if (!url) {
    const sf = sharedFrom.toLowerCase();
    if (sf.includes("whatsapp")) return "whatsapp";
    if (sf.includes("telegram")) return "telegram";
    return "other";
  }

  const lower = url.toLowerCase();

  if (lower.endsWith(".pdf") || lower.includes(".pdf?")) return "pdf";

  let hostname = "";
  let pathname = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    pathname = parsed.pathname.toLowerCase();
  } catch {
    return "web";
  }

  if (hostname.includes("instagram.com")) {
    if (pathname.includes("/reel/") || pathname.includes("/reels/")) return "instagram_reel";
    if (pathname.includes("/p/")) return "instagram_post";
    return "instagram_post";
  }
  if (hostname.includes("threads.net") || hostname.includes("threads.com")) return "threads_post";
  if ((hostname === "x.com" || hostname === "twitter.com") && pathname.includes("/status/")) return "tweet";
  if (hostname.includes("reddit.com") && (pathname.includes("/comments/") || pathname.includes("/r/"))) {
    return "reddit_post";
  }
  if (hostname.includes("youtube.com") && pathname.includes("/shorts/")) return "youtube_shorts";
  if (hostname.includes("youtube.com") && pathname.includes("/watch")) return "youtube_video";
  if (hostname === "youtu.be") return "youtube_video";
  if (hostname.includes("linkedin.com") && (pathname.includes("/posts/") || pathname.includes("/feed/update/"))) {
    return "linkedin_post";
  }
  if (hostname.includes("facebook.com") || hostname.includes("fb.com")) return "facebook_post";
  if (hostname.includes("tiktok.com")) return "tiktok_video";
  if (hostname === "github.com" && pathname.split("/").filter(Boolean).length >= 2) return "github_repo";
  if (hostname.includes("medium.com") || hostname.includes("substack.com")) return "article";
  if (hostname.includes("docs.google.com")) return "google_doc";
  if (hostname.includes("notion.so") || hostname.includes("notion.site")) return "notion_page";

  if (sharedFrom.toLowerCase().includes("whatsapp")) return "whatsapp";
  if (sharedFrom.toLowerCase().includes("telegram")) return "telegram";

  return "web";
}

export function inferSharedFromPackage(packageName: string): string {
  if (!packageName) return "";
  const map: Record<string, string> = {
    "com.instagram.android": "Instagram",
    "com.twitter.android": "X",
    "com.reddit.frontpage": "Reddit",
    "com.google.android.youtube": "YouTube",
    "com.whatsapp": "WhatsApp",
    "org.telegram.messenger": "Telegram",
    "com.linkedin.android": "LinkedIn",
    "com.facebook.katana": "Facebook",
    "com.zhiliaoapp.musically": "TikTok",
    "com.android.chrome": "Chrome",
    "com.medium.reader": "Medium",
  };
  return map[packageName] || packageName.split(".").pop() || "";
}

export function mobileSourceToCategory(sourceType: MobileSourceType): string {
  switch (sourceType) {
    case "youtube_video":
    case "youtube_shorts":
    case "article":
    case "pdf":
    case "google_doc":
    case "notion_page":
      return "kutuphane";
    case "github_repo":
      return "atolye";
    case "instagram_post":
    case "instagram_reel":
    case "threads_post":
    case "tweet":
    case "reddit_post":
    case "linkedin_post":
    case "facebook_post":
    case "tiktok_video":
    case "whatsapp":
    case "telegram":
    case "social":
      return "diger";
    default:
      return "diger";
  }
}

export function buildMobileTags(sourceType: MobileSourceType, domain: string, sharedFrom: string): string[] {
  const tags = new Set<string>([sourceType, domain, sharedFrom].filter(Boolean));
  return Array.from(tags).slice(0, 12);
}
