/**
 * Published Page Index + Internal Sitemap tests
 * Run: npm run test:page-index
 */
import { prisma } from "../src/lib/db";
import {
  getPublishedPageIndex,
  getPublishedPageStats,
  rebuildPublishedPageIndex,
  validatePublishedPages,
} from "../src/lib/page-factory/publish/page-index-service";
import {
  generateInternalSitemap,
  getMainInternalSitemapJson,
  validateInternalSitemap,
} from "../src/lib/page-factory/publish/internal-sitemap-service";
import { publishDraftInternal } from "../src/lib/page-factory/publish/page-publish-service";
import { runPublishGateForDraft } from "../src/lib/page-factory/publish-gate/publish-gate-service";
import { generateContentDraftForBlueprint } from "../src/lib/page-factory/content-draft/content-draft-service";
import { generateAeoForBlueprint } from "../src/lib/aeo/aeo-blueprint-service";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

const ts = Date.now();

async function seed() {
  const project = await prisma.pageFactoryProject.create({
    data: { name: `Index Test ${ts}`, slug: `index-test-${ts}`, sector: "Test", productionType: "PRODUCT" },
  });
  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "MANUAL",
      rawName: "Index Test Ürün",
      normalizedName: "Index Test Ürün",
      slug: `index-test-urun-${ts}`,
      brand: "IdxMarka",
      categoryPath: "Ev > Test",
      descriptionClean: "Index test için yeterince uzun açıklama metni burada yer alıyor.",
      price: 199,
      status: "BLUEPRINT_READY",
      qualityScore: 85,
      projectId: project.id,
      metadataJson: "{}",
    },
  });
  await prisma.productContentDNA.create({
    data: {
      productId: product.id,
      primaryEntity: "Index Test Ürün",
      targetKeyword: "index test",
      intent: "commercial",
      audience: "ev",
      pageAngle: "test",
      faqSeedsJson: "[]",
      internalLinkHintsJson: "[]",
      schemaHintsJson: "[]",
    },
  });
  const bp = await prisma.pageFactoryBlueprint.create({
    data: {
      projectId: project.id,
      title: "Index Test Page",
      pageType: "product_detail",
      metadataJson: JSON.stringify({
        productId: product.id,
        generationSource: "MANUAL",
        blueprintKind: "PRODUCT_DETAIL",
        slug: `index-test-${ts}`,
        qualityScore: 85,
        status: "READY",
      }),
    },
  });
  await generateAeoForBlueprint(bp.id, false);
  await generateContentDraftForBlueprint(bp.id, false);
  const draft = await prisma.pageFactoryContentDraft.findUnique({ where: { blueprintId: bp.id } });
  if (!draft) throw new Error("Draft yok");
  await runPublishGateForDraft(draft.id, false);
  await prisma.pageFactoryContentDraft.update({
    where: { id: draft.id },
    data: { status: "READY_TO_PUBLISH", publishScore: 85, seoScore: 80, aeoScore: 75, geoScore: 70 },
  });
  const pub = await publishDraftInternal(draft.id);
  return { project, productId: product.id, bp, draftId: draft.id, pageId: pub.pageId };
}

async function cleanup(projectId: string, productId: string) {
  await prisma.pageFactoryInternalSitemap.deleteMany({ where: { projectId } });
  await prisma.pageFactoryPublishedPage.deleteMany({ where: { projectId } });
  await prisma.pageFactoryPublishGate.deleteMany({ where: { projectId } });
  await prisma.pageFactoryContentDraft.deleteMany({ where: { projectId } });
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });
  await prisma.productContentDNA.deleteMany({ where: { productId } });
  await prisma.productUniverse.delete({ where: { id: productId } }).catch(() => {});
  await prisma.pageFactoryProject.delete({ where: { id: projectId } }).catch(() => {});
}

console.log("\n=== Page Index + Internal Sitemap Tests ===\n");
const ctx = await seed();

try {
  console.log("Index:");
  const index = await getPublishedPageIndex({ projectId: ctx.project.id });
  assert(index.items.length > 0, "Index items > 0");
  assert(index.items[0]!.blueprintType !== undefined, "blueprintType alanı var");

  const stats = await getPublishedPageStats(ctx.project.id);
  assert(stats.publishedInternal >= 1, "publishedInternal >= 1");
  assert(stats.indexable >= 1, "indexable >= 1");

  const rebuild = await rebuildPublishedPageIndex(ctx.project.id);
  assert(rebuild.updated >= 1, "rebuild index");

  const validation = await validatePublishedPages(ctx.project.id);
  assert(validation.checked >= 1, "validate checked");

  console.log("\nSitemap:");
  const gen = await generateInternalSitemap(ctx.project.id, "MAIN");
  assert(gen.totalUrls >= 1, "sitemap URL üretildi");

  const json = await getMainInternalSitemapJson(ctx.project.id);
  assert(json.urls.length >= 1, "internal.json urls");
  assert(!json.urls.some((u) => u.path.includes("noindex")), "noindex yok");

  const sitemap = await prisma.pageFactoryInternalSitemap.findFirst({ where: { projectId: ctx.project.id } });
  assert(!!sitemap, "sitemap kaydı var");
  if (sitemap) {
    const v = await validateInternalSitemap(sitemap.id);
    assert(v.valid, "sitemap validate geçer");
  }

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  await cleanup(ctx.project.id, ctx.productId);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  await cleanup(ctx.project.id, ctx.productId).catch(() => {});
  process.exit(1);
}
