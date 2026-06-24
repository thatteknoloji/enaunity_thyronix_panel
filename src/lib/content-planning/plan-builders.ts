import type { ContentPlanNodeType } from "@prisma/client";
import { getAllProvinceNames } from "@/lib/geo/turkiye-il-ilce-kaynagi";
import {
  buildCategoryTitles,
  buildFaqTitles,
  buildGeoProvinceTitles,
  buildSupportBlogTitles,
  TOP_GEO_PROVINCES,
} from "./plan-templates";
import { capitalizeKeyword } from "./plan-utils";
import type { ContentMapTree, InternalLinkNodeMap, PlanDraft, PlanDraftNode, TrafficEstimate } from "./types";
import type { ContentPlanInput } from "./types";

const TRAFFIC_BASE: Record<ContentPlanNodeType, number> = {
  LANDING: 1200,
  BLOG: 420,
  FAQ: 180,
  GEO_PROVINCE: 650,
  GEO_DISTRICT: 120,
  PRODUCT: 500,
  CATEGORY: 380,
};

const BIG_CITY_BOOST = new Set(["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya"]);

export function estimateNodeTraffic(
  nodeType: ContentPlanNodeType,
  opts?: { province?: string | null; priority?: number }
): number {
  let base = TRAFFIC_BASE[nodeType] || 200;
  if (nodeType === "GEO_PROVINCE" && opts?.province && BIG_CITY_BOOST.has(opts.province)) {
    base = Math.round(base * 1.8);
  }
  const priorityFactor = (opts?.priority ?? 50) / 50;
  return Math.round(base * priorityFactor);
}

export function estimateTraffic(nodes: PlanDraftNode[]): TrafficEstimate {
  const byType: Record<string, number> = {};
  let totalTraffic = 0;

  for (const node of nodes) {
    totalTraffic += node.estimatedTraffic;
    byType[node.nodeType] = (byType[node.nodeType] || 0) + 1;
  }

  const blogCount = (byType.BLOG || 0) + (byType.LANDING || 0);
  const faqCount = byType.FAQ || 0;
  const geoCount = (byType.GEO_PROVINCE || 0) + (byType.GEO_DISTRICT || 0);
  const landingCount = byType.LANDING || 0;
  const clusterCount = Math.max(1, Math.ceil(nodes.length / 8));

  return {
    totalTraffic,
    estimatedContentCount: nodes.length,
    estimatedGeoCount: geoCount,
    estimatedFaqCount: faqCount,
    estimatedLandingCount: landingCount,
    estimatedClusterCount: clusterCount,
    byType,
  };
}

export function buildInternalLinkMap(
  nodes: Array<{
    id: string;
    title: string;
    nodeType: ContentPlanNodeType;
    parentNodeId: string | null;
  }>
): InternalLinkNodeMap[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, string[]>();

  for (const node of nodes) {
    if (!node.parentNodeId) continue;
    const list = childrenOf.get(node.parentNodeId) || [];
    list.push(node.id);
    childrenOf.set(node.parentNodeId, list);
  }

  return nodes.map((node) => {
    const parent = node.parentNodeId ? [node.parentNodeId] : [];
    const children = childrenOf.get(node.id) || [];
    const siblings = node.parentNodeId
      ? (childrenOf.get(node.parentNodeId) || []).filter((id) => id !== node.id)
      : [];

    return {
      nodeId: node.id,
      title: node.title,
      nodeType: node.nodeType,
      parent,
      children,
      siblings,
    };
  });
}

export function buildContentMapTree(
  nodes: Array<{
    id: string;
    title: string;
    nodeType: ContentPlanNodeType;
    parentNodeId: string | null;
    keyword: string;
    province?: string | null;
    district?: string | null;
    priority: number;
    estimatedTraffic: number;
  }>
): ContentMapTree {
  const landing = nodes.find((n) => n.nodeType === "LANDING");
  return {
    rootId: landing?.id || nodes[0]?.id || null,
    sections: {
      landing: nodes.filter((n) => n.nodeType === "LANDING").map((n) => n.id),
      blogs: nodes.filter((n) => n.nodeType === "BLOG").map((n) => n.id),
      faq: nodes.filter((n) => n.nodeType === "FAQ").map((n) => n.id),
      geo: nodes.filter((n) => n.nodeType === "GEO_PROVINCE" || n.nodeType === "GEO_DISTRICT").map((n) => n.id),
      categories: nodes.filter((n) => n.nodeType === "CATEGORY").map((n) => n.id),
      products: nodes.filter((n) => n.nodeType === "PRODUCT").map((n) => n.id),
    },
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.title,
      nodeType: n.nodeType,
      parentNodeId: n.parentNodeId,
      keyword: n.keyword,
      province: n.province,
      district: n.district,
      priority: n.priority,
      estimatedTraffic: n.estimatedTraffic,
    })),
  };
}

function landingNode(keyword: string): PlanDraftNode {
  const title = capitalizeKeyword(keyword);
  return {
    nodeType: "LANDING",
    title,
    keyword,
    priority: 100,
    estimatedTraffic: estimateNodeTraffic("LANDING", { priority: 100 }),
    parentKey: null,
    metadata: { role: "hub" },
  };
}

function blogNodes(keyword: string): PlanDraftNode[] {
  return buildSupportBlogTitles(keyword).map((title, i) => ({
    nodeType: "BLOG" as const,
    title,
    keyword: title.toLocaleLowerCase("tr-TR"),
    priority: 80 - i * 5,
    estimatedTraffic: estimateNodeTraffic("BLOG", { priority: 80 - i * 5 }),
    parentKey: "landing",
    metadata: { cluster: "support-blogs" },
  }));
}

function faqNodes(keyword: string): PlanDraftNode[] {
  return buildFaqTitles(keyword).map((title, i) => ({
    nodeType: "FAQ" as const,
    title,
    keyword,
    priority: 70 - i * 5,
    estimatedTraffic: estimateNodeTraffic("FAQ", { priority: 70 - i * 5 }),
    parentKey: "landing",
    metadata: { cluster: "faq" },
  }));
}

function geoNodes(keyword: string, provinces: string[]): PlanDraftNode[] {
  return buildGeoProvinceTitles(keyword, provinces).map((title, i) => {
    const province = provinces[i];
    return {
      nodeType: "GEO_PROVINCE" as const,
      title,
      keyword,
      province,
      priority: BIG_CITY_BOOST.has(province) ? 65 : 55,
      estimatedTraffic: estimateNodeTraffic("GEO_PROVINCE", { province, priority: 60 }),
      parentKey: "landing",
      metadata: { cluster: "geo", province },
    };
  });
}

function categoryNodes(keyword: string, category?: string | null): PlanDraftNode[] {
  return buildCategoryTitles(keyword, category).map((title, i) => ({
    nodeType: "CATEGORY" as const,
    title,
    keyword,
    priority: 60 - i * 5,
    estimatedTraffic: estimateNodeTraffic("CATEGORY", { priority: 60 }),
    parentKey: "landing",
    metadata: { cluster: "categories" },
  }));
}

export function generateKeywordPlan(input: ContentPlanInput): PlanDraft {
  const keyword = input.primaryKeyword.trim();
  const nodes: PlanDraftNode[] = [landingNode(keyword)];

  if (input.includeBlogs !== false) nodes.push(...blogNodes(keyword));
  if (input.includeFaq !== false) nodes.push(...faqNodes(keyword));
  if (input.includeGeo !== false) {
    const provinces = input.geoProvinces?.length ? input.geoProvinces : [...TOP_GEO_PROVINCES];
    nodes.push(...geoNodes(keyword, provinces));
  }
  if (input.includeCategories !== false) nodes.push(...categoryNodes(keyword, input.category));

  return {
    name: input.name || `${capitalizeKeyword(keyword)} İçerik Planı`,
    primaryKeyword: keyword,
    keywordGroup: input.keywordGroup || [],
    category: input.category || null,
    targetType: "KEYWORD",
    nodes,
  };
}

export function generateKeywordGroupPlan(input: ContentPlanInput & { keywordGroup: string[] }): PlanDraft {
  const primary = input.primaryKeyword.trim();
  const group = input.keywordGroup.filter(Boolean);
  const nodes: PlanDraftNode[] = [landingNode(primary)];

  for (const kw of group) {
    nodes.push({
      nodeType: "BLOG",
      title: capitalizeKeyword(kw),
      keyword: kw,
      priority: 75,
      estimatedTraffic: estimateNodeTraffic("BLOG", { priority: 75 }),
      parentKey: "landing",
      metadata: { cluster: "keyword-group" },
    });
  }

  if (input.includeFaq !== false) nodes.push(...faqNodes(primary));
  if (input.includeGeo !== false) {
    const provinces = input.geoProvinces?.length ? input.geoProvinces : [...TOP_GEO_PROVINCES.slice(0, 5)];
    nodes.push(...geoNodes(primary, provinces));
  }

  return {
    name: input.name || `${capitalizeKeyword(primary)} Keyword Group Planı`,
    primaryKeyword: primary,
    keywordGroup: group,
    category: input.category || null,
    targetType: "KEYWORD_GROUP",
    nodes,
  };
}

export function generateCategoryPlan(input: ContentPlanInput): PlanDraft {
  const category = (input.category || input.primaryKeyword).trim();
  const keyword = input.primaryKeyword.trim() || category;
  const nodes: PlanDraftNode[] = [
    {
      nodeType: "CATEGORY",
      title: category,
      keyword,
      priority: 95,
      estimatedTraffic: estimateNodeTraffic("CATEGORY", { priority: 95 }),
      parentKey: null,
      metadata: { role: "category-hub" },
    },
    landingNode(keyword),
    ...blogNodes(keyword).map((n) => ({ ...n, parentKey: "landing" })),
  ];

  return {
    name: input.name || `${category} Kategori Planı`,
    primaryKeyword: keyword,
    keywordGroup: input.keywordGroup || [],
    category,
    targetType: "CATEGORY",
    nodes,
  };
}

export function generateProductPlan(input: ContentPlanInput): PlanDraft {
  const productName = (input.productName || input.primaryKeyword).trim();
  const keyword = input.primaryKeyword.trim() || productName;
  const nodes: PlanDraftNode[] = [
    {
      nodeType: "PRODUCT",
      title: productName,
      keyword,
      priority: 95,
      estimatedTraffic: estimateNodeTraffic("PRODUCT", { priority: 95 }),
      parentKey: null,
      metadata: { productId: input.productId, role: "product-hub" },
    },
    landingNode(keyword),
    ...blogNodes(keyword),
    ...faqNodes(keyword),
  ];

  return {
    name: input.name || `${productName} Ürün Planı`,
    primaryKeyword: keyword,
    keywordGroup: input.keywordGroup || [],
    category: input.category || null,
    targetType: "PRODUCT",
    nodes,
  };
}

export function generateGeoPlan(input: ContentPlanInput): PlanDraft {
  const keyword = input.primaryKeyword.trim();
  const provinces = input.geoProvinces?.length ? input.geoProvinces : getAllProvinceNames();
  const nodes: PlanDraftNode[] = [
    landingNode(keyword),
    ...geoNodes(keyword, provinces),
  ];

  return {
    name: input.name || `${capitalizeKeyword(keyword)} GEO Yayılım Planı`,
    primaryKeyword: keyword,
    keywordGroup: input.keywordGroup || [],
    category: input.category || null,
    targetType: "GEO",
    nodes,
  };
}

export function generateFaqPlan(input: ContentPlanInput): PlanDraft {
  const keyword = input.primaryKeyword.trim();
  const nodes: PlanDraftNode[] = [landingNode(keyword), ...faqNodes(keyword)];

  return {
    name: input.name || `${capitalizeKeyword(keyword)} FAQ Planı`,
    primaryKeyword: keyword,
    keywordGroup: input.keywordGroup || [],
    category: input.category || null,
    targetType: "KEYWORD",
    nodes,
  };
}

export function generateClusterPlan(input: ContentPlanInput): PlanDraft {
  const keyword = input.primaryKeyword.trim();
  const provinces = input.geoProvinces?.length ? input.geoProvinces : [...TOP_GEO_PROVINCES];
  const nodes: PlanDraftNode[] = [
    landingNode(keyword),
    ...blogNodes(keyword),
    ...faqNodes(keyword),
    ...geoNodes(keyword, provinces),
    ...categoryNodes(keyword, input.category),
  ];

  if (input.productName || input.productId) {
    nodes.unshift({
      nodeType: "PRODUCT",
      title: input.productName || capitalizeKeyword(keyword),
      keyword,
      priority: 90,
      estimatedTraffic: estimateNodeTraffic("PRODUCT", { priority: 90 }),
      parentKey: null,
      metadata: { productId: input.productId },
    });
  }

  return {
    name: input.name || `${capitalizeKeyword(keyword)} Topic Cluster Planı`,
    primaryKeyword: keyword,
    keywordGroup: input.keywordGroup || [],
    category: input.category || null,
    targetType: "CLUSTER",
    nodes,
  };
}

/** parentKey "landing" → gerçek landing node id'sine çözülür */
export function resolveParentIds(
  draftNodes: PlanDraftNode[],
  idByKey: Map<string, string>
): Array<PlanDraftNode & { parentNodeId: string | null }> {
  const landingId = idByKey.get("landing") || null;
  return draftNodes.map((node) => ({
    ...node,
    parentNodeId: node.parentKey === "landing" ? landingId : node.parentKey ? idByKey.get(node.parentKey) || null : null,
  }));
}
