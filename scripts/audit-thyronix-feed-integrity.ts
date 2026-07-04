import { prisma } from "../src/lib/db";
import { loadMergedFeedProducts } from "../src/lib/thyronix/feed-output-service";
import { planFeedChunks } from "../src/lib/thyronix/feed-chunk";
import { resolveFeedSourceIds } from "../src/lib/thyronix/source-feed-provision";

type AuditIssue = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

const issues: AuditIssue[] = [];

function addIssue(issue: AuditIssue) {
  issues.push(issue);
}

function parseJsonArray(raw: string | null): boolean {
  if (!raw) return true;
  try {
    return Array.isArray(JSON.parse(raw));
  } catch {
    return false;
  }
}

async function main() {
  const [
    sourceCount,
    activeSourceCount,
    productCount,
    activeProductCount,
    feedCount,
    activeFeedCount,
    missingIdentity,
    invalidPrice,
    missingVat,
  ] = await Promise.all([
    prisma.thyronixSource.count(),
    prisma.thyronixSource.count({ where: { status: "active" } }),
    prisma.thyronixProduct.count(),
    prisma.thyronixProduct.count({ where: { status: "active" } }),
    prisma.thyronixFeed.count(),
    prisma.thyronixFeed.count({ where: { status: "active" } }),
    prisma.thyronixProduct.count({
      where: {
        OR: [
          {
            AND: [
              { barcode: null },
              { stockCode: null },
              { modelCode: null },
              { externalId: "" },
            ],
          },
        ],
      },
    }),
    prisma.thyronixProduct.count({ where: { price: { lte: 0 } } }),
    prisma.thyronixProduct.count({ where: { vatRate: null } }),
  ]);

  if (missingIdentity > 0) {
    addIssue({
      code: "missing_identity",
      severity: "error",
      message: `${missingIdentity} üründe barkod/stok kodu/model kodu/harici ID yok.`,
    });
  }

  if (invalidPrice > 0) {
    addIssue({
      code: "invalid_price",
      severity: "error",
      message: `${invalidPrice} üründe fiyat 0 veya negatif.`,
    });
  }

  if (missingVat > 0) {
    addIssue({
      code: "missing_vat",
      severity: "warning",
      message: `${missingVat} üründe KDV yok. Kaynakta KDV yoksa normal, kaynakta varsa mapping kontrol edilmeli.`,
    });
  }

  const variantRows = await prisma.thyronixProduct.findMany({
    where: { NOT: { variantData: null } },
    select: { id: true, name: true, variantData: true },
    take: 2000,
  });
  const malformedVariantRows = variantRows.filter((row) => !parseJsonArray(row.variantData));
  if (malformedVariantRows.length > 0) {
    addIssue({
      code: "malformed_variant_data",
      severity: "error",
      message: `${malformedVariantRows.length} örnek üründe varyant JSON parse edilemiyor.`,
    });
  }

  const feeds = await prisma.thyronixFeed.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      sourceId: true,
      dealerId: true,
      mergeStrategy: true,
      outputFormat: true,
      productCount: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const sourceQualityRows = await prisma.thyronixSource.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      inputFormat: true,
      productCount: true,
      errorLog: true,
      _count: { select: { products: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const sourceQuality = [];
  for (const source of sourceQualityRows) {
    const where = { sourceId: source.id };
    const [missingVatCount, invalidPriceCount, missingIdentityCount, variantCount] = await Promise.all([
      prisma.thyronixProduct.count({ where: { ...where, vatRate: null } }),
      prisma.thyronixProduct.count({ where: { ...where, price: { lte: 0 } } }),
      prisma.thyronixProduct.count({
        where: {
          ...where,
          AND: [
            { OR: [{ barcode: null }, { barcode: "" }] },
            { OR: [{ stockCode: null }, { stockCode: "" }] },
            { OR: [{ modelCode: null }, { modelCode: "" }] },
            { OR: [{ externalId: "" }] },
          ],
        },
      }),
      prisma.thyronixProduct.count({ where: { ...where, NOT: { variantData: null } } }),
    ]);
    sourceQuality.push({
      id: source.id,
      name: source.name,
      type: source.type,
      inputFormat: source.inputFormat,
      status: source.status,
      storedProductCount: source.productCount,
      dbProductCount: source._count.products,
      missingVatCount,
      invalidPriceCount,
      missingIdentityCount,
      variantCount,
      errorLog: source.errorLog,
    });
    if (source.productCount !== source._count.products) {
      addIssue({
        code: "source_count_mismatch",
        severity: "warning",
        message: `${source.name} kaynak kayıt sayısı DB ürün sayısından farklı: stored=${source.productCount}, db=${source._count.products}.`,
      });
    }
  }

  const feedPlans = [];
  for (const feed of feeds) {
    const sourceIds = await resolveFeedSourceIds(feed as any);
    const mergedProducts = sourceIds.length ? await loadMergedFeedProducts(feed as any, sourceIds) : [];
    const total = mergedProducts.length;
    const plan = planFeedChunks(total);
    feedPlans.push({
      id: feed.id,
      name: feed.name,
      status: feed.status,
      sources: sourceIds.length,
      dbProducts: total,
      storedProductCount: feed.productCount,
      parts: plan.partCount,
      maxPerFile: plan.maxPerFile,
    });
    if (total !== feed.productCount) {
      addIssue({
        code: "feed_count_mismatch",
        severity: "warning",
        message: `${feed.name} feed kayıt sayısı DB planından farklı: stored=${feed.productCount}, db=${total}.`,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      sourceCount,
      activeSourceCount,
      productCount,
      activeProductCount,
      feedCount,
      activeFeedCount,
      variantRowsChecked: variantRows.length,
    },
    sourceQuality,
    feedPlans,
    issues,
  };

  console.log(JSON.stringify(report, null, 2));

  if (issues.some((issue) => issue.severity === "error")) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
