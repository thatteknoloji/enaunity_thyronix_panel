import type { ShowcaseFaq, ShowcaseFeature, ShowcaseGalleryItem, ShowcasePlan } from "./types";

export function parseJsonArray<T>(raw: string, fallback: T[] = []): T[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function parseFeatures(raw: string): { features: ShowcaseFeature[]; cardFeatures: string[] } {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && ("chips" in parsed || "items" in parsed)) {
      return {
        cardFeatures: Array.isArray(parsed.chips) ? parsed.chips : [],
        features: Array.isArray(parsed.items) ? parsed.items : [],
      };
    }
  } catch {}
  const parsed = parseJsonArray<ShowcaseFeature | string>(raw);
  if (parsed.length === 0) return { features: [], cardFeatures: [] };
  if (typeof parsed[0] === "string") {
    return { features: [], cardFeatures: parsed as string[] };
  }
  const features = parsed as ShowcaseFeature[];
  return {
    features,
    cardFeatures: features.map((f) => (typeof f === "string" ? f : f.title)).filter(Boolean),
  };
}

export function serializeFeatures(cardFeatures: string[], features: ShowcaseFeature[]) {
  if (features.length > 0 || cardFeatures.length > 0) {
    return JSON.stringify({ chips: cardFeatures, items: features });
  }
  return "[]";
}

export function parseFaq(raw: string): ShowcaseFaq[] {
  return parseJsonArray<ShowcaseFaq>(raw).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function parsePlans(raw: string): ShowcasePlan[] {
  return parseJsonArray<ShowcasePlan>(raw).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function parseGallery(raw: string): ShowcaseGalleryItem[] {
  return parseJsonArray<ShowcaseGalleryItem>(raw);
}
