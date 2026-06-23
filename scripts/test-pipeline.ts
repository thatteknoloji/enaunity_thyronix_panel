/**
 * AEO_BULK_DRAFT_PIPELINE_V1 tests
 * Run: npm run test:pipeline
 */
import { prisma } from "../src/lib/db";
import { parseMetadata } from "../src/lib/aeo/aeo-utils";
import {
  previewPipeline,
  runPipeline,
  getPipelineJob,
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

async function seed() {
  const ts = Date.now();
  const project = await prisma.pageFactoryProject.create({
    data: {
      name: `Pipeline Test ${ts}`,
      slug: `pipeline-test-${ts}`,
      sector: "Dekorasyon",
      productionType: "PRODUCT",
    },
  });

  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "TRENDYOL",
      rawName: "Pipeline Test Ürün",
      normalizedName: "Pipeline Test Ürün",
      slug: `pipeline-prod-${ts}`,
      brand: "PipeMarka",
      categoryPath: "Ev > Dekorasyon",
      descriptionClean: "Pipeline test için uzun açıklama metni yeterli olmalıdır.",
      price: 299,
      status: "BLUEPRINT_READY",
      qualityScore: 82,
      projectId: project.id,
      metadataJson: JSON.stringify({ stock: 5 }),
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product.id,
      sourceUrl: "https://example.com/pipe.jpg",
      publicUrl: "https://example.com/pipe.jpg",
      sortOrder: 0,
      status: "DOWNLOADED",
    },
  });

  await prisma.productContentDNA.create({
    data: {
      productId: product.id,
      primaryEntity: "Pipeline Test Ürün",
      targetKeyword: "pipeline test ürün",
      intent: "commercial",
      audience: "ev dekorasyon",
      pageAngle: "dekoratif",
      faqSeedsJson: JSON.stringify(["Nasıl kullanılır?"]),
      internalLinkHintsJson: "[]",
      schemaHintsJson: "[]",
    },
  });

  const batch = await generateBlueprintBatch(
    {
      projectId: project.id,
      minQualityScore: 70,
      limit: 10,
      blueprintTypes: ["product_detail"],
      brand: "PipeMarka",
    },
    { isAdmin: true }
  );
  assert(batch.generatedCount >= 1, "Batch blueprint üretildi");

  const blueprint = await prisma.pageFactoryBlueprint.findFirst({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });
  if (!blueprint) throw new Error("Blueprint bulunamadı");

  return { project, product, blueprint, ts };
}

async function cleanup(projectId: string, productId: string) {
  await prisma.pageFactoryPublishGate.deleteMany({
    where: { projectId },
  });
  await prisma.pageFactoryContentDraft.deleteMany({
    where: { projectId },
  });
  await prisma.pageFactoryPipelineJob.deleteMany({
    where: { projectId },
  });
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });
  await prisma.productImage.deleteMany({ where: { productId } });
  await prisma.productContentDNA.deleteMany({ where: { productId } });
  await prisma.productUniverse.delete({ where: { id: productId } }).catch(() => {});
  await prisma.pageFactoryProject.delete({ where: { id: projectId } }).catch(() => {});
}

console.log("\n=== AEO Bulk + Draft Pipeline V1 Tests ===\n");

const ctx = await seed();

try {
  const filters = {
    projectId: ctx.project.id,
    generationSource: BATCH_GENERATION_SOURCE,
    minQualityScore: 70,
    limit: 10,
  };

  console.log("Preview (DB yazmaz):");
  const jobsBefore = await prisma.pageFactoryPipelineJob.count();
  const draftsBefore = await prisma.pageFactoryContentDraft.count({
    where: { projectId: ctx.project.id },
  });
  const preview = await previewPipeline(filters, { isAdmin: true });
  const jobsAfterPreview = await prisma.pageFactoryPipelineJob.count();
  const draftsAfterPreview = await prisma.pageFactoryContentDraft.count({
    where: { projectId: ctx.project.id },
  });
  assert(jobsAfterPreview === jobsBefore, "Preview job oluşturmaz");
  assert(draftsAfterPreview === draftsBefore, "Preview draft oluşturmaz");
  assert(preview.totalBlueprints >= 1, "Preview en az 1 blueprint seçer");
  assert(preview.needsAeo >= 1, "AEO ihtiyacı tespit edilir");

  console.log("\nFull pipeline run:");
  const run1 = await runPipeline(filters, { isAdmin: true });
  assert(run1.aeoGenerated >= 1, "Run AEO üretir");
  assert(run1.draftsGenerated >= 1, "Run draft üretir");
  assert(run1.gatePassed + run1.gateWarning + run1.gateBlocked >= 1, "Run gate sonucu oluşturur");
  assert(run1.jobId !== "dry-run", "Job kaydı oluşturulur");

  const job = await getPipelineJob(run1.jobId);
  assert(job?.status === "COMPLETED", "Job status COMPLETED");

  const bpMeta = parseMetadata(
    (await prisma.pageFactoryBlueprint.findUnique({ where: { id: ctx.blueprint.id } }))?.metadataJson || "{}"
  );
  assert(bpMeta.aeo != null, "Blueprint metadata AEO içerir");

  const draft = await prisma.pageFactoryContentDraft.findFirst({
    where: { blueprintId: ctx.blueprint.id },
  });
  assert(!!draft, "Content draft kaydı var");

  const gate = draft
    ? await prisma.pageFactoryPublishGate.findFirst({ where: { draftId: draft.id } })
    : null;
  assert(!!gate, "Publish gate kaydı var");

  console.log("\nIdempotent re-run (duplicate üretmez):");
  const run2 = await runPipeline(filters, { isAdmin: true });
  assert(run2.aeoGenerated === 0, "Tekrar run AEO duplicate üretmez");
  assert(run2.draftsGenerated === 0, "Tekrar run draft duplicate üretmez");

  console.log("\nDry-run (DB yazmaz):");
  const dryJobsBefore = await prisma.pageFactoryPipelineJob.count();
  const dryRun = await runPipeline({ ...filters, dryRun: true }, { isAdmin: true });
  const dryJobsAfter = await prisma.pageFactoryPipelineJob.count();
  assert(dryRun.dryRun === true, "dryRun flag true");
  assert(dryJobsAfter === dryJobsBefore, "dryRun job oluşturmaz");

  console.log("\nMode: aeo_only (draft/gate atlanır):");
  await cleanup(ctx.project.id, ctx.product.id);
  const ctx2 = await seed();
  const aeoOnly = await runPipeline(
    { projectId: ctx2.project.id, generationSource: BATCH_GENERATION_SOURCE, limit: 10, mode: "aeo_only" },
    { isAdmin: true }
  );
  assert(aeoOnly.aeoGenerated >= 1, "aeo_only AEO üretir");
  assert(aeoOnly.draftsGenerated === 0, "aeo_only draft üretmez");
  await cleanup(ctx2.project.id, ctx2.product.id);

  await cleanup(ctx2.project.id, ctx2.product.id);

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  await cleanup(ctx.project.id, ctx.product.id).catch(() => {});
  process.exit(1);
}
