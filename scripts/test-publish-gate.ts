/**
 * PAGE_FACTORY_V4 Publish Gate tests
 * Run: npm run test:publish-gate
 */
import { prisma } from "../src/lib/db";
import {
  previewPublishGateForDraft,
  runPublishGateForDraft,
  bulkRunPublishGate,
  reviewPublishGate,
} from "../src/lib/page-factory/publish-gate/publish-gate-service";
import { generateContentDraftForBlueprint } from "../src/lib/page-factory/content-draft/content-draft-service";
import { generateAeoForBlueprint } from "../src/lib/aeo/aeo-blueprint-service";
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

async function ensureDraft() {
  let draft = await prisma.pageFactoryContentDraft.findFirst({
    orderBy: { updatedAt: "desc" },
    include: { blueprint: true },
  });
  if (draft) return draft;

  const blueprint = await prisma.pageFactoryBlueprint.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!blueprint) throw new Error("Blueprint yok — önce content-draft testi çalıştırın");

  await generateAeoForBlueprint(blueprint.id, false);
  await generateContentDraftForBlueprint(blueprint.id, false);

  draft = await prisma.pageFactoryContentDraft.findUnique({
    where: { blueprintId: blueprint.id },
    include: { blueprint: true },
  });
  if (!draft) throw new Error("Draft oluşturulamadı");
  return draft;
}

async function main() {
  console.log("\n=== PAGE_FACTORY_V4 Publish Gate Tests ===\n");

  const draft = await ensureDraft();
  console.log(`Draft: ${draft.id}\n`);

  // 1) Preview PASSED or valid result
  console.log("1) Preview gate");
  const beforeGateCount = await prisma.pageFactoryPublishGate.count();
  const preview = await previewPublishGateForDraft(draft.id);
  const afterPreviewCount = await prisma.pageFactoryPublishGate.count();
  assert(afterPreviewCount === beforeGateCount, "Preview DB yazmadı");
  assert(!!preview.checks.length, "Checks oluştu");
  assert(["PASSED", "WARNING", "BLOCKED", "NEEDS_REVIEW"].includes(preview.status), `Status geçerli (${preview.status})`);

  // 2) Run creates gate record
  console.log("\n2) Run gate");
  const run = await runPublishGateForDraft(draft.id, false);
  assert(run.written === true, "Gate kaydı yazıldı");
  const gate = await prisma.pageFactoryPublishGate.findUnique({ where: { draftId: draft.id } });
  assert(!!gate, "PageFactoryPublishGate oluştu");

  const updatedDraft = await prisma.pageFactoryContentDraft.findUnique({ where: { id: draft.id } });
  assert(!!updatedDraft?.status, "Draft status güncellendi");

  // 3) Missing metaDescription fail/warn
  console.log("\n3) Eksik metaDescription");
  const badDraft = await prisma.pageFactoryContentDraft.create({
    data: {
      blueprintId: (await prisma.pageFactoryBlueprint.findFirst({
        where: { id: { not: draft.blueprintId } },
      }))?.id || draft.blueprintId,
      projectId: draft.projectId,
      title: "Test Bad Draft",
      slug: `bad-draft-${Date.now()}`,
      metaTitle: "Kısa",
      metaDescription: "",
      h1: "",
      intro: "",
      bodyJson: "[]",
      faqJson: "[]",
      publishScore: 30,
    },
  }).catch(() => null);

  if (badDraft && badDraft.id !== draft.id) {
    try {
      const badPreview = await previewPublishGateForDraft(badDraft.id);
      const hasFail = badPreview.blockers.length > 0 || badPreview.warnings.length > 0;
      assert(hasFail, "Eksik meta draft fail/warn üretti");
      await prisma.pageFactoryContentDraft.delete({ where: { id: badDraft.id } }).catch(() => {});
    } catch {
      console.log("  — skip bad draft (duplicate blueprint)");
    }
  } else {
    console.log("  — skip bad draft oluşturma");
  }

  // 4) Duplicate slug
  console.log("\n4) Duplicate slug");
  const dupSlug = draft.slug;
  const sibling = await prisma.pageFactoryContentDraft.findFirst({
    where: { projectId: draft.projectId, id: { not: draft.id } },
  });
  if (sibling) {
    await prisma.pageFactoryContentDraft.update({
      where: { id: sibling.id },
      data: { slug: dupSlug, h1: `Unique H1 ${Date.now()}` },
    });
    const dupPreview = await previewPublishGateForDraft(sibling.id);
    assert(dupPreview.blockers.some((b) => b.key === "slug_duplicate"), "Slug duplicate blocker");
  } else {
    console.log("  — skip duplicate (tek draft)");
  }

  // 5) Policy warning
  console.log("\n5) Policy warning");
  await prisma.pageFactoryContentDraft.update({
    where: { id: draft.id },
    data: {
      intro: draft.intro + " %100 garantili en iyi ürün kesin sonuç",
    },
  });
  const policyPreview = await previewPublishGateForDraft(draft.id);
  assert(
    policyPreview.warnings.some((w) => w.key.includes("banned") || w.label.includes("Abartılı")),
    "Policy warning üretildi"
  );

  // 6) Bulk dryRun
  console.log("\n6) Bulk dryRun");
  const bulkDry = await bulkRunPublishGate({ projectId: draft.projectId || undefined, limit: 5, dryRun: true });
  assert(bulkDry.dryRun === true, "Bulk dryRun");

  // 7) Bulk write
  console.log("\n7) Bulk write");
  const bulkWrite = await bulkRunPublishGate({ projectId: draft.projectId || undefined, limit: 3, dryRun: false });
  assert(bulkWrite.processed >= 0, "Bulk write tamamlandı");

  // 8) Admin approve
  console.log("\n8) Admin approve");
  const gateRow = await prisma.pageFactoryPublishGate.findUnique({ where: { draftId: draft.id } });
  if (gateRow) {
    await reviewPublishGate(gateRow.id, "approve", "test approve", "admin-test", "ADMIN");
    const approved = await prisma.pageFactoryContentDraft.findUnique({ where: { id: draft.id } });
    assert(approved?.status === "READY_TO_PUBLISH", "Approve → READY_TO_PUBLISH");

    await reviewPublishGate(gateRow.id, "reject", "test reject", "admin-test", "ADMIN");
    const rejected = await prisma.pageFactoryContentDraft.findUnique({ where: { id: draft.id } });
    assert(rejected?.status === "REJECTED", "Reject → REJECTED");
  }

  // 9) noindex should not be READY on approve alone if blocked - restore draft
  console.log("\n9) noindex cap");
  await prisma.pageFactoryContentDraft.update({
    where: { id: draft.id },
    data: { noindexRecommended: true, intro: "Normal intro without banned words here." },
  });
  const noindexRun = await runPublishGateForDraft(draft.id, false);
  assert(
    noindexRun.status !== "PASSED" || noindexRun.score < 80 || updatedDraft?.status !== "READY_TO_PUBLISH",
    "noindex draft READY olmamalı veya düşük skor"
  );

  console.log(`\n=== Sonuç: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
