/**
 * ENA_CEKIRDEK_AKIS_BIRLESTIRME_V1 tests
 * Run: npx tsx scripts/test-content-pipeline.ts
 */
import { prisma } from "../src/lib/db";
import { generateKeywordBlog } from "../src/lib/blog-engine/blog-service";
import { generateContentPlan } from "../src/lib/content-planning/content-planning-service";
import {
  processContentThroughPipeline,
  runFullPipelineFromPlan,
  runFullPipelineFromKeyword,
  processLegacyRecoveryThroughPipeline,
  resolveStatusFromScores,
  mandatoryQualityAudit,
  getOperationsDashboard,
} from "../src/lib/content-operations/content-pipeline-service";
import { QUALITY_THRESHOLDS } from "../src/lib/publishing-center/types";

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

const ts = Date.now();
const cleanup: {
  planIds: string[];
  blogIds: string[];
  queueIds: string[];
  legacyIds: string[];
} = { planIds: [], blogIds: [], queueIds: [], legacyIds: [] };

async function cleanupAll() {
  if (cleanup.queueIds.length) {
    await prisma.publishingQueue.deleteMany({ where: { id: { in: cleanup.queueIds } } }).catch(() => {});
  }
  if (cleanup.blogIds.length) {
    await prisma.contentQualityAudit.deleteMany({
      where: { contentId: { in: cleanup.blogIds } },
    }).catch(() => {});
    await prisma.blogPost.deleteMany({ where: { id: { in: cleanup.blogIds } } }).catch(() => {});
  }
  if (cleanup.planIds.length) {
    await prisma.contentPlanNode.deleteMany({ where: { planId: { in: cleanup.planIds } } }).catch(() => {});
    await prisma.contentPlan.deleteMany({ where: { id: { in: cleanup.planIds } } }).catch(() => {});
  }
  if (cleanup.legacyIds.length) {
    await prisma.legacyUrl.deleteMany({ where: { id: { in: cleanup.legacyIds } } }).catch(() => {});
  }
}

try {
  console.log("\n=== ENA_CEKIRDEK_AKIS_BIRLESTIRME_V1 Tests ===\n");

  assert(QUALITY_THRESHOLDS.seoScore === 70, "seo threshold 70");
  assert(QUALITY_THRESHOLDS.geoScore === 60, "geo threshold 60");
  assert(QUALITY_THRESHOLDS.qualityScore === 70, "quality threshold 70");

  assert(resolveStatusFromScores({ seoScore: 80, geoScore: 70, qualityScore: 75 }) === "APPROVED", "score APPROVED");
  assert(resolveStatusFromScores({ seoScore: 50, geoScore: 70, qualityScore: 75 }) === "REVIEW", "score REVIEW");

  const blog = await generateKeywordBlog({ keyword: `pipeline-${ts}` });
  assert(!!blog.postId, "blog üretildi");
  if (blog.postId) cleanup.blogIds.push(blog.postId);

  const audit = await mandatoryQualityAudit("BLOG", blog.postId!);
  assert(typeof audit.qualityScore === "number", "mandatory quality audit");

  const processed = await processContentThroughPipeline("BLOG", blog.postId!, {
    autoPublish: false,
    publishMode: "AUTOMATIC",
  });
  cleanup.queueIds.push(processed.queue.id);
  assert(["REVIEW", "APPROVED"].includes(processed.queue.status), "pipeline queue status");
  assert(processed.audit.seoScore >= 0, "pipeline audit scores");

  const plan = await generateContentPlan({
    primaryKeyword: `pipeline-plan-${ts}`,
    planType: "cluster",
    geoProvinces: ["Ankara"],
    includeGeo: true,
  });
  cleanup.planIds.push(plan.plan.id);

  const landing = plan.nodes.find((n) => n.nodeType === "LANDING");
  if (landing && blog.postId) {
    await prisma.contentPlanNode.update({
      where: { id: landing.id },
      data: { metadataJson: JSON.stringify({ postId: blog.postId }) },
    });
  }

  const fromPlan = await runFullPipelineFromPlan(plan.plan.id, {
    engines: ["BLOG"],
    autoPublish: false,
  });
  assert(fromPlan.totalProcessed >= 0, "plan -> pipeline");
  for (const step of fromPlan.pipeline) {
    if (step.queueId) cleanup.queueIds.push(step.queueId);
  }

  const fromKeyword = await runFullPipelineFromKeyword(
    {
      primaryKeyword: `pipeline-kw-${ts}`,
      geoProvinces: ["Ankara"],
      planType: "cluster",
    },
    { engines: ["BLOG"], autoPublish: false }
  );
  cleanup.planIds.push(fromKeyword.planId);
  assert(fromKeyword.planId.length > 0, "keyword -> plan -> pipeline");
  for (const step of fromKeyword.pipeline) {
    if (step.queueId) cleanup.queueIds.push(step.queueId);
  }

  const legacy = await prisma.legacyUrl.create({
    data: {
      url: `/blog/pipeline-legacy-${ts}`,
      normalizedUrl: `/blog/pipeline-legacy-${ts}`,
      status: "GENERATED",
      classification: "BLOG",
      recoveryStrategy: "CREATE_BLOG",
      generatedBlogId: blog.postId!,
    },
  });
  cleanup.legacyIds.push(legacy.id);

  const legacyPipeline = await processLegacyRecoveryThroughPipeline(legacy.id, {
    autoPublish: false,
  });
  assert(legacyPipeline.length >= 1, "legacy recovery pipeline");
  for (const step of legacyPipeline) {
    if (step.queueId) cleanup.queueIds.push(step.queueId);
  }

  const dash = await getOperationsDashboard();
  assert(dash.totalPlans >= 1, "operations dashboard");
  assert(typeof dash.qualityPending === "number", "dashboard quality pending");
} catch (err) {
  failed++;
  console.error("Fatal:", err);
} finally {
  await cleanupAll();
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}
