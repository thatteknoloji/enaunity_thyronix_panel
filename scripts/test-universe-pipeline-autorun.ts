/**
 * PAGE_FACTORY_UNIVERSE_TO_PIPELINE_AUTORUN_V1 tests
 * Run: npm run test:universe-pipeline-autorun
 */
import { prisma } from "../src/lib/db";
import { generateUniverseFromProducts } from "../src/lib/page-factory/universe/universe-generator-service";
import { runPipelineForUniverseJob } from "../src/lib/page-factory/universe/universe-pipeline-service";
import { UNIVERSE_GENERATION_SOURCE } from "../src/lib/page-factory/universe/universe-types";
import { getPublishedPageBySlug } from "../src/lib/page-factory/publish/page-index-service";

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

async function seedProduct(ts: number, projectId: string) {
  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "MANUAL",
      rawName: `Autorun Test Ürün ${ts}`,
      normalizedName: `Autorun Test Ürün ${ts}`,
      slug: `autorun-test-${ts}`,
      brand: "AutorunMarka",
      categoryPath: "Elektronik > Aksesuar",
      descriptionClean: "Universe pipeline autorun test için yeterli uzunlukta açıklama metni.",
      price: 249,
      status: "BLUEPRINT_READY",
      qualityScore: 85,
      projectId,
      metadataJson: JSON.stringify({ stock: 5 }),
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product.id,
      sourceUrl: "https://example.com/a.jpg",
      publicUrl: "https://example.com/a.jpg",
      sortOrder: 0,
      status: "DOWNLOADED",
    },
  });

  await prisma.productEntity.create({
    data: { productId: product.id, type: "BRAND", value: "AutorunMarka", confidence: 0.9 },
  });

  await prisma.productContentDNA.create({
    data: {
      productId: product.id,
      primaryEntity: `Autorun Test Ürün ${ts}`,
      targetKeyword: "autorun test ürün",
      intent: "commercial",
      audience: "genel",
      pageAngle: "rehber",
      faqSeedsJson: JSON.stringify(["Nasıl kullanılır?", "Uyumlu mu?"]),
      internalLinkHintsJson: "[]",
      schemaHintsJson: "[]",
    },
  });

  return product;
}

async function cleanupArtifacts(projectId: string) {
  await prisma.pageFactoryPublishedPage.deleteMany({ where: { projectId } });
  await prisma.pageFactoryPublishGate.deleteMany({ where: { projectId } });
  await prisma.pageFactoryContentDraft.deleteMany({ where: { projectId } });
  await prisma.pageFactoryPipelineJob.deleteMany({ where: { projectId } });
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });
  await prisma.pageFactoryUniverseJob.deleteMany({ where: { projectId } });
}

async function cleanup(projectId: string, productIds: string[]) {
  await cleanupArtifacts(projectId);
  for (const pid of productIds) {
    await prisma.productImage.deleteMany({ where: { productId: pid } });
    await prisma.productEntity.deleteMany({ where: { productId: pid } });
    await prisma.productContentDNA.deleteMany({ where: { productId: pid } });
    await prisma.productUniverse.delete({ where: { id: pid } }).catch(() => {});
  }
  await prisma.pageFactoryProject.delete({ where: { id: projectId } }).catch(() => {});
}

function blueprintMeta(bp: { metadataJson: string }) {
  return JSON.parse(bp.metadataJson || "{}") as Record<string, unknown>;
}

console.log("\n=== PAGE_FACTORY_UNIVERSE_TO_PIPELINE_AUTORUN_V1 Tests ===\n");

const ts = Date.now();
const project = await prisma.pageFactoryProject.create({
  data: {
    name: `Universe Autorun Test ${ts}`,
    slug: `universe-autorun-${ts}`,
    sector: "Elektronik",
    productionType: "PRODUCT",
  },
});

const productIds: string[] = [];

try {
  const p1 = await seedProduct(ts, project.id);
  productIds.push(p1.id);

  console.log("autoRunPipeline=false → sadece blueprint:");
  const noAuto = await generateUniverseFromProducts(
    {
      projectId: project.id,
      includeGeo: false,
      limit: 1,
      minQualityScore: 0,
      autoRunPipeline: false,
    },
    { isAdmin: true }
  );
  assert(noAuto.generatedBlueprints >= 11, "≥11 blueprint üretildi");
  assert(!noAuto.pipelineJobId, "pipeline job oluşmadı");

  const pipelineJobsAfterNoAuto = await prisma.pageFactoryPipelineJob.count({
    where: { projectId: project.id },
  });
  assert(pipelineJobsAfterNoAuto === 0, "DB'de pipeline job yok");

  const bps = await prisma.pageFactoryBlueprint.findMany({ where: { projectId: project.id } });
  assert(bps.length >= 11, "blueprint kayıtları var");
  for (const bp of bps) {
    const m = blueprintMeta(bp);
    assert(m.generationSource === UNIVERSE_GENERATION_SOURCE, "generationSource PRODUCT_UNIVERSE_BRIDGE_V2");
    assert(m.universeJobId === noAuto.jobId, "universeJobId job ile eşleşir");
    assert(m.autoPipelineEligible === true, "autoPipelineEligible true");
  }

  console.log("\nManuel run-pipeline → pipeline job:");
  const pipe1 = await runPipelineForUniverseJob(
    noAuto.jobId,
    { autoRunPipeline: true, autoPublishInternal: false, pipelineLimit: 50, minPublishScore: 70 },
    { isAdmin: true }
  );
  assert(!!pipe1.jobId, "pipeline job oluştu");
  assert(pipe1.processedBlueprints > 0, "blueprint işlendi");
  assert(pipe1.draftsGenerated > 0 || pipe1.aeoGenerated > 0, "AEO veya draft üretildi");
  assert(pipe1.gatesGenerated > 0, "gate üretildi");

  const draftCount1 = await prisma.pageFactoryContentDraft.count({ where: { projectId: project.id } });
  const gateCount1 = await prisma.pageFactoryPublishGate.count({ where: { projectId: project.id } });
  assert(draftCount1 > 0, "draft kayıtları var");
  assert(gateCount1 > 0, "gate kayıtları var");

  console.log("\nTekrar pipeline → duplicate oluşmamalı:");
  const pipe2 = await runPipelineForUniverseJob(
    noAuto.jobId,
    { autoRunPipeline: true, autoPublishInternal: false, pipelineLimit: 50, minPublishScore: 70 },
    { isAdmin: true }
  );
  const draftCount2 = await prisma.pageFactoryContentDraft.count({ where: { projectId: project.id } });
  const gateCount2 = await prisma.pageFactoryPublishGate.count({ where: { projectId: project.id } });
  assert(draftCount2 === draftCount1, "draft duplicate yok");
  assert(gateCount2 === gateCount1, "gate duplicate yok");
  assert(pipe2.processedBlueprints > 0, "re-run işlem yapıldı");

  console.log("\nautoPublishInternal=true → published page (ayrı job, ilk pipeline):");
  await cleanupArtifacts(project.id);
  for (const pid of [...productIds]) {
    await prisma.productImage.deleteMany({ where: { productId: pid } });
    await prisma.productEntity.deleteMany({ where: { productId: pid } });
    await prisma.productContentDNA.deleteMany({ where: { productId: pid } });
    await prisma.productUniverse.delete({ where: { id: pid } }).catch(() => {});
  }
  productIds.length = 0;
  const pPub = await seedProduct(ts + 100, project.id);
  productIds.push(pPub.id);

  const pubGen = await generateUniverseFromProducts(
    {
      projectId: project.id,
      includeGeo: false,
      limit: 1,
      minQualityScore: 0,
      autoRunPipeline: false,
    },
    { isAdmin: true }
  );
  const pipePub = await runPipelineForUniverseJob(
    pubGen.jobId,
    { autoRunPipeline: true, autoPublishInternal: true, pipelineLimit: 11, minPublishScore: 0 },
    { isAdmin: true }
  );
  assert(
    (pipePub.pagesPublished ?? 0) + (pipePub.pagesUpdated ?? 0) > 0,
    "en az bir published page oluştu"
  );

  const published = await prisma.pageFactoryPublishedPage.findMany({
    where: { projectId: project.id, status: "PUBLISHED_INTERNAL" },
  });
  assert(published.length > 0, "published page kayıtları var");

  const page = published[0];
  const bySlug = await getPublishedPageBySlug(page.slug);
  assert(!!bySlug, `/pf/{slug} lookup çalışır (${page.slug})`);

  console.log("\nautoRunPipeline=true → otomatik pipeline:");
  await cleanupArtifacts(project.id);
  for (const pid of [...productIds]) {
    await prisma.productImage.deleteMany({ where: { productId: pid } });
    await prisma.productEntity.deleteMany({ where: { productId: pid } });
    await prisma.productContentDNA.deleteMany({ where: { productId: pid } });
    await prisma.productUniverse.delete({ where: { id: pid } }).catch(() => {});
  }
  productIds.length = 0;
  const p2 = await seedProduct(ts + 1, project.id);
  productIds.push(p2.id);

  const withAuto = await generateUniverseFromProducts(
    {
      projectId: project.id,
      includeGeo: false,
      limit: 1,
      minQualityScore: 0,
      autoRunPipeline: true,
      autoPublishInternal: true,
      pipelineLimit: 50,
      minPublishScore: 0,
    },
    { isAdmin: true }
  );
  assert(!!withAuto.pipelineJobId, "universe job sonrası pipeline job oluştu");
  assert(!!withAuto.pipelineResult, "pipelineResult döndü");
  assert((withAuto.pipelineResult?.processedBlueprints ?? 0) > 0, "pipeline blueprint işledi");

  const jobBps = await prisma.pageFactoryBlueprint.findMany({ where: { projectId: project.id } });
  const otherJobBps = jobBps.filter((bp) => blueprintMeta(bp).universeJobId !== withAuto.jobId);
  assert(otherJobBps.length === 0, "sadece ilgili universeJobId blueprintleri");

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  await cleanup(project.id, productIds);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  await cleanup(project.id, productIds).catch(() => {});
  process.exit(1);
}
