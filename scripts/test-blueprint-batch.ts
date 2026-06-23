/**
 * PRODUCT_UNIVERSE_BLUEPRINT_BATCH_V1 tests
 * Run: npm run test:blueprint-batch
 */
import { prisma } from "../src/lib/db";
import {
  previewBlueprintBatch,
  generateBlueprintBatch,
  getBlueprintBatchJob,
} from "../src/lib/product-universe/blueprint-batch-engine";
import { BATCH_GENERATION_SOURCE } from "../src/lib/product-universe/blueprint-batch-types";
import { listProductUniverseBlueprints } from "../src/lib/product-universe/product-blueprint-bridge";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

async function seed() {
  const ts = Date.now();
  const project = await prisma.pageFactoryProject.create({
    data: {
      name: `Batch Test Project ${ts}`,
      slug: `batch-test-${ts}`,
      sector: "Dekorasyon",
      productionType: "PRODUCT",
    },
  });

  const high = await prisma.productUniverse.create({
    data: {
      sourceType: "TRENDYOL",
      rawName: "Batch Test Ürün A",
      normalizedName: "Batch Test Ürün A",
      slug: `batch-a-${ts}`,
      brand: "BatchMarka",
      categoryPath: "Ev > Dekorasyon",
      descriptionClean: "Uzun açıklamalı batch test ürünü için detaylı açıklama metni.",
      price: 199,
      status: "BLUEPRINT_READY",
      qualityScore: 85,
      projectId: project.id,
      metadataJson: JSON.stringify({ stock: 10 }),
    },
  });

  const low = await prisma.productUniverse.create({
    data: {
      sourceType: "TRENDYOL",
      rawName: "Batch Test Düşük",
      normalizedName: "Batch Test Düşük",
      slug: `batch-low-${ts}`,
      brand: "BatchMarka",
      status: "BLUEPRINT_READY",
      qualityScore: 55,
      metadataJson: "{}",
    },
  });

  const noImg = await prisma.productUniverse.create({
    data: {
      sourceType: "CSV",
      rawName: "Batch No Image",
      normalizedName: "Batch No Image",
      slug: `batch-noimg-${ts}`,
      brand: "BatchMarka",
      categoryPath: "Ev",
      descriptionClean: "Görselsiz ürün test açıklaması yeterince uzun.",
      status: "BLUEPRINT_READY",
      qualityScore: 75,
      metadataJson: JSON.stringify({ stock: 0 }),
    },
  });

  await prisma.productImage.create({
    data: { productId: high.id, sourceUrl: "https://example.com/a.jpg", publicUrl: "https://example.com/a.jpg", sortOrder: 0, status: "PENDING" },
  });

  await prisma.productContentDNA.create({
    data: {
      productId: high.id,
      primaryEntity: "Batch Test Ürün A",
      targetKeyword: "batch test ürün",
      intent: "commercial",
      audience: "ev dekorasyon",
      pageAngle: "dekoratif ürün",
      faqSeedsJson: JSON.stringify(["Nasıl kullanılır?"]),
      internalLinkHintsJson: "[]",
      schemaHintsJson: "[]",
    },
  });

  return { project, high, low, noImg, ts };
}

async function cleanup(ids: { high: string; low: string; noImg: string; projectId: string }) {
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId: ids.projectId } });
  await prisma.productUniverseBlueprintJob.deleteMany({});
  for (const pid of [ids.high, ids.low, ids.noImg]) {
    await prisma.productImage.deleteMany({ where: { productId: pid } });
    await prisma.productContentDNA.deleteMany({ where: { productId: pid } });
    await prisma.productUniverse.delete({ where: { id: pid } }).catch(() => {});
  }
  await prisma.pageFactoryProject.delete({ where: { id: ids.projectId } }).catch(() => {});
}

console.log("\n=== Blueprint Batch V1 Tests ===\n");

const ctx = await seed();

try {
  console.log("Preview (dry-run, DB yazmaz):");
  const beforeCount = await prisma.pageFactoryBlueprint.count({ where: { projectId: ctx.project.id } });
  const preview = await previewBlueprintBatch(
    {
      projectId: ctx.project.id,
      minQualityScore: 70,
      limit: 50,
      blueprintTypes: ["product_detail", "product_faq"],
    },
    { isAdmin: true }
  );
  const afterPreviewCount = await prisma.pageFactoryBlueprint.count({ where: { projectId: ctx.project.id } });
  assert(afterPreviewCount === beforeCount, "Preview DB'ye yazmaz");
  assert(preview.estimatedBlueprints >= 1, "Tahmini blueprint > 0");
  assert(preview.sampleBlueprints.length <= 20, "Sample max 20");
  assert(
    preview.sampleBlueprints.some((s) => s.blueprintType === "product_detail"),
    "product_detail önizlemede"
  );
  assert(
    preview.sampleBlueprints.some((s) => s.blueprintType === "product_faq"),
    "product_faq önizlemede"
  );

  console.log("\nKalite filtresi (<70 atlanır):");
  const lowPreview = await previewBlueprintBatch(
    { minQualityScore: 70, brand: "BatchMarka", limit: 50 },
    { isAdmin: true }
  );
  const hasLow = lowPreview.sampleBlueprints.some((s) => s.productName.includes("Düşük"));
  assert(!hasLow, "qualityScore <70 ürün atlandı");

  console.log("\nGörsel filtresi:");
  const imgPreview = await previewBlueprintBatch(
    { onlyWithImages: true, minQualityScore: 70, limit: 50 },
    { isAdmin: true }
  );
  assert(imgPreview.sampleBlueprints.every((s) => s.productName !== "Batch No Image"), "onlyWithImages filtresi");

  console.log("\nStok filtresi:");
  const stockPreview = await previewBlueprintBatch(
    { onlyInStock: true, minQualityScore: 70, limit: 50 },
    { isAdmin: true }
  );
  assert(stockPreview.eligibleProducts >= 1, "onlyInStock en az 1 ürün");

  console.log("\nGenerate (DB'ye yazar):");
  const gen = await generateBlueprintBatch(
    {
      projectId: ctx.project.id,
      minQualityScore: 70,
      limit: 10,
      blueprintTypes: ["product_detail", "product_faq"],
      duplicateMode: "skip",
      dryRun: false,
    },
    { isAdmin: true }
  );
  assert(gen.generatedCount >= 1, "Generate blueprint oluşturdu");
  assert(gen.jobId !== "dry-run", "Job oluşturuldu");

  const job = await getBlueprintBatchJob(gen.jobId);
  assert(!!job && job.status === "COMPLETED", "Job COMPLETED");

  const bps = await prisma.pageFactoryBlueprint.findMany({ where: { projectId: ctx.project.id } });
  assert(bps.length >= 1, "PageFactoryBlueprint kayıtları var");

  const batchBp = bps.find((bp) => {
    try {
      return (JSON.parse(bp.metadataJson || "{}") as { generationSource?: string }).generationSource === BATCH_GENERATION_SOURCE;
    } catch {
      return false;
    }
  });
  assert(!!batchBp, "Batch blueprint bulundu");
  const meta = JSON.parse(batchBp!.metadataJson || "{}") as Record<string, unknown>;
  assert(meta.generationSource === BATCH_GENERATION_SOURCE, "metadata generationSource");
  assert(!!meta.productUniverseId, "metadata productUniverseId");
  assert(!!meta.contentDNA || !!meta.productName, "metadata contentDNA/productName");
  assert(meta.contentStatus === "NOT_GENERATED", "contentStatus NOT_GENERATED");

  console.log("\nDuplicate skip:");
  const gen2 = await generateBlueprintBatch(
    {
      projectId: ctx.project.id,
      minQualityScore: 70,
      limit: 10,
      blueprintTypes: ["product_detail"],
      duplicateMode: "skip",
      dryRun: false,
    },
    { isAdmin: true }
  );
  assert(gen2.duplicateCount >= 1 || gen2.skippedCount >= 1, "Duplicate skip çalışır");

  console.log("\nDuplicate update:");
  const gen3 = await generateBlueprintBatch(
    {
      projectId: ctx.project.id,
      minQualityScore: 70,
      limit: 10,
      blueprintTypes: ["product_detail"],
      duplicateMode: "update",
      dryRun: false,
    },
    { isAdmin: true }
  );
  assert(gen3.generatedCount >= 1, "duplicateMode update metadata günceller");

  console.log("\nBlueprint listesi:");
  const sp = new URLSearchParams({
    projectId: ctx.project.id,
    generationSource: BATCH_GENERATION_SOURCE,
  });
  const listed = await listProductUniverseBlueprints(sp, null);
  assert(listed.items.length >= 1, "Blueprint listesinde görünür");
} finally {
  await cleanup({ high: ctx.high.id, low: ctx.low.id, noImg: ctx.noImg.id, projectId: ctx.project.id });
}

console.log(`\n=== Sonuç: ${passed} geçti, ${failed} başarısız ===\n`);
if (failed > 0) process.exit(1);
