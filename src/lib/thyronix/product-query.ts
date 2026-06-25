import type { User } from "@/types";
import { withTenantFilter } from "@/lib/thyronix/access";
import { prisma } from "@/lib/db";

export type ThyronixProductFilters = {
  search?: string;
  sourceId?: string;
  category?: string;
  status?: string;
  barcode?: string;
  stockCode?: string;
  modelCode?: string;
  brand?: string;
  priceMin?: string;
  priceMax?: string;
  stockMin?: string;
  stockMax?: string;
};

export async function buildThyronixProductWhere(
  user: User,
  input: ThyronixProductFilters,
) {
  const filters: Record<string, unknown> = {};
  if (input.sourceId) filters.sourceId = input.sourceId;

  let cleanSearch = input.search || "";
  if (cleanSearch) {
    const smartPatterns = [
      { key: "brand", regex: /\bbrand:(\S+)/i },
      { key: "category", regex: /\bcategory:(\S+)/i },
      { key: "source", regex: /\bsource:(\S+)/i },
      { key: "status", regex: /\bstatus:(\S+)/i },
    ];
    for (const p of smartPatterns) {
      const match = cleanSearch.match(p.regex);
      if (match) {
        if (p.key === "source") {
          const src = await prisma.thyronixSource.findFirst({
            where: withTenantFilter(user, { name: { contains: match[1] } }),
          });
          if (src) filters.sourceId = src.id;
        } else {
          filters[p.key] = { contains: match[1] };
        }
        cleanSearch = cleanSearch.replace(match[0], "").trim();
      }
    }

    const rangePatterns = [
      { key: "stock", regex: /\bstock\s*(<|>|<=|>=)\s*(\d+)/i },
      { key: "price", regex: /\bprice\s*(<|>|<=|>=)\s*(\d+(?:\.\d+)?)/i },
    ];
    for (const p of rangePatterns) {
      const match = cleanSearch.match(p.regex);
      if (match) {
        const op = match[1];
        const val = parseFloat(match[2]);
        const existing = (filters[p.key] as Record<string, number>) || {};
        if (op === "<") filters[p.key] = { ...existing, lt: val };
        else if (op === ">") filters[p.key] = { ...existing, gt: val };
        else if (op === "<=") filters[p.key] = { ...existing, lte: val };
        else if (op === ">=") filters[p.key] = { ...existing, gte: val };
        cleanSearch = cleanSearch.replace(match[0], "").trim();
      }
    }
  }

  if (input.category) filters.category = { contains: input.category };
  if (input.status) filters.status = input.status;
  if (input.barcode) filters.barcode = { contains: input.barcode };
  if (input.stockCode) filters.stockCode = { contains: input.stockCode };
  if (input.modelCode) filters.modelCode = { contains: input.modelCode };
  if (input.brand) filters.brand = { contains: input.brand };
  if (input.priceMin) filters.price = { ...(filters.price as object), gte: parseFloat(input.priceMin) };
  if (input.priceMax) filters.price = { ...(filters.price as object), lte: parseFloat(input.priceMax) };
  if (input.stockMin) filters.stock = { ...(filters.stock as object), gte: parseInt(input.stockMin) };
  if (input.stockMax) filters.stock = { ...(filters.stock as object), lte: parseInt(input.stockMax) };

  if (cleanSearch) {
    filters.OR = [
      { name: { contains: cleanSearch } },
      { barcode: { contains: cleanSearch } },
      { stockCode: { contains: cleanSearch } },
      { modelCode: { contains: cleanSearch } },
      { brand: { contains: cleanSearch } },
      { externalId: { contains: cleanSearch } },
    ];
  }

  return withTenantFilter(user, filters);
}

export async function countThyronixProducts(user: User, filters: ThyronixProductFilters) {
  const where = await buildThyronixProductWhere(user, filters);
  return prisma.thyronixProduct.count({ where });
}

export async function findThyronixProductIds(
  user: User,
  filters: ThyronixProductFilters,
  opts?: { skip?: number; take?: number },
) {
  const where = await buildThyronixProductWhere(user, filters);
  const rows = await prisma.thyronixProduct.findMany({
    where,
    select: { id: true },
    skip: opts?.skip,
    take: opts?.take,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => r.id);
}
