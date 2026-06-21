import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { CreateProjectInput, ProjectMetadata, ProductionType } from "./types";
import { PRODUCTION_TYPES } from "./types";
import { buildAllTopologies } from "./topology-engine";
import { buildClusterChains, estimateClusterCount } from "./cluster-engine";
import { estimatePageCount } from "./estimator-engine";
import { buildBlueprintsFromClusters } from "./blueprint-engine";
import { getGeoStatsForCountry } from "./geo-engine";

function parseMetadata(json: string): ProjectMetadata {
  try {
    return JSON.parse(json || "{}") as ProjectMetadata;
  } catch {
    return {};
  }
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "proje";
  let n = 0;
  while (await prisma.pageFactoryProject.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

export function isValidProductionType(v: string): v is ProductionType {
  return PRODUCTION_TYPES.includes(v as ProductionType);
}

export async function createPageFactoryProject(input: CreateProjectInput) {
  const slug = await uniqueSlug(input.name);
  return prisma.pageFactoryProject.create({
    data: {
      name: input.name.trim(),
      slug,
      sector: input.sector.trim(),
      country: input.country.trim().toUpperCase(),
      language: input.language.trim().toLowerCase(),
      productionType: input.productionType,
      dealerId: input.dealerId || null,
      status: "draft",
      metadataJson: JSON.stringify({
        geoLayers: getGeoStatsForCountry(input.country).layers,
      }),
    },
  });
}

/** Topology + Cluster + Blueprint + Estimator — içerik üretmez */
export async function generatePageFactoryPlan(projectId: string) {
  const project = await prisma.pageFactoryProject.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Proje bulunamadı");

  const productionType = project.productionType as ProductionType;
  const topologies = buildAllTopologies(project.sector, project.country, productionType);
  const clusters = buildClusterChains(project.sector, project.country, 48);
  const estimate = estimatePageCount(project.sector, project.country, productionType);
  const blueprints = buildBlueprintsFromClusters(clusters, productionType, 48);

  await prisma.pageFactoryTopology.deleteMany({ where: { projectId } });
  await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });

  for (const [topologyType, nodes] of Object.entries(topologies)) {
    await prisma.pageFactoryTopology.create({
      data: {
        projectId,
        topologyType,
        nodeCount: nodes.length,
        metadataJson: JSON.stringify({ nodes, generatedAt: new Date().toISOString() }),
      },
    });
  }

  for (const bp of blueprints) {
    await prisma.pageFactoryBlueprint.create({
      data: {
        projectId,
        title: bp.title,
        pageType: bp.pageType,
        hierarchyLevel: bp.hierarchyLevel,
        clusterPath: bp.clusterPath,
        metadataJson: JSON.stringify(bp.metadata),
      },
    });
  }

  const metadata: ProjectMetadata = {
    estimatedPageCount: estimate.totalPages,
    estimate,
    clusters,
    clusterCount: estimateClusterCount(project.sector, project.country),
    sampleClusterPaths: clusters.slice(0, 8).map((c) => c.fullLabel),
    geoLayers: getGeoStatsForCountry(project.country).layers,
    generatedAt: new Date().toISOString(),
  };

  return prisma.pageFactoryProject.update({
    where: { id: projectId },
    data: {
      status: "planned",
      metadataJson: JSON.stringify(metadata),
    },
    include: {
      topologies: true,
      blueprints: { take: 20, orderBy: { hierarchyLevel: "asc" } },
    },
  });
}

export async function getPageFactoryDashboard(dealerId?: string | null) {
  const where = dealerId ? { dealerId } : {};
  const [projectCount, blueprintCount, topologyAgg, projects] = await Promise.all([
    prisma.pageFactoryProject.count({ where }),
    prisma.pageFactoryBlueprint.count({
      where: dealerId ? { project: { dealerId } } : {},
    }),
    prisma.pageFactoryTopology.aggregate({
      where: dealerId ? { project: { dealerId } } : {},
      _sum: { nodeCount: true },
    }),
    prisma.pageFactoryProject.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { _count: { select: { blueprints: true, topologies: true } } },
    }),
  ]);

  let estimatedPages = 0;
  let clusterTotal = 0;
  for (const p of projects) {
    const meta = parseMetadata(p.metadataJson);
    estimatedPages += meta.estimatedPageCount || 0;
    clusterTotal += meta.clusterCount || 0;
  }

  return {
    totalProjects: projectCount,
    totalBlueprints: blueprintCount,
    totalTopologyNodes: topologyAgg._sum.nodeCount || 0,
    totalClusters: clusterTotal,
    estimatedPageCount: estimatedPages,
    projects,
  };
}

export async function listProjects(dealerId?: string | null) {
  return prisma.pageFactoryProject.findMany({
    where: dealerId ? { dealerId } : {},
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { blueprints: true, topologies: true } } },
  });
}

export async function getProjectDetail(id: string) {
  return prisma.pageFactoryProject.findUnique({
    where: { id },
    include: {
      topologies: true,
      blueprints: { orderBy: [{ hierarchyLevel: "asc" }, { title: "asc" }] },
    },
  });
}

export { parseMetadata };
