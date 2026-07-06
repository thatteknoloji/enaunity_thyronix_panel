import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { CategoryMapping } from "../marketplace-import/types";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function suggestCategoryMapping(
  sourceCategories: string[],
  storeCategories: Array<{ name: string }>,
): CategoryMapping {
  const mapping: CategoryMapping = {};
  const storeByNorm = new Map(storeCategories.map((c) => [normalizeKey(c.name), c.name]));
  for (const src of sourceCategories) {
    const norm = normalizeKey(src);
    mapping[src] = storeByNorm.get(norm) || src;
  }
  return mapping;
}

export async function ensureStoreCategories(names: string[]): Promise<void> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  for (const name of unique) {
    const slug = slugify(name) || "kategori";
    await prisma.category.upsert({
      where: { slug },
      create: { name, slug, active: true },
      update: { name, active: true },
    });
  }
}

export function resolveMappedCategory(
  xmlCategory: string,
  mapping: CategoryMapping,
  rootCategory: string,
): { category: string; subcategory: string; mapped: boolean } {
  const trimmed = xmlCategory.trim();
  const mapped = mapping[trimmed] || mapping[normalizeKey(trimmed)] || "";
  if (!mapped && !trimmed) {
    return { category: rootCategory || "general", subcategory: rootCategory, mapped: false };
  }
  if (!mapped) {
    return { category: "", subcategory: rootCategory, mapped: false };
  }
  return { category: mapped, subcategory: rootCategory, mapped: true };
}

export function applyCategoryMappingToRows<T extends { category: string; subcategory?: string }>(
  rows: T[],
  mapping: CategoryMapping,
  rootCategory: string,
): { rows: T[]; unmapped: string[] } {
  const unmapped = new Set<string>();
  const next = rows.map((row) => {
    const resolved = resolveMappedCategory(row.category, mapping, rootCategory);
    if (!resolved.mapped && row.category.trim()) unmapped.add(row.category.trim());
    return {
      ...row,
      category: resolved.category || row.category,
      subcategory: resolved.subcategory,
    };
  });
  return { rows: next, unmapped: [...unmapped] };
}
