import type { ClusterChain } from "./types";
import { BLUEPRINT_SECTIONS } from "./types";

export type BlueprintDraft = {
  title: string;
  pageType: string;
  hierarchyLevel: number;
  clusterPath: string;
  sections: string[];
  metadata: Record<string, unknown>;
};

/** Blueprint şablonu — bölüm isimleri only, içerik yok */
export function buildBlueprintForCluster(cluster: ClusterChain, productionType: string): BlueprintDraft {
  const leaf = cluster.path[cluster.path.length - 1] || "Sayfa";
  const pageType =
    cluster.hierarchyLevel >= 3 ? "geo_landing" : cluster.hierarchyLevel >= 2 ? "category" : "pillar";

  return {
    title: leaf,
    pageType,
    hierarchyLevel: cluster.hierarchyLevel,
    clusterPath: cluster.fullLabel,
    sections: [...BLUEPRINT_SECTIONS],
    metadata: {
      productionType,
      sectionCount: BLUEPRINT_SECTIONS.length,
      hasContent: false,
      phase: 1,
      blocks: BLUEPRINT_SECTIONS.map((s) => ({ section: s, content: null, status: "template_only" })),
    },
  };
}

export function buildBlueprintsFromClusters(clusters: ClusterChain[], productionType: string, limit = 50): BlueprintDraft[] {
  return clusters.slice(0, limit).map((c) => buildBlueprintForCluster(c, productionType));
}
