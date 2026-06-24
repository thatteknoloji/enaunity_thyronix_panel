/** URL normalizasyonu — karşılaştırma ve eşleştirme için */
export function normalizeLegacyUrl(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "/";

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const u = new URL(trimmed);
      let path = u.pathname || "/";
      path = path.replace(/\/+$/, "") || "/";
      return path.toLowerCase();
    }
  } catch {
    /* path olarak devam */
  }

  let path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  path = path.replace(/\/+$/, "") || "/";
  return path.toLowerCase();
}

export function extractPathSlug(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

export function slugToReadableTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ");
}

export function extractKeywordFromPath(path: string): string {
  const slug = extractPathSlug(path);
  return slugToReadableTitle(slug);
}
