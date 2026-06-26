import type { CommissionRef, MarketplaceCommissionEntry, MarketplaceId } from "./marketplace-types";
import { getCategoryById } from "./marketplace-category-cache";
import {
  COMMISSION_SOURCES,
  IMPORTED_COMMISSIONS,
  findCommissionByRef,
} from "./marketplace-imported-data";

const byCategoryId = new Map<string, MarketplaceCommissionEntry>();
for (const entry of IMPORTED_COMMISSIONS) {
  if (!byCategoryId.has(entry.categoryId)) {
    byCategoryId.set(entry.categoryId, entry);
  }
}

export function resolveCommissionEntry(
  marketplace: MarketplaceId,
  categoryId: string,
): MarketplaceCommissionEntry | null {
  const direct = byCategoryId.get(categoryId);
  if (direct) return direct;

  const category = getCategoryById(categoryId);
  if (!category || category.marketplace !== marketplace) return null;

  if (category.commissionRef) {
    return findCommissionByRef(marketplace, category.commissionRef) ?? null;
  }
  return null;
}

export function getCommissionRate(
  marketplace: MarketplaceId,
  categoryId: string,
): number | null {
  return resolveCommissionEntry(marketplace, categoryId)?.ratePercent ?? null;
}

export function getCommissionEntry(
  marketplace: MarketplaceId,
  categoryId: string,
): MarketplaceCommissionEntry | null {
  return resolveCommissionEntry(marketplace, categoryId);
}

export function hasCommissionRate(marketplace: MarketplaceId, categoryId: string): boolean {
  return getCommissionRate(marketplace, categoryId) !== null;
}

export function listCommissionEntries(
  marketplace?: MarketplaceId,
): MarketplaceCommissionEntry[] {
  if (!marketplace) return IMPORTED_COMMISSIONS;
  return IMPORTED_COMMISSIONS.filter((e) => e.marketplace === marketplace);
}

export function getCommissionSourceMeta(marketplace: MarketplaceId) {
  return COMMISSION_SOURCES[marketplace];
}

export function searchCommissionByPath(
  marketplace: MarketplaceId,
  query: string,
): MarketplaceCommissionEntry[] {
  const q = query.toLocaleLowerCase("tr-TR");
  return IMPORTED_COMMISSIONS.filter((e) => {
    if (e.marketplace !== marketplace) return false;
    const hay = `${e.mainCategory} ${e.subCategory} ${e.productGroup}`.toLocaleLowerCase("tr-TR");
    return hay.includes(q);
  });
}

export type { CommissionRef };
