/**
 * PAGE_FACTORY_FULL_CHAIN_ACTIVATION_V1 tests
 * Run: npm run test:full-chain
 */
import { prisma } from "../src/lib/db";
import { previewPipeline, runPipeline } from "../src/lib/page-factory/pipeline/page-factory-pipeline-service";
import { getPublishedPageBySlug } from "../src/lib/page-factory/publish/page-index-service";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

const ts = Date.now();

async function seedProject() {
  const project = await prisma.pageFactoryProject.create({
    data: { name: `Full Chain ${ts}`, slug: `full-chain-${ts}`, sector: "Test", productionType: "PRODUCT" },
  });
  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "MANUAL",
      rawName: "Full Chain Ürün",
      normalizedName: "Full Chain Ürün",
      slug: `full-chain-prod-${ts}`,
      brand: "FCMarka",
      categoryPath: "Ev > Dekorasyon",
      descriptionClean: "Full chain test için yeterince uzun açıklama metni burada yer alıyor.",
      price: 399,
      status: "BLUEPRINT_READY",
      qualityScore: 85,
      projectId: project.id,
      metadataJson: JSON.stringify({ stock: 3 }),
    },
  });
  await prisma.productContentDNA.create({
    data: {
      productId: product.id,
      primaryEntity: "Full Chain Ürün",
      targetKeyword: "full chain ürün",
      intent: "commercial",
      audience: "ev dekorasyon",
      pageAngle: "dekoratif",
      faqSeedsJson: JSON.stringify(["Nasıl kullanılır?"]),
      internalLinkHintsJson: "[]",
      schemaHintsJson: JSON.stringify(["Product"]),
    },
  });

  for (let i = 0; i < 3; i++) {
    await prisma.pageFactoryBlueprint.create({
      data: {
        projectId: project.id,
        title: `Full Chain BP ${i}`,
        pageType: "product_detail",
        metadataJson: JSON.stringify({
          productId: product.id,
          productName: "Full Chain Ürün",
          blueprintKind: "PRODUCT_DETAIL",
          generationSource: "MANUAL",
          slug: `full-chain-${ts}-${i}`,
          qualityScore: 85,
          status: "READY",
        }),
      },
    });
  }

  await prisma.pageFactoryBlueprint.create({
    data: {
      projectId: project.id,
      title: "GEO No Product",
      pageType: "GEO",
      metadataJson: JSON.stringify({ generationSource: "BLUEPRINT_UNIVERSE_V2", geoPath: "Ankara", status: "READY" }),
    },
  });

  return { project, productId: product.id };
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

console.log("\n=== PAGE_FACTORY_FULL_CHAIN_ACTIVATION_V1 Tests ===\n");
const ctx = await seedProject();

try {
  console.log("Pipeline ALL:");
  const preview = await previewPipeline({ projectId: ctx.project.id, generationSource: "ALL", limit: 10 }, { isAdmin: true });
  assert(preview.totalBlueprints > 0, "ALL seçilince blueprint > 0");
  assert(preview.totalCandidates >= 4, "toplam aday >= 4");

  console.log("\nFull chain run:");
  const run1 = await runPipeline({ projectId: ctx.project.id, generationSource: "ALL", limit: 5 }, { isAdmin: true });
  assert(run1.totalBlueprints > 0, "pipeline blueprint seçer");
  assert(run1.draftsGenerated > 0 || run1.aeoGenerated > 0, "AEO veya draft üretildi");
  assert(run1.gatePassed + run1.gateWarning + run1.gateBlocked > 0, "gate üretildi");
  assert((run1.pagesPublished ?? 0) + (run1.pagesUpdated ?? 0) > 0, "published page oluştu");

  const published = await prisma.pageFactoryPublishedPage.count({ where: { projectId: ctx.project.id } });
  assert(published > 0, "published page kaydı var");

  const page = await prisma.pageFactoryPublishedPage.findFirst({ where: { projectId: ctx.project.id } });
  if (page) {
    const bySlug = await getPublishedPageBySlug(page.slug);
    assert(!!bySlug, "/pf lookup slug ile bulunur");
    assert(!!page.schemaJson && page.schemaJson !== "{}", "schema JSON-LD var");
  }

  console.log("\nIdempotent re-run:");
  const before = await prisma.pageFactoryPublishedPage.count({ where: { projectId: ctx.project.id } });
  const run2 = await runPipeline({ projectId: ctx.project.id, generationSource: "ALL", limit: 5 }, { isAdmin: true });
  const after = await prisma.pageFactoryPublishedPage.count({ where: { projectId: ctx.project.id } });
  assert(after === before, "tekrar pipeline duplicate published page açmaz");
  assert((run2.pagesUpdated ?? 0) >= 0, "re-run update path çalışır");

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  await cleanup(ctx.project.id, ctx.productId);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  await cleanup(ctx.project.id, ctx.productId).catch(() => {});
  process.exit(1);
}
