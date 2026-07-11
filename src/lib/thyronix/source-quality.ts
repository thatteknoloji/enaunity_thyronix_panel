import type { User } from "@/types";
import { prisma } from "@/lib/db";
import { withTenantFilter } from "./access";
import { parseFixedValues } from "./feed-fetch";
import { sourceHasConfiguredVat } from "./source-vat-detection";

export type ThyronixSourceQualitySummary = {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  status: string;
  missingVatCount: number;
  invalidPriceCount: number;
  brokenVariantCount: number;
  zeroStockWithVariantsCount: number;
  productCount: number;
  vatFieldDetected: boolean;
  vatUserConfigured: boolean;
  warnings: string[];
};

type CountRow = {
  sourceId: string | null;
  _count: { id: number };
};

function countMap(rows: CountRow[]) {
  return new Map(rows.filter((row) => row.sourceId).map((row) => [row.sourceId as string, row._count.id]));
}

function buildWarnings(
  summary: Omit<ThyronixSourceQualitySummary, "warnings">,
  sourceType?: string | null,
) {
  const label = sourceType === "xml" ? "XML" : "kaynak";
  const warnings: string[] = [];

  if (!summary.vatFieldDetected && !summary.vatUserConfigured) {
    warnings.push(
      `Bu ${label} içinde KDV alanı tespit edilmedi. Sabit Değerler bölümünden KDV Oranı veya KDV Override girin.`,
    );
  } else if (summary.missingVatCount > 0 && !summary.vatUserConfigured) {
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

  if (summary.brokenVariantCount > 0) {
    warnings.push(
      `${summary.brokenVariantCount.toLocaleString("tr-TR")} üründe bozuk varyant verisi var ([object Object]). Kaynağı yeniden senkronize edin.`,
    );
  }

  if (summary.zeroStockWithVariantsCount > 0) {
    warnings.push(
      `${summary.zeroStockWithVariantsCount.toLocaleString("tr-TR")} üründe ana stok 0; varyant stokları birleşik feed'e yansıtılıyor.`,
    );
  }

  return warnings;
}

export async function getThyronixSourceQualitySummaries(user: User) {
  const [sources, missingVatRows, invalidPriceRows, brokenVariantRows, productRows] = await Promise.all([
    prisma.thyronixSource.findMany({
      where: withTenantFilter(user, {}),
      select: { id: true, name: true, status: true, type: true, fixedValues: true },
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
      where: withTenantFilter(user, { variantData: { contains: "[object Object]" } }),
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
  const brokenVariantBySource = countMap(brokenVariantRows);
  const productCountBySource = countMap(productRows);
  const summaries = new Map<string, ThyronixSourceQualitySummary>();

  for (const source of sources) {
    const fixed = parseFixedValues(source.fixedValues);
    const vatFieldDetected = fixed.vatFieldDetected === "yes";
    const vatUserConfigured = sourceHasConfiguredVat(fixed) || fixed.vatUserConfigured === "yes";

    const summary = {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      status: source.status,
      missingVatCount: missingVatBySource.get(source.id) || 0,
      invalidPriceCount: invalidPriceBySource.get(source.id) || 0,
      brokenVariantCount: brokenVariantBySource.get(source.id) || 0,
      zeroStockWithVariantsCount: 0,
      productCount: productCountBySource.get(source.id) || 0,
      vatFieldDetected,
      vatUserConfigured,
    };
    summaries.set(source.id, {
      ...summary,
      warnings: buildWarnings(summary, source.type),
    });
  }

  return summaries;
}
