import type { User } from "@/types";
import { prisma } from "@/lib/db";
import { withTenantFilter } from "./access";

export type ThyronixSourceQualitySummary = {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  status: string;
  missingVatCount: number;
  invalidPriceCount: number;
  productCount: number;
  warnings: string[];
};

type CountRow = {
  sourceId: string | null;
  _count: { id: number };
};

function countMap(rows: CountRow[]) {
  return new Map(rows.filter((row) => row.sourceId).map((row) => [row.sourceId as string, row._count.id]));
}

function buildWarnings(summary: Omit<ThyronixSourceQualitySummary, "warnings">, sourceType?: string | null) {
  const label = sourceType === "xml" ? "XML" : "kaynak";
  const warnings: string[] = [];
  if (summary.missingVatCount > 0) {
    warnings.push(
      summary.missingVatCount >= summary.productCount
        ? `Bu ${label} içinde KDV alanı yok veya tüm ürünlerde boş geliyor.`
        : `Bu ${label} içinde ${summary.missingVatCount.toLocaleString("tr-TR")} üründe KDV boş geliyor.`,
    );
  }
  if (summary.invalidPriceCount > 0) {
    warnings.push(
      summary.invalidPriceCount >= summary.productCount
        ? `Bu ${label} içinde fiyat alanı yok veya tüm ürünlerde 0/negatif geliyor.`
        : `Bu ${label} içinde ${summary.invalidPriceCount.toLocaleString("tr-TR")} üründe fiyat 0/negatif geliyor.`,
    );
  }
  return warnings;
}

export async function getThyronixSourceQualitySummaries(user: User) {
  const [sources, missingVatRows, invalidPriceRows, productRows] = await Promise.all([
    prisma.thyronixSource.findMany({
      where: withTenantFilter(user, {}),
      select: { id: true, name: true, status: true, type: true },
    }),
    prisma.thyronixProduct.groupBy({
      by: ["sourceId"],
      where: withTenantFilter(user, { vatRate: null }),
      _count: { id: true },
    }),
    prisma.thyronixProduct.groupBy({
      by: ["sourceId"],
      where: withTenantFilter(user, { price: { lte: 0 } }),
      _count: { id: true },
    }),
    prisma.thyronixProduct.groupBy({
      by: ["sourceId"],
      where: withTenantFilter(user, {}),
      _count: { id: true },
    }),
  ]);

  const missingVatBySource = countMap(missingVatRows);
  const invalidPriceBySource = countMap(invalidPriceRows);
  const productCountBySource = countMap(productRows);
  const summaries = new Map<string, ThyronixSourceQualitySummary>();

  for (const source of sources) {
    const summary = {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      status: source.status,
      missingVatCount: missingVatBySource.get(source.id) || 0,
      invalidPriceCount: invalidPriceBySource.get(source.id) || 0,
      productCount: productCountBySource.get(source.id) || 0,
    };
    summaries.set(source.id, {
      ...summary,
      warnings: buildWarnings(summary, source.type),
    });
  }

  return summaries;
}
