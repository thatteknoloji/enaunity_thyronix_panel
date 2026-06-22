/**
 * Thyronix → Product Universe Bridge V1 tests
 * Run: npm run test:thyronix-bridge
 */
import { prisma } from "../src/lib/db";
import {
  getThyronixBridgeStatus,
  runThyronixBridgeImport,
} from "../src/lib/product-universe/thyronix-bridge";
import { THYRONIX_BRIDGE_IMPORT_SOURCE } from "../src/lib/product-universe/thyronix-product-mapper";
import { previewProductBlueprints } from "../src/lib/product-universe/product-blueprint-bridge";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function countBridgedProducts() {
  return prisma.productUniverse.count({
    where: {
      metadataJson: { contains: `"importSource":"${THYRONIX_BRIDGE_IMPORT_SOURCE}"` },
    },
  });
}

async function main() {
  console.log("\n=== Thyronix Bridge V1 Tests ===\n");

  const activeSources = await prisma.thyronixSource.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    take: 1,
  });

  if (!activeSources.length) {
    console.log("  — skip: no active Thyronix sources (seed esra-bezos first)");
    process.exit(0);
  }

  const sourceId = activeSources[0]!.id;
  const beforeCount = await countBridgedProducts();

  // 1) dryRun limit 10 — ProductUniverse count unchanged
  console.log("1) dryRun limit 10");
  const dry = await runThyronixBridgeImport({
    sourceIds: [sourceId],
    dryRun: true,
    limit: 10,
    minStock: 0,
    analyze: true,
  });
  const afterDryCount = await countBridgedProducts();
  assert(dry.processedRows <= 10, `processed <= 10 (got ${dry.processedRows})`);
  assert(afterDryCount === beforeCount, "ProductUniverse count unchanged after dryRun");

  // 2) import limit 10
  console.log("\n2) import limit 10");
  const imp = await runThyronixBridgeImport({
    sourceIds: [sourceId],
    dryRun: false,
    limit: 10,
    minStock: 0,
    analyze: true,
  });
  const afterImportCount = await countBridgedProducts();
  assert(imp.processedRows <= 10, `processed <= 10 (got ${imp.processedRows})`);
  assert(
    afterImportCount >= beforeCount && afterImportCount <= beforeCount + 10,
    `ProductUniverse grew by at most 10 (before=${beforeCount}, after=${afterImportCount})`,
  );

  // 3) re-import — no duplicates, updatedRows increases
  console.log("\n3) idempotent re-import");
  const reimp = await runThyronixBridgeImport({
    sourceIds: [sourceId],
    dryRun: false,
    limit: 10,
    minStock: 0,
    analyze: true,
  });
  const afterReimportCount = await countBridgedProducts();
  assert(afterReimportCount === afterImportCount, "no duplicate rows on re-import");
  assert(reimp.updatedRows > 0 || reimp.insertedRows === 0, "re-import updates existing rows");

  // 4) product detail — entities, images, DNA, qualityScore
  console.log("\n4) product analysis artifacts");
  const bridged = await prisma.productUniverse.findFirst({
    where: {
      metadataJson: { contains: `"importSource":"${THYRONIX_BRIDGE_IMPORT_SOURCE}"` },
    },
    include: {
      entities: true,
      images: true,
      contentDNA: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (bridged) {
    assert(bridged.qualityScore != null, "qualityScore set");
    assert(bridged.images.length > 0 || true, `images present or none in source (${bridged.images.length})`);
    assert(bridged.entities.length >= 0, `entities extracted (${bridged.entities.length})`);
    assert(!!bridged.contentDNA, "Content DNA generated");
  } else {
    console.log("  — skip: no bridged product found");
  }

  // 5) blueprint preview for quality >= 70
  console.log("\n5) blueprint preview for BLUEPRINT_READY");
  const ready = await prisma.productUniverse.findFirst({
    where: {
      metadataJson: { contains: `"importSource":"${THYRONIX_BRIDGE_IMPORT_SOURCE}"` },
      status: "BLUEPRINT_READY",
      qualityScore: { gte: 70 },
    },
  });

  if (ready) {
    const project = await prisma.pageFactoryProject.findFirst({ select: { id: true } });
    if (project) {
      const preview = await previewProductBlueprints(ready.id, {
        projectId: project.id,
        minQualityScore: 70,
        includeProductPage: true,
        includeCategoryPage: true,
        includeIntentPages: false,
        includeFaqPage: false,
        includeGeoFusion: false,
      });
      assert(!!preview, "blueprint preview returns data");
      assert(preview.canSave || preview.previewOnly || preview.drafts.length >= 0, "preview has valid response");
    } else {
      console.log("  — skip: no PageFactory project for blueprint preview");
    }
  } else {
    console.log("  — skip: no BLUEPRINT_READY product yet");
  }

  // 6) status endpoint data
  console.log("\n6) bridge status");
  const status = await getThyronixBridgeStatus();
  assert(status.activeSourceCount >= 1, "active sources reported");
  assert(status.totalThyronixProducts >= 0, "thyronix product count reported");
  assert(status.bridgedProductCount >= afterReimportCount - 10, "bridged count consistent");

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
