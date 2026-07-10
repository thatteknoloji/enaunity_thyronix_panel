import { prisma } from "@/lib/db";
import { DEFAULT_FEED_TRANSFORM, type ThyronixFeedTransformSettings } from "./commercial";

export type FeedProduct = {
  name: string;
  description?: string | null;
  brand?: string | null;
  [key: string]: unknown;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?%])/g, "$1")
    .replace(/([([{\/+\-])\s+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(/[\n,;|]+/g).map((item) => item.trim()).filter(Boolean))];
  }
  return [];
}

export function normalizeFeedTransformSettings(raw: unknown): ThyronixFeedTransformSettings {
  const base = { ...DEFAULT_FEED_TRANSFORM };
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<ThyronixFeedTransformSettings> & Record<string, unknown>;
  return {
    enabled: Boolean(data.enabled ?? base.enabled),
    targetBrand: String(data.targetBrand || base.targetBrand).trim() || base.targetBrand,
    sourceBrandAliases: toList(data.sourceBrandAliases),
    bannedWords: (() => {
      const list = toList(data.bannedWords);
      return list.length > 0 ? list : [...base.bannedWords];
    })(),
    titlePrefix: String(data.titlePrefix || "").trim(),
    titleSuffix: String(data.titleSuffix || "").trim(),
    descriptionPrefix: String(data.descriptionPrefix || "").trim(),
    descriptionSuffix: String(data.descriptionSuffix || "").trim(),
    maxTitleLength: Math.max(40, Math.min(200, Number(data.maxTitleLength || base.maxTitleLength) || base.maxTitleLength)),
  };
}

export async function loadFeedTransformSettings(dealerId?: string | null): Promise<ThyronixFeedTransformSettings> {
  if (!dealerId) return { ...DEFAULT_FEED_TRANSFORM };
  const row = await prisma.thyronixWorkspaceSettings.findUnique({
    where: { dealerId },
    select: { automationJson: true },
  });
  if (!row) return { ...DEFAULT_FEED_TRANSFORM };

  try {
    const automation = JSON.parse(row.automationJson || "{}") as { feedTransform?: unknown };
    return normalizeFeedTransformSettings(automation.feedTransform);
  } catch {
    return { ...DEFAULT_FEED_TRANSFORM };
  }
}

function buildReplacements(product: FeedProduct, settings: ThyronixFeedTransformSettings): string[] {
  return [...new Set([product.brand, ...settings.sourceBrandAliases].map((item) => String(item || "").trim()).filter(Boolean))];
}

function replaceTerms(input: string, terms: string[], replacement: string): string {
  let output = input;
  for (const term of [...terms].sort((a, b) => b.length - a.length)) {
    if (!term) continue;
    output = output.replace(new RegExp(escapeRegExp(term), "gi"), replacement);
  }
  return output;
}

function stripBannedWords(input: string, bannedWords: string[]): string {
  let output = input;
  for (const term of [...bannedWords].sort((a, b) => b.length - a.length)) {
    if (!term) continue;
    output = output.replace(new RegExp(escapeRegExp(term), "gi"), "");
  }
  return output;
}

function trimTitle(title: string, maxLength: number): string {
  const normalized = normalizeText(title);
  if (!maxLength || normalized.length <= maxLength) return normalized;
  const truncated = normalized.slice(0, maxLength).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 40 ? truncated.slice(0, lastSpace).trim() : truncated;
}

export function applyFeedTransformSettings<T extends FeedProduct>(
  products: T[],
  settings: ThyronixFeedTransformSettings,
): T[] {
  if (!settings.enabled) return products;
  const targetBrand = normalizeText(settings.targetBrand || "");
  if (!targetBrand) return products;

  return products.map((product) => {
    const aliases = buildReplacements(product, settings);
    const originalName = normalizeText(String(product.name || ""));
    const originalDescription = normalizeText(String(product.description || ""));

    const cleanedTitle = trimTitle(
      replaceTerms(
        stripBannedWords(
          replaceTerms(String(product.name || ""), aliases, targetBrand),
          settings.bannedWords,
        ),
        [targetBrand],
        targetBrand,
      ),
      settings.maxTitleLength,
    );

    const description = normalizeText(
      replaceTerms(
        stripBannedWords(
          replaceTerms(String(product.description || ""), aliases, targetBrand),
          settings.bannedWords,
        ),
        [targetBrand],
        targetBrand,
      ),
    );
    const nextName = normalizeText(
      [settings.titlePrefix, cleanedTitle || originalName || targetBrand, settings.titleSuffix]
        .filter(Boolean)
        .join(" "),
    );
    const nextDescription = normalizeText(
      [settings.descriptionPrefix, description || originalDescription, settings.descriptionSuffix]
        .filter(Boolean)
        .join(" "),
    );

    const next: T = {
      ...product,
      name: nextName || originalName || targetBrand,
      description: nextDescription || null,
      brand: targetBrand,
    };

    return next;
  });
}
