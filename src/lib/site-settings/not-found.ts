export type NotFoundQuickLink = {
  label: string;
  href: string;
  description: string;
};

export type NotFoundRedirectRule = {
  fromPath: string;
  toPath: string;
  matchType: "exact" | "prefix";
  statusCode: 301 | 302 | 307 | 308;
  active: boolean;
  note: string;
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw || "");
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function parseNotFoundQuickLinks(raw: string, fallback: NotFoundQuickLink[]): NotFoundQuickLink[] {
  const parsed = parseJson<NotFoundQuickLink[]>(raw, fallback);
  return Array.isArray(parsed)
    ? parsed
        .map((item) => ({
          label: String(item?.label || "").trim(),
          href: String(item?.href || "").trim() || "/",
          description: String(item?.description || "").trim(),
        }))
        .filter((item) => item.label && item.href)
    : fallback;
}

export function parseNotFoundRedirectRules(
  raw: string,
  fallback: NotFoundRedirectRule[]
): NotFoundRedirectRule[] {
  const parsed = parseJson<NotFoundRedirectRule[]>(raw, fallback);
  return Array.isArray(parsed)
    ? (parsed
        .map((item) => ({
          fromPath: normalizeRedirectPath(String(item?.fromPath || "")),
          toPath: String(item?.toPath || "").trim() || "/",
          matchType: item?.matchType === "prefix" ? "prefix" : "exact",
          statusCode: [301, 302, 307, 308].includes(Number(item?.statusCode))
            ? (Number(item?.statusCode) as 301 | 302 | 307 | 308)
            : 301,
          active: item?.active !== false,
          note: String(item?.note || "").trim(),
        }))
        .filter((item) => item.fromPath && item.toPath) as NotFoundRedirectRule[])
    : fallback;
}

export function normalizeRedirectPath(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "/";
  if (!value.startsWith("/")) return `/${value}`;
  return value === "/" ? "/" : value.replace(/\/+$/, "");
}

export function matchRedirectRule(pathname: string, rules: NotFoundRedirectRule[]): NotFoundRedirectRule | null {
  const normalizedPath = normalizeRedirectPath(pathname);
  for (const rule of rules) {
    if (!rule.active) continue;
    const from = normalizeRedirectPath(rule.fromPath);
    if (rule.matchType === "prefix") {
      if (normalizedPath === from || normalizedPath.startsWith(`${from}/`)) return { ...rule, fromPath: from };
      continue;
    }
    if (normalizedPath === from) return { ...rule, fromPath: from };
  }
  return null;
}

