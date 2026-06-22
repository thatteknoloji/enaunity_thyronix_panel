/**
 * PAGE_FACTORY_V3 Content Draft tests
 * Run: npm run test:content-draft
 */
import { prisma } from "../src/lib/db";
import { parseMetadata } from "../src/lib/aeo/aeo-utils";
import { generateAeoForBlueprint } from "../src/lib/aeo/aeo-blueprint-service";
import {
  previewContentDraftForBlueprint,
  generateContentDraftForBlueprint,
  generateBulkContentDrafts,
} from "../src/lib/page-factory/content-draft/content-draft-service";
import { GENERATION_SOURCE, generateProductBlueprints, previewProductBlueprints } from "../src/lib/product-universe/product-blueprint-bridge";

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

async function ensureBlueprintWithAeo() {
  let blueprint = await prisma.pageFactoryBlueprint.findFirst({
    orderBy: { updatedAt: "desc" },
    include: { project: true },
  });

  const meta = blueprint ? parseMetadata(blueprint.metadataJson) : {};
  if (blueprint && meta.aeo && (meta.aeo as { version?: string }).version === "AEO_LAYER_V1") {
    return { blueprint, project: blueprint.project };
  }

  let product = await prisma.productUniverse.findFirst({
    where: { qualityScore: { gte: 70 } },
    orderBy: { qualityScore: "desc" },
  });

  let project = await prisma.pageFactoryProject.findFirst({ orderBy: { createdAt: "desc" } });
  if (!project) {
    project = await prisma.pageFactoryProject.create({
      data: {
        name: "Draft Test Project",
        slug: `draft-test-${Date.now()}`,
        sector: "Test",
        country: "TR",
        productionType: "PRODUCT",
      },
    });
  }

  if (!product) {
    product = await prisma.productUniverse.create({
      data: {
        sourceType: "MANUAL",
        rawName: "Modern Ahşap Kitaplık",
        normalizedName: "Modern Ahşap Kitaplık",
        slug: `draft-prod-${Date.now()}`,
        brand: "TestMarka",
        categoryPath: "Mobilya > Kitaplık",
        descriptionClean: "Salon için ahşap kitaplık modeli.",
        price: 1999,
        status: "BLUEPRINT_READY",
        qualityScore: 85,
        projectId: project.id,
        metadataJson: JSON.stringify({ stock: 3 }),
      },
    });
    await prisma.productEntity.createMany({
      data: [
        { productId: product.id, type: "MATERIAL", value: "Ahşap", confidence: 0.9 },
        { productId: product.id, type: "USAGE_AREA", value: "Salon", confidence: 0.85 },
        { productId: product.id, type: "CATEGORY", value: "Kitaplık", confidence: 0.9 },
      ],
    });
    await prisma.productContentDNA.create({
      data: {
        productId: product.id,
        primaryEntity: "Modern Ahşap Kitaplık",
        targetKeyword: "modern ahşap kitaplık",
        intent: "commercial",
        audience: "salon alıcıları",
        pageAngle: "ahşap kitaplık",
        faqSeedsJson: JSON.stringify(["Modern Ahşap Kitaplık nasıl temizlenir?"]),
        internalLinkHintsJson: JSON.stringify(["Ahşap Kitaplık"]),
        schemaHintsJson: JSON.stringify(["Product"]),
      },
    });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        sourceUrl: "https://example.com/img.jpg",
        publicUrl: "https://example.com/img.jpg",
        sortOrder: 0,
        status: "DOWNLOADED",
      },
    });
  }

  const preview = await previewProductBlueprints(product.id, {
    projectId: project.id,
    includeProductPage: true,
    includeFaqPage: true,
    minQualityScore: 70,
    isAdmin: true,
  });
  if (preview.drafts.length === 0) throw new Error("Blueprint draft oluşturulamadı");

  await generateProductBlueprints(product.id, {
    projectId: project.id,
    includeProductPage: true,
    includeFaqPage: true,
    minQualityScore: 70,
    isAdmin: true,
  });

  blueprint = await prisma.pageFactoryBlueprint.findFirst({
    where: { projectId: project.id, pageType: "product_detail" },
    orderBy: { updatedAt: "desc" },
    include: { project: true },
  });
  if (!blueprint) {
    blueprint = await prisma.pageFactoryBlueprint.findFirst({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
      include: { project: true },
    });
  }
  if (!blueprint) throw new Error("Blueprint bulunamadı");

  await generateAeoForBlueprint(blueprint.id, false);
  blueprint = await prisma.pageFactoryBlueprint.findUnique({
    where: { id: blueprint.id },
    include: { project: true },
  });
  if (!blueprint) throw new Error("Blueprint reload failed");

  return { blueprint, project: blueprint.project };
}

async function main() {
  console.log("\n=== PAGE_FACTORY_V3 Content Draft Tests ===\n");

  const { blueprint, project } = await ensureBlueprintWithAeo();
  console.log(`Blueprint: ${blueprint.id}\n`);

  // 1) Preview without DB write
  console.log("1) Draft preview");
  const beforeDraftCount = await prisma.pageFactoryContentDraft.count();
  const preview = await previewContentDraftForBlueprint(blueprint.id);
  const afterPreviewCount = await prisma.pageFactoryContentDraft.count();
  assert(afterPreviewCount === beforeDraftCount, "Preview DB yazmadı");
  assert(preview.version === "PAGE_FACTORY_V3", "version PAGE_FACTORY_V3");
  assert(preview.sections.length >= 4, `sections >= 4 (got ${preview.sections.length})`);
  assert(preview.faq.length >= 4, `faq >= 4 (got ${preview.faq.length})`);
  assert(!!preview.schemaDraft, "schemaDraft oluştu");
  assert(preview.internalLinks.length >= 1, "internalLinks oluştu");
  assert(preview.quality.publishScore > 0, `publishScore hesaplandı (${preview.quality.publishScore})`);

  // 2) Generate
  console.log("\n2) Draft generate");
  const gen1 = await generateContentDraftForBlueprint(blueprint.id, false);
  assert(gen1.written === true, "İlk generate yazdı");
  const draft1 = await prisma.pageFactoryContentDraft.findUnique({ where: { blueprintId: blueprint.id } });
  assert(!!draft1, "PageFactoryContentDraft oluştu");
  assert(JSON.parse(draft1!.bodyJson).length >= 4, "bodyJson sections dolu");

  const gen2 = await generateContentDraftForBlueprint(blueprint.id, false);
  const draftCount = await prisma.pageFactoryContentDraft.count({ where: { blueprintId: blueprint.id } });
  assert(draftCount === 1, "Tekrar generate duplicate oluşturmadı");
  assert(gen2.draftId === draft1!.id, "Update etti (aynı draft id)");

  const bpMeta = parseMetadata(
    (await prisma.pageFactoryBlueprint.findUnique({ where: { id: blueprint.id } }))?.metadataJson || "{}"
  );
  assert(bpMeta.contentDraft != null, "blueprint metadata contentDraft dolu");
  assert(
    ["DRAFT_GENERATED", "NEEDS_REVIEW", "READY_TO_PUBLISH"].includes(String(bpMeta.contentStatus)),
    `contentStatus güncellendi (${bpMeta.contentStatus})`
  );

  // 3) noindex cap
  console.log("\n3) noindexRecommended");
  const noindexBp = await prisma.pageFactoryBlueprint.findFirst({
    where: { projectId: project.id, id: { not: blueprint.id } },
  });
  if (noindexBp) {
    const m = parseMetadata(noindexBp.metadataJson);
    m.noindexRecommended = true;
    await prisma.pageFactoryBlueprint.update({
      where: { id: noindexBp.id },
      data: { metadataJson: JSON.stringify({ ...m, productId: m.productId, generationSource: GENERATION_SOURCE }) },
    });
    const noindexPreview = await previewContentDraftForBlueprint(noindexBp.id);
    if (noindexPreview.noindexRecommended) {
      assert(noindexPreview.status !== "READY_TO_PUBLISH", "noindex true ise READY_TO_PUBLISH değil");
    }
  } else {
    console.log("  — skip noindex ayrı blueprint");
  }

  // 4) Bulk dryRun
  console.log("\n4) Bulk dryRun");
  const bulkDry = await generateBulkContentDrafts(project.id, {
    generationSource: GENERATION_SOURCE,
    limit: 5,
    dryRun: true,
  });
  assert(bulkDry.dryRun === true, "bulk dryRun flag");

  // 5) Bulk write
  console.log("\n5) Bulk write");
  const countBefore = await prisma.pageFactoryContentDraft.count({ where: { projectId: project.id } });
  const bulkWrite = await generateBulkContentDrafts(project.id, {
    generationSource: GENERATION_SOURCE,
    onlyWithoutDraft: true,
    limit: 5,
    dryRun: false,
  });
  const countAfter = await prisma.pageFactoryContentDraft.count({ where: { projectId: project.id } });
  assert(countAfter >= countBefore, "bulk write draft sayısını artırdı veya korudu");

  // 6) READY_TO_PUBLISH threshold
  console.log("\n6) publishScore status");
  if (preview.quality.publishScore >= 80 && !preview.noindexRecommended) {
    assert(preview.status === "READY_TO_PUBLISH", "publishScore>=80 → READY_TO_PUBLISH");
  } else {
    console.log(`  — publishScore=${preview.quality.publishScore}, status=${preview.status}`);
  }

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
