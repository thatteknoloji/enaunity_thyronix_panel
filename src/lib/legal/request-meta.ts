import { headers } from "next/headers";

export type RequestMeta = {
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: string;
  referrer: string;
  sessionId: string;
};

export function parseUserAgent(ua: string): Pick<RequestMeta, "browser" | "os" | "deviceType"> {
  const lower = ua.toLowerCase();
  let browser = "Unknown";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome")) browser = "Safari";

  let os = "Unknown";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac os")) os = "macOS";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("linux")) os = "Linux";

  let deviceType = "desktop";
  if (lower.includes("mobile") || lower.includes("iphone") || lower.includes("android")) deviceType = "mobile";
  else if (lower.includes("ipad") || lower.includes("tablet")) deviceType = "tablet";

  return { browser, os, deviceType };
}

export async function getRequestMeta(sessionId = ""): Promise<RequestMeta> {
  const h = await headers();
  const userAgent = h.get("user-agent") || "";
  const forwarded = h.get("x-forwarded-for") || "";
  const ipAddress = forwarded.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const referrer = h.get("referer") || "";
  const parsed = parseUserAgent(userAgent);
  return { ipAddress, userAgent, referrer, sessionId, ...parsed };
}

export function getRequestMetaFromRequest(req: Request, sessionId = ""): RequestMeta {
  const userAgent = req.headers.get("user-agent") || "";
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ipAddress = forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const referrer = req.headers.get("referer") || "";
  const parsed = parseUserAgent(userAgent);
  return { ipAddress, userAgent, referrer, sessionId, ...parsed };
}
