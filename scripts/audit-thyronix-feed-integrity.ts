import { prisma } from "../src/lib/db";
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

  const feedPlans = [];
  for (const feed of feeds) {
    const sourceIds = await resolveFeedSourceIds(feed as any);
    const total = sourceIds.length
      ? await prisma.thyronixProduct.count({ where: { sourceId: { in: sourceIds } } })
      : 0;
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
