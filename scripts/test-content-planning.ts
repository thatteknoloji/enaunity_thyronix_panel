/**
 * ENA_ICERIK_PLANLAMA_MERKEZI_V1 tests
 * Run: npx tsx scripts/test-content-planning.ts
 */
import { prisma } from "../src/lib/db";
import {
  generateKeywordPlan,
  generateKeywordGroupPlan,
  generateGeoPlan,
  generateFaqPlan,
  generateClusterPlan,
  buildInternalLinkMap,
  estimateTraffic,
} from "../src/lib/content-planning/plan-builders";
import {
  generateContentPlan,
  previewContentPlan,
  publishPlanToEngines,
  getContentPlan,
  getPlanningDashboard,
} from "../src/lib/content-planning/content-planning-service";

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
const keyword = `plan-test-${ts}`;
const cleanup: { planIds: string[]; blogIds: string[]; geoJobIds: string[] } = {
  planIds: [],
  blogIds: [],
  geoJobIds: [],
};

async function cleanupAll() {
  if (cleanup.blogIds.length) {
    await prisma.blogPost.deleteMany({ where: { id: { in: cleanup.blogIds } } }).catch(() => {});
  }
  if (cleanup.planIds.length) {
    await prisma.contentPlanNode.deleteMany({ where: { planId: { in: cleanup.planIds } } }).catch(() => {});
    await prisma.contentPlan.deleteMany({ where: { id: { in: cleanup.planIds } } }).catch(() => {});
  }
  if (cleanup.geoJobIds.length) {
    await prisma.geoContentJob.deleteMany({ where: { id: { in: cleanup.geoJobIds } } }).catch(() => {});
  }
}

try {
  console.log("\n=== ENA_ICERIK_PLANLAMA_MERKEZI_V1 Tests ===\n");

  const kwPlan = generateKeywordPlan({
    primaryKeyword: "cam tablo bayiliği",
    includeGeo: true,
    geoProvinces: ["İstanbul", "Ankara", "İzmir"],
  });
  assert(kwPlan.nodes.some((n) => n.nodeType === "LANDING"), "keyword plan landing");
  assert(kwPlan.nodes.filter((n) => n.nodeType === "BLOG").length >= 4, "keyword plan blogs");
  assert(kwPlan.nodes.filter((n) => n.nodeType === "FAQ").length >= 3, "keyword plan faq");
  assert(kwPlan.nodes.filter((n) => n.nodeType === "GEO_PROVINCE").length === 3, "keyword plan geo");

  const groupPlan = generateKeywordGroupPlan({
    primaryKeyword: keyword,
    keywordGroup: [`${keyword}-a`, `${keyword}-b`],
    includeGeo: false,
  });
  assert(groupPlan.targetType === "KEYWORD_GROUP", "keyword group plan type");
  assert(groupPlan.nodes.filter((n) => n.nodeType === "BLOG").length >= 2, "keyword group blogs");

  const geoPlan = generateGeoPlan({
    primaryKeyword: keyword,
    geoProvinces: ["İstanbul", "Ankara"],
  });
  assert(geoPlan.nodes.filter((n) => n.nodeType === "GEO_PROVINCE").length === 2, "geo plan generation");

  const faqPlan = generateFaqPlan({ primaryKeyword: keyword });
  assert(faqPlan.nodes.filter((n) => n.nodeType === "FAQ").length >= 3, "faq plan generation");

  const clusterPlan = generateClusterPlan({
    primaryKeyword: keyword,
    geoProvinces: ["İstanbul"],
    includeCategories: true,
  });
  assert(clusterPlan.nodes.length >= 8, "cluster generation");

  const traffic = estimateTraffic(clusterPlan.nodes);
  assert(traffic.estimatedContentCount === clusterPlan.nodes.length, "traffic estimation count");
  assert(traffic.estimatedFaqCount >= 3, "traffic estimation faq");
  assert(traffic.estimatedGeoCount >= 1, "traffic estimation geo");

  const tempNodes = clusterPlan.nodes.map((n, i) => ({
    id: `n-${i}`,
    title: n.title,
    nodeType: n.nodeType,
    parentNodeId: n.parentKey === "landing" ? "n-0" : null,
  }));
  const linkMap = buildInternalLinkMap(tempNodes);
  assert(linkMap.length === tempNodes.length, "internal link map size");
  const landingLink = linkMap.find((l) => l.nodeId === "n-0");
  assert((landingLink?.children.length || 0) > 0, "internal link children");
  assert(landingLink?.parent.length === 0, "landing no parent");

  const preview = previewContentPlan({
    primaryKeyword: keyword,
    planType: "cluster",
    geoProvinces: ["Ankara"],
    includeGeo: true,
  });
  assert(preview.traffic.estimatedContentCount > 0, "preview content count");
  assert(preview.internalLinkMap.length > 0, "preview link map");

  const created = await generateContentPlan({
    primaryKeyword: `${keyword}-persist`,
    planType: "cluster",
    geoProvinces: ["Ankara", "İzmir"],
    includeGeo: true,
  });
  cleanup.planIds.push(created.plan.id);
  assert(created.plan.status === "READY", "plan persisted READY");
  assert(created.nodes.length > 0, "plan nodes persisted");
  assert(created.internalLinkMap.length === created.nodes.length, "plan internal link map persisted");

  const loaded = await getContentPlan(created.plan.id);
  assert(!!loaded?.contentMap.rootId, "content map loaded");
  assert(loaded!.internalLinkMap.length > 0, "link map loaded");

  const publish = await publishPlanToEngines(created.plan.id, ["BLOG", "GEO"], {
    dryRun: true,
  });
  assert(publish.blog.processed > 0, "plan publish blog dryRun");
  assert(publish.geo.generated >= 0, "plan publish geo dryRun");

  const dash = await getPlanningDashboard();
  assert(dash.totalPlans >= 1, "dashboard totalPlans");
  assert(dash.recentPlans.length >= 1, "dashboard recentPlans");
} catch (err) {
  failed++;
  console.error("Fatal:", err);
} finally {
  await cleanupAll();
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}
