import { prisma } from "@/lib/db";
import {
  generateKeywordBlog,
  generateCategoryBlog,
  generateProductBlog,
} from "@/lib/blog-engine/blog-service";
import { startGeoJob } from "@/lib/geo-content-factory/geo-content-factory-service";
import { queuePlan } from "@/lib/publishing-center/publishing-service";
import type { ContentPlan, ContentPlanNode, ContentPlanStatus } from "@prisma/client";
import {
  buildContentMapTree,
  buildInternalLinkMap,
  estimateTraffic,
  generateCategoryPlan,
  generateClusterPlan,
  generateFaqPlan,
  generateGeoPlan,
  generateKeywordGroupPlan,
  generateKeywordPlan,
  generateProductPlan,
  resolveParentIds,
} from "./plan-builders";
import type {
  ContentPlanInput,
  ContentMapTree,
  InternalLinkNodeMap,
  PlanDraft,
  PlanEngine,
  PlanPreview,
  PlanningDashboard,
  PublishPlanResult,
  TrafficEstimate,
} from "./types";

export {
  generateKeywordPlan,
  generateKeywordGroupPlan,
  generateCategoryPlan,
  generateProductPlan,
  generateGeoPlan,
  generateFaqPlan,
  generateClusterPlan,
  buildInternalLinkMap,
  estimateTraffic,
} from "./plan-builders";

function draftToPreview(draft: PlanDraft): PlanPreview {
  const tempIds = draft.nodes.map((_, i) => `temp-${i}`);
  const landingIdx = draft.nodes.findIndex((n) => n.nodeType === "LANDING");
  const idByKey = new Map<string, string>();
  if (landingIdx >= 0) idByKey.set("landing", tempIds[landingIdx]);

  const resolved = resolveParentIds(draft.nodes, idByKey);
  const nodesWithIds = resolved.map((n, i) => ({
    id: tempIds[i],
    title: n.title,
    nodeType: n.nodeType,
    parentNodeId: n.parentNodeId,
    keyword: n.keyword,
    province: n.province,
    district: n.district,
    priority: n.priority,
    estimatedTraffic: n.estimatedTraffic,
  }));

  const traffic = estimateTraffic(draft.nodes);
  const contentMap = buildContentMapTree(nodesWithIds);
  const internalLinkMap = buildInternalLinkMap(nodesWithIds);

  return { ...draft, traffic, contentMap, internalLinkMap };
}

export function previewContentPlan(input: ContentPlanInput & { planType?: string }): PlanPreview {
  const draft = generateContentPlanDraft(input);
  return draftToPreview(draft);
}

export function generateContentPlanDraft(
  input: ContentPlanInput & { planType?: string; keywordGroup?: string[] }
): PlanDraft {
  const type = input.planType || "cluster";
  switch (type) {
    case "keyword":
      return generateKeywordPlan(input);
    case "keyword_group":
      return generateKeywordGroupPlan({
        ...input,
        keywordGroup: input.keywordGroup || [],
      });
    case "category":
      return generateCategoryPlan(input);
    case "product":
      return generateProductPlan(input);
    case "geo":
      return generateGeoPlan(input);
    case "faq":
      return generateFaqPlan(input);
    case "cluster":
    default:
      return generateClusterPlan(input);
  }
}

export async function generateContentPlan(
  input: ContentPlanInput & { planType?: string; keywordGroup?: string[]; status?: ContentPlanStatus }
): Promise<{ plan: ContentPlan; nodes: ContentPlanNode[]; traffic: TrafficEstimate; contentMap: ContentMapTree; internalLinkMap: InternalLinkNodeMap[] }> {
  const draft = generateContentPlanDraft(input);
  const traffic = estimateTraffic(draft.nodes);

  const plan = await prisma.contentPlan.create({
    data: {
      name: draft.name,
      primaryKeyword: draft.primaryKeyword,
      keywordGroupJson: JSON.stringify(draft.keywordGroup),
      category: draft.category,
      targetType: draft.targetType,
      estimatedContentCount: traffic.estimatedContentCount,
      estimatedGeoCount: traffic.estimatedGeoCount,
      estimatedFaqCount: traffic.estimatedFaqCount,
      estimatedLandingCount: traffic.estimatedLandingCount,
      status: input.status || "READY",
      contentMapJson: "{}",
      internalLinkMapJson: "{}",
    },
  });

  const landingIdx = draft.nodes.findIndex((n) => n.nodeType === "LANDING");
  const idByKey = new Map<string, string>();
  const createdNodes: ContentPlanNode[] = [];

  // Önce landing (veya kök) node'ları oluştur
  for (let i = 0; i < draft.nodes.length; i++) {
    const node = draft.nodes[i];
    if (node.parentKey) continue;
    const created = await prisma.contentPlanNode.create({
      data: {
        planId: plan.id,
        parentNodeId: null,
        nodeType: node.nodeType,
        title: node.title,
        keyword: node.keyword,
        province: node.province || null,
        district: node.district || null,
        priority: node.priority,
        estimatedTraffic: node.estimatedTraffic,
        status: "PLANNED",
        metadataJson: JSON.stringify(node.metadata || {}),
      },
    });
    createdNodes.push(created);
    if (node.nodeType === "LANDING" || i === landingIdx) {
      idByKey.set("landing", created.id);
    }
    idByKey.set(`node-${i}`, created.id);
  }

  // Sonra child node'ları
  for (let i = 0; i < draft.nodes.length; i++) {
    const node = draft.nodes[i];
    if (!node.parentKey) continue;
    const parentNodeId = node.parentKey === "landing" ? idByKey.get("landing") || null : idByKey.get(node.parentKey) || null;
    const created = await prisma.contentPlanNode.create({
      data: {
        planId: plan.id,
        parentNodeId,
        nodeType: node.nodeType,
        title: node.title,
        keyword: node.keyword,
        province: node.province || null,
        district: node.district || null,
        priority: node.priority,
        estimatedTraffic: node.estimatedTraffic,
        status: "PLANNED",
        metadataJson: JSON.stringify(node.metadata || {}),
      },
    });
    createdNodes.push(created);
    idByKey.set(`node-${i}`, created.id);
  }

  const mapNodes = createdNodes.map((n) => ({
    id: n.id,
    title: n.title,
    nodeType: n.nodeType,
    parentNodeId: n.parentNodeId,
    keyword: n.keyword,
    province: n.province,
    district: n.district,
    priority: n.priority,
    estimatedTraffic: n.estimatedTraffic,
  }));

  const contentMap = buildContentMapTree(mapNodes);
  const internalLinkMap = buildInternalLinkMap(mapNodes);

  const updatedPlan = await prisma.contentPlan.update({
    where: { id: plan.id },
    data: {
      contentMapJson: JSON.stringify(contentMap),
      internalLinkMapJson: JSON.stringify(internalLinkMap),
    },
  });

  return { plan: updatedPlan, nodes: createdNodes, traffic, contentMap, internalLinkMap };
}

export async function getContentPlan(planId: string) {
  const plan = await prisma.contentPlan.findUnique({
    where: { id: planId },
    include: { nodes: { orderBy: [{ priority: "desc" }, { createdAt: "asc" }] } },
  });
  if (!plan) return null;

  const contentMap = JSON.parse(plan.contentMapJson || "{}") as ContentMapTree;
  const internalLinkMap = JSON.parse(plan.internalLinkMapJson || "[]") as InternalLinkNodeMap[];

  return { plan, nodes: plan.nodes, contentMap, internalLinkMap };
}

export async function listContentPlans(limit = 50) {
  return prisma.contentPlan.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { nodes: true } } },
  });
}

export async function getPlanningDashboard(): Promise<PlanningDashboard> {
  const [totalPlans, plans, agg] = await Promise.all([
    prisma.contentPlan.count(),
    prisma.contentPlan.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.contentPlan.aggregate({
      _sum: {
        estimatedContentCount: true,
        estimatedGeoCount: true,
      },
    }),
  ]);

  return {
    totalPlans,
    totalContentTargets: agg._sum.estimatedContentCount || 0,
    totalGeoTargets: agg._sum.estimatedGeoCount || 0,
    recentPlans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      primaryKeyword: p.primaryKeyword,
      status: p.status,
      estimatedContentCount: p.estimatedContentCount,
      estimatedGeoCount: p.estimatedGeoCount,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export async function publishPlanToEngines(
  planId: string,
  engines: PlanEngine[],
  opts?: { autoPublish?: boolean; dryRun?: boolean; projectId?: string | null }
): Promise<PublishPlanResult> {
  const data = await getContentPlan(planId);
  if (!data) throw new Error("Plan bulunamadı");

  const { plan, nodes } = data;
  const result: PublishPlanResult = {
    planId,
    engines,
    blog: { processed: 0, created: 0, updated: 0, errors: [] },
    geo: { generated: 0, failed: 0 },
    page: { processed: 0, created: 0, errors: [] },
  };

  if (engines.includes("BLOG")) {
    const blogNodes = nodes.filter((n) =>
      ["LANDING", "BLOG", "FAQ"].includes(n.nodeType)
    );

    for (const node of blogNodes) {
      result.blog.processed += 1;
      try {
        const gen = await generateKeywordBlog({
          keyword: node.keyword || plan.primaryKeyword,
          keywordGroup: JSON.parse(plan.keywordGroupJson || "[]")[0],
          category: plan.category || undefined,
          autoPublish: opts?.autoPublish,
          dryRun: opts?.dryRun,
          projectId: opts?.projectId || undefined,
        });
        if (gen.created) result.blog.created += 1;
        if (gen.updated) result.blog.updated += 1;
        if (!opts?.dryRun) {
          await prisma.contentPlanNode.update({
            where: { id: node.id },
            data: { status: "GENERATED", metadataJson: JSON.stringify({ postId: gen.postId, slug: gen.slug }) },
          });
        }
      } catch (err) {
        result.blog.errors.push(`${node.title}: ${err instanceof Error ? err.message : "hata"}`);
      }
    }

    const categoryNodes = nodes.filter((n) => n.nodeType === "CATEGORY");
    for (const node of categoryNodes) {
      result.blog.processed += 1;
      try {
        const gen = await generateCategoryBlog({
          category: node.title,
          keyword: node.keyword || plan.primaryKeyword,
          autoPublish: opts?.autoPublish,
          dryRun: opts?.dryRun,
        });
        if (gen.created) result.blog.created += 1;
        if (gen.updated) result.blog.updated += 1;
      } catch (err) {
        result.blog.errors.push(`${node.title}: ${err instanceof Error ? err.message : "hata"}`);
      }
    }

    const productNodes = nodes.filter((n) => n.nodeType === "PRODUCT");
    for (const node of productNodes) {
      result.blog.processed += 1;
      try {
        const meta = JSON.parse(node.metadataJson || "{}") as { productId?: string };
        const gen = await generateProductBlog({
          keyword: node.keyword || plan.primaryKeyword,
          productId: meta.productId,
          autoPublish: opts?.autoPublish,
          dryRun: opts?.dryRun,
        });
        if (gen.created) result.blog.created += 1;
        if (gen.updated) result.blog.updated += 1;
      } catch (err) {
        result.blog.errors.push(`${node.title}: ${err instanceof Error ? err.message : "hata"}`);
      }
    }
  }

  if (engines.includes("GEO")) {
    const geoNodes = nodes.filter((n) => n.nodeType === "GEO_PROVINCE" || n.nodeType === "GEO_DISTRICT");
    if (geoNodes.length > 0) {
      const provinces = [...new Set(geoNodes.filter((n) => n.province).map((n) => n.province!))];
      try {
        const { job, result: geoResult } = await startGeoJob({
          keyword: plan.primaryKeyword,
          keywordGroup: JSON.parse(plan.keywordGroupJson || "[]")[0] || undefined,
          category: plan.category || undefined,
          mode: geoNodes.some((n) => n.nodeType === "GEO_DISTRICT") ? "PROVINCE_AND_DISTRICT" : "PROVINCE",
          provinces: provinces.length < 81 ? provinces : undefined,
          autoPublish: opts?.autoPublish,
          dryRun: opts?.dryRun,
        });
        result.geo.jobId = job.id;
        result.geo.generated = geoResult.generated;
        result.geo.failed = geoResult.failed;

        if (!opts?.dryRun) {
          await prisma.contentPlanNode.updateMany({
            where: { id: { in: geoNodes.map((n) => n.id) } },
            data: { status: "GENERATED" },
          });
        }
      } catch (err) {
        result.geo.failed = geoNodes.length;
        result.blog.errors.push(`GEO: ${err instanceof Error ? err.message : "hata"}`);
      }
    }
  }

  if (engines.includes("PAGE")) {
    const landingNodes = nodes.filter((n) => n.nodeType === "LANDING");
    for (const node of landingNodes) {
      result.page.processed += 1;
      try {
        // Sayfa Merkezi — landing hub blog olarak stage edilir; blueprint projectId varsa metadata'ya yazılır
        const gen = await generateKeywordBlog({
          keyword: plan.primaryKeyword,
          category: plan.category || undefined,
          autoPublish: false,
          dryRun: opts?.dryRun,
          projectId: opts?.projectId || undefined,
          tags: ["landing", "content-plan"],
        });
        if (gen.created) result.page.created += 1;
        if (!opts?.dryRun) {
          await prisma.contentPlanNode.update({
            where: { id: node.id },
            data: {
              status: "GENERATED",
              metadataJson: JSON.stringify({
                engine: "PAGE",
                postId: gen.postId,
                slug: gen.slug,
                projectId: opts?.projectId || null,
              }),
            },
          });
        }
      } catch (err) {
        result.page.errors.push(`${node.title}: ${err instanceof Error ? err.message : "hata"}`);
      }
    }
  }

  if (!opts?.dryRun) {
    await prisma.contentPlan.update({
      where: { id: planId },
      data: { status: "GENERATED" },
    });
    try {
      await queuePlan(planId, {
        publishMode: opts?.autoPublish ? "AUTOMATIC" : "MANUAL",
      });
    } catch {
      /* Kuyruk oluşturma başarısız olsa da plan yayını tamamlanmış sayılır */
    }
  }

  return result;
}

export async function archiveContentPlan(planId: string) {
  return prisma.contentPlan.update({
    where: { id: planId },
    data: { status: "ARCHIVED" },
  });
}
