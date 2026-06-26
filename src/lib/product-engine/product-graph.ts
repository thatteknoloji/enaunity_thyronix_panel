import { POD_PRODUCT_PROFILES } from "@/lib/pod-core/product-profiles/pod-product-profile-registry";
import {
  buildProductGraphFromPod,
  mergeProductGraph,
} from "./product-graph-builder";
import type { ProductGraphLookup, ProductGraphProfile } from "./types";

const GRAPH_BY_CODE = new Map<string, ProductGraphProfile>();
const GRAPH_BY_TEMPLATE = new Map<string, ProductGraphProfile>();
const GRAPH_BY_CATEGORY = new Map<string, ProductGraphProfile[]>();

function indexGraph(graph: ProductGraphProfile) {
  GRAPH_BY_CODE.set(graph.identity.productCode, graph);
  GRAPH_BY_TEMPLATE.set(graph.pod.mockupTemplate, graph);
  const cat = graph.identity.category;
  const list = GRAPH_BY_CATEGORY.get(cat) ?? [];
  list.push(graph);
  GRAPH_BY_CATEGORY.set(cat, list);
}

for (const profile of POD_PRODUCT_PROFILES) {
  indexGraph(buildProductGraphFromPod(profile));
}

/** All canonical product profiles (sync, in-memory) */
export function listProductGraphs(): ProductGraphProfile[] {
  return [...GRAPH_BY_CODE.values()];
}

export function getProductGraphByCode(productCode: string): ProductGraphProfile | undefined {
  return GRAPH_BY_CODE.get(productCode);
}

export function getProductGraphByTemplateId(templateId: string): ProductGraphProfile | undefined {
  return GRAPH_BY_TEMPLATE.get(templateId);
}

export function getProductGraphByCategory(category: string): ProductGraphProfile | undefined {
  return GRAPH_BY_CATEGORY.get(category)?.[0];
}

export function getProductGraphsByCategory(category: string): ProductGraphProfile[] {
  return GRAPH_BY_CATEGORY.get(category) ?? [];
}

export function resolveProductGraph(lookup: ProductGraphLookup): ProductGraphProfile | undefined {
  if (lookup.productCode) {
    const hit = getProductGraphByCode(lookup.productCode);
    if (hit) return hit;
  }
  if (lookup.templateId) {
    const hit = getProductGraphByTemplateId(lookup.templateId);
    if (hit) return hit;
  }
  if (lookup.category) {
    const hit = getProductGraphByCategory(lookup.category);
    if (hit) return hit;
  }
  if (lookup.slug) {
    return listProductGraphs().find((g) => g.identity.slug === lookup.slug);
  }
  return undefined;
}

/** Apply JSON overrides on top of canonical graph (admin/API path) */
export function applyGraphOverrides(
  graph: ProductGraphProfile,
  overrides?: Parameters<typeof mergeProductGraph>[1]
): ProductGraphProfile {
  return mergeProductGraph(graph, overrides);
}

export function listProductGraphCategories(): string[] {
  return [...GRAPH_BY_CATEGORY.keys()].sort();
}

export function listProductGraphCodes(): string[] {
  return [...GRAPH_BY_CODE.keys()].sort();
}
