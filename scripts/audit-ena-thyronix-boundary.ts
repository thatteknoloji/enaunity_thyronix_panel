/**
 * Non-mutating ENA / THYRONIX boundary audit.
 *
 * Run: npx tsx scripts/audit-ena-thyronix-boundary.ts
 *
 * Purpose:
 * - Count critical ENA + THYRONIX records before/after work.
 * - Prove marketplace/order matching does not automatically consume THYRONIX products.
 * - Prove THYRONIX pool access requires the explicit manual admin import match method.
 */
import { prisma } from "../src/lib/db";
import { matchProductLine } from "../src/lib/marketplace-hub/product-match";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function countModel(label: string, fn: () => Promise<number>) {
  try {
    const count = await fn();
    console.log(`${label}: ${count.toLocaleString("tr-TR")}`);
    return count;
  } catch (error) {
    failed++;
    console.error(`${label}: ERR ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }
}

async function findBoundaryProbe() {
  const candidates = await prisma.thyronixProduct.findMany({
    where: {
      status: "active",
      source: { status: "active" },
      OR: [
        { barcode: { not: null } },
        { stockCode: { not: null } },
        { modelCode: { not: null } },
      ],
    },
    include: { source: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  for (const product of candidates) {
    const code = (product.barcode || product.stockCode || product.modelCode || "").trim();
    if (!code) continue;
    const [enaProduct, catalogItem] = await Promise.all([
      prisma.product.findFirst({ where: { OR: [{ barcode: code }, { sku: code }, { modelCode: code }] } }),
      prisma.productCatalogItem.findFirst({ where: { OR: [{ barcode: code }, { sku: code }] } }),
    ]);
    if (!enaProduct && !catalogItem) return { product, code };
  }

  return null;
}

async function main() {
  console.log("\n=== ENA / THYRONIX Boundary Audit ===\n");

  console.log("1) Veri envanteri");
  await countModel("users", () => prisma.user.count());
  await countModel("dealers", () => prisma.dealer.count());
  await countModel("orders", () => prisma.order.count());
  await countModel("products", () => prisma.product.count());
  await countModel("productCatalogItems", () => prisma.productCatalogItem.count());
  await countModel("productUniverseThyronixBridgeItems", () =>
    prisma.productUniverse.count({ where: { metadataJson: { contains: '"importSource":"THYRONIX_BRIDGE_V1"' } } }),
  );
  await countModel("marketplaceConnections", () => prisma.marketplaceConnection.count());
  await countModel("marketplaceOrders", () => prisma.marketplaceOrder.count());
  await countModel("marketplaceOrderItemsWithThyronixRef", () =>
    prisma.marketplaceOrderItem.count({ where: { thyronixProductId: { not: "" } } }),
  );
  await countModel("thyronixSources", () => prisma.thyronixSource.count());
  await countModel("thyronixProducts", () => prisma.thyronixProduct.count());
  await countModel("thyronixFeeds", () => prisma.thyronixFeed.count());
  await countModel("thyronixRules", () => prisma.thyronixRule.count());
  await countModel("productImportJobs", () => prisma.productImportJob.count());

  console.log("\n2) Otomatik THYRONIX eşleşme koruması");
  const probe = await findBoundaryProbe();
  if (!probe) {
    console.log("  — Benzersiz THYRONIX kodu bulunamadı; otomatik eşleşme testi veri yokluğu nedeniyle atlandı.");
  } else {
    console.log(`  Probe: ${probe.code} · ${probe.product.source.name}`);
    const automatic = await matchProductLine({
      barcode: probe.code,
      sku: probe.code,
      name: probe.product.name,
    });
    assert(!automatic.thyronixProduct, "Varsayılan ENA/marketplace eşleşmesi THYRONIX ürünü döndürmez");
    assert(!String(automatic.matchedSource || "").startsWith("thyronix_"), "Varsayılan matchSource THYRONIX değildir");

    const flaggedButNotManual = await matchProductLine({
      barcode: probe.code,
      sku: probe.code,
      name: probe.product.name,
      allowThyronixPool: true,
    });
    assert(!flaggedButNotManual.thyronixProduct, "Sadece allowThyronixPool yeterli değildir");

    const manualBridge = await matchProductLine({
      barcode: probe.code,
      sku: probe.code,
      name: probe.product.name,
      matchMethod: "thyronix_manual_admin_import",
      allowThyronixPool: true,
    });
    assert(!!manualBridge.thyronixProduct, "THYRONIX havuzu sadece manuel admin import metoduyla açılır");
  }

  console.log(`\n=== Result: ${failed === 0 ? "OK" : `${failed} sorun`} ===\n`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
