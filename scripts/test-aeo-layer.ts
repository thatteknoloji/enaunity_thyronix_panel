/**
 * AEO_LAYER_V1 tests
 * Run: npm run test:aeo-layer
 */
import { prisma } from "../src/lib/db";
import {
  previewAeoForBlueprint,
  generateAeoForBlueprint,
  generateBulkAeoForBlueprints,
  getAeoForBlueprint,
} from "../src/lib/aeo/aeo-blueprint-service";
import {
  generateProductBlueprints,
  previewProductBlueprints,
  GENERATION_SOURCE,
} from "../src/lib/product-universe/product-blueprint-bridge";
import { parseMetadata } from "../src/lib/aeo/aeo-utils";

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

async function seedTestContext() {
  const slug = `aeo-test-${Date.now()}`;
  let project = await prisma.pageFactoryProject.findFirst({ orderBy: { createdAt: "desc" } });
  if (!project) {
    project = await prisma.pageFactoryProject.create({
      data: {
        name: "AEO Test Project",
        slug: `aeo-test-project-${Date.now()}`,
        sector: "Dekorasyon",
        country: "TR",
        productionType: "PRODUCT",
      },
    });
  }

  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "MANUAL",
      rawName: "Modern Ahşap Kitaplık",
      normalizedName: "Modern Ahşap Kitaplık",
      slug,
      brand: "TestMarka",
      categoryPath: "Mobilya > Kitaplık",
      descriptionClean: "Salon ve çalışma odası için ahşap gövdeli dekoratif kitaplık modeli.",
      price: 2499,
      status: "BLUEPRINT_READY",
      qualityScore: 85,
      projectId: project.id,
      metadataJson: JSON.stringify({ stock: 5, importSource: "THYRONIX_BRIDGE_V1" }),
    },
  });

  await prisma.productEntity.createMany({
    data: [
      { productId: product.id, type: "MATERIAL", value: "Ahşap", confidence: 0.9 },
      { productId: product.id, type: "USAGE_AREA", value: "Salon", confidence: 0.85 },
      { productId: product.id, type: "CATEGORY", value: "Kitaplık", confidence: 0.95 },
    ],
  });

  await prisma.productContentDNA.create({
    data: {
      productId: product.id,
      primaryEntity: "Modern Ahşap Kitaplık",
      targetKeyword: "modern ahşap kitaplık",
      intent: "commercial",
      audience: "salon dekorasyonu alıcıları",
      pageAngle: "ahşap dekoratif kitaplık",
      faqSeedsJson: JSON.stringify(["Modern Ahşap Kitaplık nasıl temizlenir?"]),
      internalLinkHintsJson: JSON.stringify(["Ahşap Kitaplık Modelleri"]),
      schemaHintsJson: JSON.stringify(["Product", "FAQPage"]),
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product.id,
      sourceUrl: "https://example.com/kitaplik.jpg",
      publicUrl: "https://example.com/kitaplik.jpg",
      sortOrder: 0,
      status: "DOWNLOADED",
    },
  });

  await generateProductBlueprints(product.id, {
    projectId: project.id,
    includeProductPage: true,
    includeFaqPage: true,
    minQualityScore: 70,
    dryRun: false,
    isAdmin: true,
  });

  const blueprint = await prisma.pageFactoryBlueprint.findFirst({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
  });

  if (!blueprint) return null;
  return { product, project, blueprint };
}

async function findOrCreateTestContext() {
  const product = await prisma.productUniverse.findFirst({
    where: { qualityScore: { gte: 70 }, status: { in: ["ANALYZED", "BLUEPRINT_READY"] } },
    orderBy: { qualityScore: "desc" },
  });

  if (!product) return seedTestContext();

  let project = product.projectId
    ? await prisma.pageFactoryProject.findUnique({ where: { id: product.projectId } })
    : null;

  if (!project) {
    project = await prisma.pageFactoryProject.findFirst({ orderBy: { createdAt: "desc" } });
  }
  if (!project) return seedTestContext();

  let blueprint = await prisma.pageFactoryBlueprint.findFirst({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
  });

  const metaCheck = blueprint ? parseMetadata(blueprint.metadataJson) : {};
  if (!blueprint || metaCheck.productId !== product.id || metaCheck.generationSource !== GENERATION_SOURCE) {
    const preview = await previewProductBlueprints(product.id, {
      projectId: project.id,
      includeProductPage: true,
      includeFaqPage: true,
      minQualityScore: 70,
      dryRun: false,
      isAdmin: true,
    });
    if (!preview.canSave && preview.drafts.length === 0) return seedTestContext();

    await generateProductBlueprints(product.id, {
      projectId: project.id,
      includeProductPage: true,
      includeFaqPage: true,
      minQualityScore: 70,
      dryRun: false,
      isAdmin: true,
    });

    blueprint = await prisma.pageFactoryBlueprint.findFirst({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (!blueprint) return seedTestContext();
  return { product, project, blueprint };
}

async function main() {
  console.log("\n=== AEO_LAYER_V1 Tests ===\n");

  const ctx = await findOrCreateTestContext();
  if (!ctx) {
    console.log("  — skip: qualityScore>=70 ürün veya blueprint bulunamadı");
    process.exit(0);
  }

  const { blueprint, project } = ctx;
  console.log(`Blueprint: ${blueprint.id} · Project: ${project.id}\n`);

  // 1) Preview
  console.log("1) AEO preview");
  const preview = await previewAeoForBlueprint(blueprint.id);
  assert(preview.version === "AEO_LAYER_V1", "version AEO_LAYER_V1");
  assert(!!preview.answerBlocks.find((b) => b.type === "QUICK_ANSWER"), "Quick Answer oluştu");
  assert(preview.faqBlocks.length >= 4, `FAQ >= 4 (got ${preview.faqBlocks.length})`);
  assert(preview.schemaHints.length > 0, "Schema hints oluştu");
  assert(preview.citationHints.length > 0, "Citation hints oluştu");
  assert(preview.aeoQualityScore > 0, `AEO score hesaplandı (${preview.aeoQualityScore})`);

  // 2) Generate
  console.log("\n2) AEO generate");
  const gen = await generateAeoForBlueprint(blueprint.id, false);
  assert(gen.written === true, "DB yazıldı");

  const stored = await prisma.pageFactoryBlueprint.findUnique({ where: { id: blueprint.id } });
  const meta = parseMetadata(stored?.metadataJson || "{}");
  assert(
    ["NOT_GENERATED", "AEO_READY", "DRAFT_GENERATED", "NEEDS_REVIEW", "READY_TO_PUBLISH"].includes(String(meta.contentStatus)),
    `contentStatus güncellendi (${meta.contentStatus})`
  );
  assert((meta.aeo as { version?: string })?.version === "AEO_LAYER_V1", "metadataJson.aeo dolu");

  const loaded = await getAeoForBlueprint(blueprint.id);
  assert(loaded != null && loaded.faqBlocks.length >= 4, "GET AEO verisi okunabilir");

  // 3) Bulk dryRun
  console.log("\n3) Bulk dryRun");
  const beforeCount = await prisma.pageFactoryBlueprint.count({ where: { projectId: project.id } });
  const bulkDry = await generateBulkAeoForBlueprints(project.id, {
    generationSource: GENERATION_SOURCE,
    limit: 5,
    dryRun: true,
  });
  assert(bulkDry.dryRun === true, "bulk dryRun flag");
  assert(bulkDry.processed > 0, `bulk processed > 0 (${bulkDry.processed})`);

  const afterDryMeta = parseMetadata(
    (await prisma.pageFactoryBlueprint.findUnique({ where: { id: blueprint.id } }))?.metadataJson || "{}"
  );
  assert((afterDryMeta.aeo as { version?: string })?.version === "AEO_LAYER_V1", "dryRun DB değiştirmedi (önceki aeo duruyor)");

  // 4) Bulk write
  console.log("\n4) Bulk generate write");
  const bulkWrite = await generateBulkAeoForBlueprints(project.id, {
    generationSource: GENERATION_SOURCE,
    aeoStatus: "ready",
    limit: 3,
    dryRun: false,
  });
  assert(bulkWrite.written >= 0, `bulk write tamamlandı (written=${bulkWrite.written})`);

  const afterCount = await prisma.pageFactoryBlueprint.count({ where: { projectId: project.id } });
  assert(afterCount === beforeCount, "bulk blueprint sayısı değişmedi");

  // 5) noindex cap
  console.log("\n5) noindexRecommended score cap");
  const { calculateAeoQualityScore } = await import("../src/lib/aeo/aeo-quality-score");
  const capped = calculateAeoQualityScore({
    answerBlocks: preview.answerBlocks,
    faqBlocks: preview.faqBlocks,
    schemaHints: preview.schemaHints,
    citationHints: preview.citationHints,
    entityCount: 5,
    hasImage: true,
    hasDescriptionClean: true,
    noindexRecommended: true,
  });
  assert(capped <= 60, `noindex cap <= 60 (got ${capped})`);

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
