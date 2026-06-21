import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";
import {
  DEFAULT_UNIVERSE_CONFIG,
  type UniverseConfig,
  type UniverseProjectMetadata,
} from "./types";
import { runBlueprintUniverseEngine, generateBlueprintBatch } from "./blueprint-universe-engine";
import { parseMetadata } from "./project-service";
import { getRiskLevel } from "./universe-estimator";

function mergeConfig(input: Partial<UniverseConfig>): UniverseConfig {
  return { ...DEFAULT_UNIVERSE_CONFIG, ...input };
}

export async function saveUniverseConfig(projectId: string, config: Partial<UniverseConfig>) {
  const project = await prisma.pageFactoryProject.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Proje bulunamadı");
  const meta = parseMetadata(project.metadataJson) as UniverseProjectMetadata;
  const universe = mergeConfig({ ...(meta.universe || {}), ...config });
  return prisma.pageFactoryProject.update({
    where: { id: projectId },
    data: {
      metadataJson: JSON.stringify({ ...meta, universe }),
    },
  });
}

export async function estimateBlueprintUniverse(projectId: string, configInput: Partial<UniverseConfig>) {
  const project = await prisma.pageFactoryProject.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Proje bulunamadı");

  const config = mergeConfig(configInput);
  const result = await runBlueprintUniverseEngine(projectId, project.sector, config);

  const meta = parseMetadata(project.metadataJson) as UniverseProjectMetadata;
  await prisma.pageFactoryProject.update({
    where: { id: projectId },
    data: {
      metadataJson: JSON.stringify({
        ...meta,
        universe: config,
        universeEstimate: result.estimate,
        estimatedPageCount: result.estimatedTotal,
      }),
    },
  });

  return result;
}

export async function generateBlueprintUniverse(
  projectId: string,
  configInput: Partial<UniverseConfig>,
  isAdmin: boolean
) {
  const project = await prisma.pageFactoryProject.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Proje bulunamadı");

  const config = mergeConfig({
    ...configInput,
    maxGenerate: isAdmin ? Math.min(configInput.maxGenerate ?? 50000, 50000) : Math.min(configInput.maxGenerate ?? 5000, 5000),
  });

  const estimate = await runBlueprintUniverseEngine(projectId, project.sector, config, 0);
  const risk = getRiskLevel(estimate.estimatedTotal);

  if (estimate.estimatedTotal >= 1_000_000) {
    throw new Error("1.000.000+ blueprint — direkt generate engellendi. Batch planı kullanın.");
  }
  if (estimate.estimatedTotal >= 100_000 && !isAdmin) {
    throw new Error("100.000+ blueprint — admin onayı veya daha dar filtre gerekli");
  }
  if (!estimate.estimate.canGenerate) {
    throw new Error("Generate koşulları sağlanmadı — GEO, kategori ve niyet seçin");
  }

  const existing = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    select: { metadataJson: true },
  });
  const existingSlugs = new Set<string>();
  for (const bp of existing) {
    try {
      const m = JSON.parse(bp.metadataJson || "{}") as { slug?: string };
      if (m.slug) existingSlugs.add(m.slug);
    } catch {
      /* skip */
    }
  }

  const { blueprints, generated } = await generateBlueprintBatch(projectId, project.sector, config, existingSlugs);
  if (generated === 0) throw new Error("Üretilecek blueprint bulunamadı");

  const batchSize = Math.max(1, Math.min(config.batchSize, 1000));
  let inserted = 0;

  for (let i = 0; i < blueprints.length; i += batchSize) {
    const chunk = blueprints.slice(i, i + batchSize);
    await prisma.pageFactoryBlueprint.createMany({
      data: chunk.map((bp) => ({
        projectId,
        title: bp.title,
        pageType: bp.pageType,
        hierarchyLevel: bp.hierarchyLevel,
        clusterPath: bp.clusterPath,
        metadataJson: JSON.stringify(bp.metadata),
      })),
    });
    inserted += chunk.length;
  }

  const meta = parseMetadata(project.metadataJson) as UniverseProjectMetadata;
  await prisma.pageFactoryProject.update({
    where: { id: projectId },
    data: {
      status: "planned",
      metadataJson: JSON.stringify({
        ...meta,
        universe: config,
        universeEstimate: estimate.estimate,
        estimatedPageCount: estimate.estimatedTotal,
        lastUniverseGenerate: { at: new Date().toISOString(), count: inserted },
      }),
    },
  });

  return {
    generated: inserted,
    estimatedTotal: estimate.estimatedTotal,
    riskLevel: risk.level,
    warnings: estimate.warnings,
    generationPlan: estimate.generationPlan,
  };
}

export async function listProjectBlueprints(
  projectId: string,
  searchParams: URLSearchParams
) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
  const q = searchParams.get("q")?.trim() || "";
  const pageType = searchParams.get("pageType") || "";
  const intent = searchParams.get("intent") || "";
  const province = searchParams.get("province") || "";
  const district = searchParams.get("district") || "";
  const category = searchParams.get("category") || "";

  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    orderBy: [{ hierarchyLevel: "asc" }, { title: "asc" }],
  });

  const filtered = all.filter((bp) => {
    let meta: Record<string, string> = {};
    try {
      meta = JSON.parse(bp.metadataJson || "{}");
    } catch {
      /* skip */
    }
    if (pageType && bp.pageType !== pageType) return false;
    if (q && !bp.title.toLowerCase().includes(q.toLowerCase()) && !(meta.slug || "").includes(q.toLowerCase())) return false;
    if (intent && meta.intent !== intent) return false;
    if (province && !(meta.geoPath || "").includes(province)) return false;
    if (district && !(meta.geoPath || "").includes(district)) return false;
    if (category && !(meta.industryPath || "").includes(category)) return false;
    return true;
  });

  const total = filtered.length;
  const items = filtered.slice((page - 1) * limit, page * limit).map((bp) => {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(bp.metadataJson || "{}");
    } catch {
      /* skip */
    }
    return {
      id: bp.id,
      title: bp.title,
      slug: metadata.slug || "",
      pageType: bp.pageType,
      hierarchyLevel: bp.hierarchyLevel,
      geoPath: metadata.geoPath || "",
      industryPath: metadata.industryPath || "",
      intent: metadata.intent || "",
      status: metadata.status || metadata.contentStatus || "planned",
      clusterPath: bp.clusterPath,
      metadata,
    };
  });

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function clearProjectBlueprints(projectId: string) {
  const deleted = await prisma.pageFactoryBlueprint.deleteMany({ where: { projectId } });
  return { deleted: deleted.count };
}

export { mergeConfig };
