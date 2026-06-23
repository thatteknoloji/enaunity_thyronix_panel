/**
 * PAGE_FACTORY_PUBLISH_ENGINE_V1 tests
 * Run: npm run test:publish-engine
 */
import { prisma } from "../src/lib/db";
import { generateAeoForBlueprint } from "../src/lib/aeo/aeo-blueprint-service";
import { generateContentDraftForBlueprint } from "../src/lib/page-factory/content-draft/content-draft-service";
import { runPublishGateForDraft } from "../src/lib/page-factory/publish-gate/publish-gate-service";
import {
  previewPublishDraft,
  publishDraftInternal,
  buildPublishedPath,
  getPublishedPageByPath,
  unpublishPage,
} from "../src/lib/page-factory/publish/page-publish-service";

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

async function seedReadyDraft(ts: number) {
  const project = await prisma.pageFactoryProject.create({
    data: {
      name: `Publish Test ${ts}`,
      slug: `publish-test-${ts}`,
      sector: "Dekorasyon",
      productionType: "PRODUCT",
    },
  });

  const product = await prisma.productUniverse.create({
    data: {
      sourceType: "MANUAL",
      rawName: "Publish Test Ürün",
      normalizedName: "Publish Test Ürün",
      slug: `publish-test-urun-${ts}`,
      brand: "PubMarka",
      categoryPath: "Ev > Dekorasyon",
      descriptionClean: "Publish test için yeterince uzun açıklama metni burada yer alıyor.",
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
      primaryEntity: "Publish Test Ürün",
      targetKeyword: "publish test ürün",
      intent: "commercial",
      audience: "ev dekorasyon",
      pageAngle: "dekoratif",
      faqSeedsJson: JSON.stringify(["Nasıl kullanılır?"]),
      internalLinkHintsJson: "[]",
      schemaHintsJson: JSON.stringify(["Product"]),
    },
  });

  const blueprint = await prisma.pageFactoryBlueprint.create({
    data: {
      projectId: project.id,
      title: "Publish Test Ürün",
      pageType: "product_detail",
      metadataJson: JSON.stringify({
        productId: product.id,
        productName: "Publish Test Ürün",
        slug: `publish-test-urun-${ts}`,
        qualityScore: 85,
        blueprintKind: "PRODUCT_DETAIL",
        generationSource: "TEST",
        status: "READY",
      }),
    },
  });

  await generateAeoForBlueprint(blueprint.id, false);
  await generateContentDraftForBlueprint(blueprint.id, false);

  const draft = await prisma.pageFactoryContentDraft.findUnique({
    where: { blueprintId: blueprint.id },
  });
  if (!draft) throw new Error("Draft oluşturulamadı");

  await runPublishGateForDraft(draft.id, false);

  await prisma.pageFactoryContentDraft.update({
    where: { id: draft.id },
    data: { status: "READY_TO_PUBLISH", publishScore: 85, noindexRecommended: false },
  });

  await prisma.pageFactoryPublishGate.update({
    where: { draftId: draft.id },
    data: { status: "PASSED", score: 85 },
  });

  return { project, blueprint, draft, product };
}

async function cleanup(projectId: string, draftIds: string[], productId?: string) {
  await prisma.pageFactoryPublishedPage.deleteMany({ where: { projectId } });
  for (const draftId of draftIds) {
    await prisma.pageFactoryPublishGate.deleteMany({ where: { draftId } });
    await prisma.pageFactoryContentDraft.deleteMany({ where: { id: draftId } });
  }
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });
  if (productId) {
    await prisma.productContentDNA.deleteMany({ where: { productId } });
    await prisma.productUniverse.delete({ where: { id: productId } }).catch(() => {});
  }
  await prisma.pageFactoryProject.delete({ where: { id: projectId } }).catch(() => {});
}

console.log("\n=== PAGE_FACTORY_PUBLISH_ENGINE_V1 Tests ===\n");

const ts = Date.now();
const ctx = await seedReadyDraft(ts);

try {
  console.log("Path kuralları:");
  assert(
    buildPublishedPath("PRODUCT_DETAIL", "test-urun", {}, null) === "/p/test-urun",
    "PRODUCT_DETAIL → /p/{slug}"
  );
  assert(
    buildPublishedPath("PRODUCT_FAQ", "sss-test", {}, null) === "/sss/sss-test",
    "PRODUCT_FAQ → /sss/{slug}"
  );

  console.log("\nREADY_TO_PUBLISH draft publish:");
  const preview = await previewPublishDraft(ctx.draft.id);
  assert(preview.eligible === true, "Preview eligible");
  assert(preview.path.startsWith("/p/"), "Path /p/ prefix");

  const pub = await publishDraftInternal(ctx.draft.id);
  assert(pub.created === true, "İlk publish oluşturur");
  assert(pub.status === "PUBLISHED_INTERNAL", "Status PUBLISHED_INTERNAL");

  const page = await prisma.pageFactoryPublishedPage.findUnique({ where: { draftId: ctx.draft.id } });
  assert(!!page, "Published page kaydı var");
  assert(page!.robots === "index,follow", "robots index,follow");

  console.log("\nIdempotent re-publish (update):");
  const repub = await publishDraftInternal(ctx.draft.id);
  assert(repub.updated === true, "Tekrar publish update eder");
  const pageCount = await prisma.pageFactoryPublishedPage.count({ where: { draftId: ctx.draft.id } });
  assert(pageCount === 1, "Duplicate published page yok");

  console.log("\nNEEDS_REVIEW draft publish edilmemeli:");
  const reviewDraft = await prisma.pageFactoryContentDraft.create({
    data: {
      blueprintId: (
        await prisma.pageFactoryBlueprint.create({
          data: {
            projectId: ctx.project.id,
            title: "Review Draft",
            pageType: "product_detail",
            metadataJson: "{}",
          },
        })
      ).id,
      projectId: ctx.project.id,
      title: "Review",
      slug: `review-${ts}`,
      status: "NEEDS_REVIEW",
      publishScore: 60,
    },
  });
  let blocked = false;
  try {
    await publishDraftInternal(reviewDraft.id);
  } catch {
    blocked = true;
  }
  assert(blocked, "NEEDS_REVIEW publish engellendi");

  console.log("\nBLOCKED gate publish engellemeli:");
  const blockedDraft = await prisma.pageFactoryContentDraft.create({
    data: {
      blueprintId: (
        await prisma.pageFactoryBlueprint.create({
          data: {
            projectId: ctx.project.id,
            title: "Blocked Draft",
            pageType: "product_detail",
            metadataJson: "{}",
          },
        })
      ).id,
      projectId: ctx.project.id,
      title: "Blocked",
      slug: `blocked-${ts}`,
      status: "READY_TO_PUBLISH",
      publishScore: 85,
    },
  });
  await prisma.pageFactoryPublishGate.create({
    data: {
      draftId: blockedDraft.id,
      blueprintId: (await prisma.pageFactoryContentDraft.findUnique({ where: { id: blockedDraft.id } }))!.blueprintId,
      projectId: ctx.project.id,
      status: "BLOCKED",
      score: 30,
    },
  });
  let gateBlocked = false;
  try {
    await publishDraftInternal(blockedDraft.id);
  } catch {
    gateBlocked = true;
  }
  assert(gateBlocked, "BLOCKED gate publish engellendi");

  console.log("\nnoindexRecommended:");
  await prisma.pageFactoryContentDraft.update({
    where: { id: ctx.draft.id },
    data: { noindexRecommended: true },
  });
  const noindexPub = await publishDraftInternal(ctx.draft.id);
  const noindexPage = await prisma.pageFactoryPublishedPage.findUnique({ where: { id: noindexPub.pageId } });
  assert(noindexPage?.robots === "noindex,follow", "noindexRecommended → noindex,follow");
  await prisma.pageFactoryContentDraft.update({
    where: { id: ctx.draft.id },
    data: { noindexRecommended: false },
  });

  console.log("\nDuplicate path suffix:");
  const dupBlueprint = await prisma.pageFactoryBlueprint.create({
    data: {
      projectId: ctx.project.id,
      title: "Dup Path",
      pageType: "product_detail",
      metadataJson: JSON.stringify({ slug: `publish-test-urun-${ts}`, blueprintKind: "PRODUCT_DETAIL" }),
    },
  });
  const dupDraft = await prisma.pageFactoryContentDraft.create({
    data: {
      blueprintId: dupBlueprint.id,
      projectId: ctx.project.id,
      title: "Dup",
      slug: `publish-test-urun-${ts}`,
      status: "READY_TO_PUBLISH",
      publishScore: 85,
      metaTitle: "Dup Meta",
      metaDescription: "Dup desc yeterince uzun açıklama metni.",
      h1: "Dup H1",
      intro: "Dup intro",
      bodyJson: "[]",
      faqJson: "[]",
      schemaJson: JSON.stringify({ "@type": "Product", name: "Dup" }),
    },
  });
  await prisma.pageFactoryPublishGate.create({
    data: {
      draftId: dupDraft.id,
      blueprintId: dupBlueprint.id,
      projectId: ctx.project.id,
      status: "PASSED",
      score: 85,
    },
  });
  const dupPub = await publishDraftInternal(dupDraft.id);
  assert(dupPub.path !== page!.path, "Duplicate path farklı suffix aldı");
  assert(dupPub.path.includes("-2") || dupPub.path.endsWith(`-${ts}`), "Suffix üretildi");

  console.log("\nPublic render lookup:");
  const rendered = await getPublishedPageByPath(page!.path);
  assert(!!rendered, "getPublishedPageByPath bulur");
  assert(rendered!.status === "PUBLISHED_INTERNAL", "Sadece PUBLISHED_INTERNAL");

  const schema = JSON.parse(rendered!.schemaJson || "{}");
  assert(!!schema["@type"] || Object.keys(schema).length > 0, "schema JSON-LD var");

  console.log("\nUnpublish:");
  const unpub = await unpublishPage(page!.id);
  assert(unpub.status === "UNPUBLISHED", "Unpublish status");

  const afterUnpub = await getPublishedPageByPath(page!.path);
  assert(!afterUnpub, "Unpublished sayfa public render'da yok");

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);

  await cleanup(ctx.project.id, [ctx.draft.id, reviewDraft.id, blockedDraft.id, dupDraft.id], ctx.product.id);
  process.exit(failed > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  await cleanup(ctx.project.id, [ctx.draft.id], ctx.product.id).catch(() => {});
  process.exit(1);
}
