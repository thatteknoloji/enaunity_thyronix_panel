/**
 * PAGE_FACTORY_PIPELINE_AND_PUBLISH_FIX_V1 tests
 * Run: npm run test:pipeline-fix
 */
import { prisma } from "../src/lib/db";
import {
  matchesGenerationSource,
  resolveGenerationSourceFilter,
} from "../src/lib/page-factory/pipeline/pipeline-source-filter";
import {
  previewPipeline,
  runPipeline,
} from "../src/lib/page-factory/pipeline/page-factory-pipeline-service";
import { BATCH_GENERATION_SOURCE } from "../src/lib/product-universe/blueprint-batch-types";
import { generateBlueprintBatch } from "../src/lib/product-universe/blueprint-batch-engine";

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

async function seed(ts: number) {
  const project = await prisma.pageFactoryProject.create({
    data: {
      name: `Pipeline Fix ${ts}`,
      slug: `pipeline-fix-${ts}`,
      sector: "Dekorasyon",
      productionType: "PRODUCT",
    },
  });

  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "TRENDYOL",
      rawName: "Pipeline Fix Ürün",
      normalizedName: "Pipeline Fix Ürün",
      slug: `pipeline-fix-prod-${ts}`,
      brand: "FixMarka",
      categoryPath: "Ev > Dekorasyon",
      descriptionClean: "Pipeline fix test için yeterince uzun açıklama metni.",
      price: 299,
      status: "BLUEPRINT_READY",
      qualityScore: 82,
      projectId: project.id,
      metadataJson: JSON.stringify({ stock: 5 }),
    },
  });

  await prisma.productContentDNA.create({
    data: {
      productId: product.id,
      primaryEntity: "Pipeline Fix Ürün",
      targetKeyword: "pipeline fix",
      intent: "commercial",
      audience: "ev",
      pageAngle: "dekor",
      faqSeedsJson: "[]",
      internalLinkHintsJson: "[]",
      schemaHintsJson: "[]",
    },
  });

  await generateBlueprintBatch(
    { projectId: project.id, minQualityScore: 70, limit: 5, brand: "FixMarka", blueprintTypes: ["product_detail"] },
    { isAdmin: true }
  );

  await prisma.pageFactoryBlueprint.create({
    data: {
      projectId: project.id,
      title: "GEO Blueprint Test",
      pageType: "GEO",
      metadataJson: JSON.stringify({
        generationSource: "BLUEPRINT_UNIVERSE_V2",
        geoPath: "İstanbul > Kadıköy",
        status: "READY",
        blueprintKind: "PRODUCT_GEO",
      }),
    },
  });

  await prisma.pageFactoryBlueprint.create({
    data: {
      projectId: project.id,
      title: "Legacy Blueprint",
      pageType: "category",
      metadataJson: JSON.stringify({ status: "DRAFT", title: "Legacy" }),
    },
  });

  return { project, product, ts };
}

async function cleanup(projectId: string, productId: string) {
  await prisma.pageFactoryPublishedPage.deleteMany({ where: { projectId } });
  await prisma.pageFactoryPublishGate.deleteMany({ where: { projectId } });
  await prisma.pageFactoryContentDraft.deleteMany({ where: { projectId } });
  await prisma.pageFactoryPipelineJob.deleteMany({ where: { projectId } });
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });
  await prisma.productContentDNA.deleteMany({ where: { productId } });
  await prisma.productUniverse.delete({ where: { id: productId } }).catch(() => {});
  await prisma.pageFactoryProject.delete({ where: { id: projectId } }).catch(() => {});
}

console.log("\n=== PAGE_FACTORY_PIPELINE_AND_PUBLISH_FIX_V1 Tests ===\n");

const ts = Date.now();
const ctx = await seed(ts);

try {
  console.log("Source filter:");
  assert(resolveGenerationSourceFilter("ALL") === "ALL", "ALL resolve");
  assert(
    matchesGenerationSource("PRODUCT_UNIVERSE_V2", { productId: "x", generationSource: BATCH_GENERATION_SOURCE }, "product_detail"),
    "PRODUCT_UNIVERSE_V2 match"
  );
  assert(
    matchesGenerationSource("GEO_UNIVERSE", { generationSource: "BLUEPRINT_UNIVERSE_V2", geoPath: "A > B" }, "GEO"),
    "GEO_UNIVERSE match"
  );
  assert(matchesGenerationSource("ALL", {}, "anything"), "ALL matches anything");

  console.log("\nPreview ALL:");
  const total = await prisma.pageFactoryBlueprint.count({ where: { projectId: ctx.project.id } });
  const previewAll = await previewPipeline({ projectId: ctx.project.id, generationSource: "ALL", limit: 10 }, { isAdmin: true });
  assert(previewAll.totalBlueprints > 0, "ALL seçilince blueprint > 0");
  assert(previewAll.totalCandidates === total, "totalCandidates doğru");
  assert(previewAll.generationSource === "ALL", "generationSource ALL");

  console.log("\nPreview wrong source fallback:");
  const previewWrong = await previewPipeline(
    { projectId: ctx.project.id, generationSource: "NONEXISTENT_SOURCE_XYZ", limit: 10 },
    { isAdmin: true }
  );
  assert(previewWrong.totalBlueprints > 0, "Tanımsız kaynakta fallback > 0");

  console.log("\nFull pipeline run:");
  const run1 = await runPipeline(
    { projectId: ctx.project.id, generationSource: "ALL", limit: 5 },
    { isAdmin: true }
  );
  assert(run1.totalBlueprints > 0, "Run blueprint seçer");
  assert(run1.processed > 0, "processed > 0");
  assert(run1.aeoGenerated > 0 || run1.draftsGenerated > 0, "AEO veya draft üretildi");

  const gates = await prisma.pageFactoryPublishGate.count({ where: { projectId: ctx.project.id } });
  assert(gates > 0, "Gate kayıtları oluştu");

  console.log("\nIdempotent re-run:");
  const run2 = await runPipeline(
    { projectId: ctx.project.id, generationSource: "ALL", limit: 5 },
    { isAdmin: true }
  );
  assert(run2.aeoGenerated > 0 || run2.draftsGenerated > 0, "Re-run update sayılır");

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  await cleanup(ctx.project.id, ctx.product.id);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  await cleanup(ctx.project.id, ctx.product.id).catch(() => {});
  process.exit(1);
}
