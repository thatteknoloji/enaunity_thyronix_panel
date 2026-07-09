import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { CategoryMapping } from "../marketplace-import/types";

export const XML_PRODUCTS_ROOT_NAME = "XML Ürünler";
export const XML_PRODUCTS_ROOT_SLUG = "xml-urunler";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseCategorySegments(path: string): string[] {
  return path
    .split(">>>")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function leafCategoryName(path: string): string {
  const segments = parseCategorySegments(path);
  return segments[segments.length - 1] || path.trim();
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

async function uniqueSlug(base: string, parentId: string, name: string): Promise<string> {
  let candidate = slugify(base) || "kategori";
  let i = 0;
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    if (existing.parentId === parentId && existing.name === name) return candidate;
    i++;
    candidate = `${slugify(base) || "kategori"}-${i}`;
  }
}

async function ensureChildCategory(
  name: string,
  parent: { id: string; slug: string },
  sourceFeedId?: string,
  cache?: Map<string, { id: string; slug: string; name: string }>,
): Promise<{ id: string; slug: string; name: string }> {
  const cacheKey = `${parent.id}::${name}::${sourceFeedId || ""}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey)!;

  const existing = await prisma.category.findFirst({
    where: {
      name,
      parentId: parent.id,
      ...(sourceFeedId ? { sourceFeedId } : {}),
    },
  });
  if (existing) {
    await prisma.category.update({
      where: { id: existing.id },
      data: { active: true },
    });
    cache?.set(cacheKey, existing);
    return existing;
  }

  const slug = await uniqueSlug(`${parent.slug}-${name}`, parent.id, name);
  const created = await prisma.category.create({
    data: {
      name,
      slug,
      parentId: parent.id,
      sourceFeedId: sourceFeedId || null,
      active: true,
    },
  });
  cache?.set(cacheKey, created);
  return created;
}

export async function ensureXmlProductsRoot(): Promise<{ id: string; slug: string; name: string }> {
  const existing = await prisma.category.findUnique({ where: { slug: XML_PRODUCTS_ROOT_SLUG } });
  if (existing) {
    await prisma.category.update({
      where: { id: existing.id },
      data: { name: XML_PRODUCTS_ROOT_NAME, active: true },
    });
    return existing;
  }
  return prisma.category.create({
    data: {
      name: XML_PRODUCTS_ROOT_NAME,
      slug: XML_PRODUCTS_ROOT_SLUG,
      active: true,
    },
  });
}

export async function ensureXmlCategoryTree(
  feedId: string,
  rootCategory: string,
  mappedCategoryPaths: string[],
): Promise<void> {
  const trimmedRoot = rootCategory.trim();
  if (!trimmedRoot) return;

  const xmlRoot = await ensureXmlProductsRoot();
  const cache = new Map<string, { id: string; slug: string; name: string }>();

  let feedRoot = await prisma.category.findFirst({
    where: { sourceFeedId: feedId, parentId: xmlRoot.id },
    select: { id: true, slug: true, name: true },
  });
  if (feedRoot) {
    await prisma.category.update({
      where: { id: feedRoot.id },
      data: { name: trimmedRoot, active: true },
    });
    cache.set(`${xmlRoot.id}::${trimmedRoot}::${feedId}`, feedRoot);
  } else {
    feedRoot = await ensureChildCategory(trimmedRoot, xmlRoot, feedId, cache);
  }

  const uniquePaths = [...new Set(mappedCategoryPaths.map((p) => p.trim()).filter(Boolean))];
  for (const path of uniquePaths) {
    const segments = parseCategorySegments(path);
    if (!segments.length) continue;

    let parent = feedRoot;
    for (const segment of segments) {
      parent = await ensureChildCategory(segment, parent, feedId, cache);
    }
  }
}

/** @deprecated flat oluşturma — ensureXmlCategoryTree kullanın */
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
  return { category: leafCategoryName(mapped), subcategory: rootCategory, mapped: true };
}

export function applyCategoryMappingToRows<T extends { category: string; subcategory?: string }>(
  rows: T[],
  mapping: CategoryMapping,
  rootCategory: string,
): { rows: T[]; unmapped: string[]; mappedPaths: string[] } {
  const unmapped = new Set<string>();
  const mappedPaths = new Set<string>();
  const next = rows.map((row) => {
    const trimmed = row.category.trim();
    const mapped = mapping[trimmed] || mapping[normalizeKey(trimmed)] || "";
    if (!mapped && trimmed) {
      unmapped.add(trimmed);
      return { ...row, subcategory: rootCategory };
    }
    if (mapped) mappedPaths.add(mapped);
    const resolved = resolveMappedCategory(row.category, mapping, rootCategory);
    return {
      ...row,
      category: resolved.category || leafCategoryName(row.category),
      subcategory: resolved.subcategory,
    };
  });
  return { rows: next, unmapped: [...unmapped], mappedPaths: [...mappedPaths] };
}
