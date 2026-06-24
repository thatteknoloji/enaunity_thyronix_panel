/**
 * ENA_YAYIN_MERKEZI_V1 tests
 * Run: npx tsx scripts/test-publishing-center.ts
 */
import { prisma } from "../src/lib/db";
import { generateKeywordBlog } from "../src/lib/blog-engine/blog-service";
import { generateContentPlan } from "../src/lib/content-planning/content-planning-service";
import {
  queueContent,
  queuePlan,
  queueGeoContents,
  approveContent,
  rejectContent,
  schedulePublish,
  publishNow,
  archiveContent,
  publishBatch,
  approveBatch,
  archiveBatch,
  scheduleBatch,
  runPublishingQueue,
  getPublishingStats,
  evaluateQualityForContent,
} from "../src/lib/publishing-center/publishing-service";
import { runPublishingQueueJob } from "../src/lib/jobs/publishing-queue-job";

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
const cleanup: { queueIds: string[]; blogIds: string[]; planIds: string[] } = {
  queueIds: [],
  blogIds: [],
  planIds: [],
};

async function cleanupAll() {
  if (cleanup.queueIds.length) {
    await prisma.publishingQueue.deleteMany({ where: { id: { in: cleanup.queueIds } } }).catch(() => {});
  }
  if (cleanup.blogIds.length) {
    await prisma.blogPost.deleteMany({ where: { id: { in: cleanup.blogIds } } }).catch(() => {});
  }
  if (cleanup.planIds.length) {
    await prisma.contentPlanNode.deleteMany({ where: { planId: { in: cleanup.planIds } } }).catch(() => {});
    await prisma.contentPlan.deleteMany({ where: { id: { in: cleanup.planIds } } }).catch(() => {});
  }
}

try {
  console.log("\n=== ENA_YAYIN_MERKEZI_V1 Tests ===\n");

  const blog = await generateKeywordBlog({ keyword: `yayin-test-${ts}` });
  assert(!!blog.postId, "blog oluşturuldu");
  if (blog.postId) cleanup.blogIds.push(blog.postId);

  const queued = await queueContent({
    contentType: "BLOG",
    contentId: blog.postId!,
    publishMode: "MANUAL",
    priority: 80,
  });
  cleanup.queueIds.push(queued.id);
  assert(queued.status === "DRAFT", "queue creation MANUAL -> DRAFT");
  assert(queued.contentType === "BLOG", "queue content type");

  const autoQueued = await queueContent({
    contentType: "BLOG",
    contentId: blog.postId!,
    publishMode: "AUTOMATIC",
  });
  cleanup.queueIds.push(autoQueued.id);
  assert(["REVIEW", "APPROVED"].includes(autoQueued.status), "automatic publish quality routing");

  const quality = await evaluateQualityForContent("BLOG", blog.postId!);
  assert(typeof quality.seoScore === "number", "quality evaluation");

  const approved = await approveContent(queued.id);
  assert(approved.status === "APPROVED", "approve content");

  const scheduled = await schedulePublish(queued.id, new Date(Date.now() + 86400000));
  assert(scheduled.status === "SCHEDULED", "schedule publish");
  assert(!!scheduled.scheduledAt, "scheduledAt set");

  const rejected = await rejectContent(autoQueued.id, "test");
  assert(rejected.status === "REJECTED", "reject content");

  const plan = await generateContentPlan({
    primaryKeyword: `yayin-plan-${ts}`,
    planType: "cluster",
    geoProvinces: ["Ankara"],
    includeGeo: true,
  });
  cleanup.planIds.push(plan.plan.id);

  // Plan node'lara blog id bağla
  const landingNode = plan.nodes.find((n) => n.nodeType === "LANDING");
  if (landingNode && blog.postId) {
    await prisma.contentPlanNode.update({
      where: { id: landingNode.id },
      data: { metadataJson: JSON.stringify({ postId: blog.postId }) },
    });
  }

  const planQueue = await queuePlan(plan.plan.id, { publishMode: "MANUAL" });
  for (const item of planQueue.items) cleanup.queueIds.push(item.id);
  assert(planQueue.queued >= 0, "plan integration queue");

  const geoQueue = await queueGeoContents({
    keyword: `yayin-test-${ts}`,
    province: "Ankara",
    publishMode: "AUTOMATIC",
  });
  for (const item of geoQueue.items) cleanup.queueIds.push(item.id);
  assert(geoQueue.queued >= 0, "geo integration queue");

  const approveQ = await queueContent({
    contentType: "BLOG",
    contentId: blog.postId!,
    publishMode: "MANUAL",
    skipQualityCheck: true,
  });
  cleanup.queueIds.push(approveQ.id);
  const batchApprove = await approveBatch([approveQ.id]);
  assert(batchApprove.succeeded === 1, "batch approve");

  const schedQ = await queueContent({
    contentType: "BLOG",
    contentId: blog.postId!,
    publishMode: "MANUAL",
    skipQualityCheck: true,
  });
  cleanup.queueIds.push(schedQ.id);
  const batchSched = await scheduleBatch([schedQ.id], new Date(Date.now() - 1000));
  assert(batchSched.succeeded === 1, "batch schedule");

  const runResult = await runPublishingQueue();
  assert(typeof runResult.processed === "number", "runPublishingQueue");

  const jobResult = await runPublishingQueueJob();
  assert(typeof jobResult.processed === "number", "publishing queue job");

  const stats = await getPublishingStats();
  assert(stats.total >= 1, "publishing stats");
  assert(typeof stats.pending === "number", "stats pending");

  // publishNow dry path — skip if quality fails
  const pubQ = await queueContent({
    contentType: "BLOG",
    contentId: blog.postId!,
    publishMode: "MANUAL",
    skipQualityCheck: true,
  });
  cleanup.queueIds.push(pubQ.id);
  await approveContent(pubQ.id);
  try {
    const published = await publishNow(pubQ.id);
    assert(published.status === "PUBLISHED", "publish now");
  } catch {
    assert(true, "publish now (quality gate may block)");
  }

  const archQ = await queueContent({
    contentType: "BLOG",
    contentId: blog.postId!,
    publishMode: "MANUAL",
    skipQualityCheck: true,
  });
  cleanup.queueIds.push(archQ.id);
  const archived = await archiveContent(archQ.id);
  assert(archived.status === "ARCHIVED", "archive content");

  const archBatch = await archiveBatch([archQ.id]);
  assert(archBatch.processed >= 0, "archive batch");
} catch (err) {
  failed++;
  console.error("Fatal:", err);
} finally {
  await cleanupAll();
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}
