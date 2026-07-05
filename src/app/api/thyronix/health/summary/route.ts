import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse, withTenantFilter } from "@/lib/thyronix/access";
import { countActiveSourceProducts } from "@/lib/thyronix/feed-output-service";
import { resolveFeedSourceIds } from "@/lib/thyronix/source-feed-provision";
import { getThyronixSourceQualitySummaries } from "@/lib/thyronix/source-quality";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const tenantWhere = withTenantFilter(user, {});

    const [
      missingBarcode, missingBrand, missingCategory, missingDescription,
      missingIdentity, missingVat,
      zeroPrice, zeroStock, negativePrice, negativeStock, totalActive, totalAll,
    ] = await Promise.all([
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { barcode: null }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { OR: [{ brand: null }, { brand: "" }] }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { OR: [{ category: null }, { category: "" }] }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { OR: [{ description: null }, { description: "" }] }) }),
      prisma.thyronixProduct.count({
        where: withTenantFilter(user, {
          AND: [
            { OR: [{ barcode: null }, { barcode: "" }] },
            { OR: [{ stockCode: null }, { stockCode: "" }] },
            { OR: [{ modelCode: null }, { modelCode: "" }] },
            { OR: [{ externalId: "" }] },
          ],
        }),
      }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { vatRate: null }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { price: 0 }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { stock: 0 }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { price: { lt: 0 } }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { stock: { lt: 0 } }) }),
      prisma.thyronixProduct.count({ where: withTenantFilter(user, { status: "active" }) }),
      prisma.thyronixProduct.count({ where: tenantWhere }),
    ]);
    const feedWhere = withTenantFilter(user, { status: "active" });
    const feeds = await prisma.thyronixFeed.findMany({
      where: feedWhere,
      select: { id: true, name: true, productCount: true, sourceId: true, dealerId: true },
    });
    let feedCountMismatch = 0;
    for (const feed of feeds) {
      const sourceIds = await resolveFeedSourceIds(feed);
      const actual = await countActiveSourceProducts(sourceIds);
      if (actual !== feed.productCount) feedCountMismatch++;
    }
    const qualitySummaries = await getThyronixSourceQualitySummaries(user);
    const sourceWarnings = Array.from(qualitySummaries.values())
      .filter((summary) => summary.warnings.length > 0)
      .sort((a, b) => (b.invalidPriceCount + b.missingVatCount) - (a.invalidPriceCount + a.missingVatCount))
      .slice(0, 12);

    return NextResponse.json({
      success: true,
      data: {
        missingBarcode, missingBrand, missingCategory, missingDescription,
        missingIdentity, missingVat, feedCountMismatch,
        zeroPrice, zeroStock, negativePrice, negativeStock, totalActive, totalAll,
        sourceWarnings,
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
