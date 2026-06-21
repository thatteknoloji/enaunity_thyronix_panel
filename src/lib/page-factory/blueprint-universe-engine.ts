import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type {
  BlueprintUniverseDraft,
  UniverseConfig,
  UniverseEngineResult,
  UniverseGeoLevel,
} from "./types";
import { buildUniverseEstimate } from "./universe-estimator";

type GeoNode = {
  id: string;
  level: UniverseGeoLevel;
  name: string;
  path: string;
  hierarchyLevel: number;
};

type ResolvedRefs = {
  industryName: string;
  categories: Array<{ id: string; name: string }>;
  intents: Array<{ id: string; name: string }>;
  faqPatternIds: string[];
  geoNodes: GeoNode[];
  counts: {
    provinces: number;
    districts: number;
    neighborhoods: number;
    villages: number;
    categories: number;
    intents: number;
    faqPatterns: number;
    geoNodes: number;
  };
};

async function resolveRefs(projectId: string, sector: string, config: UniverseConfig): Promise<ResolvedRefs> {
  const [industry, categories, intents, faqPatterns] = await Promise.all([
    config.selectedIndustryId
      ? prisma.industry.findUnique({ where: { id: config.selectedIndustryId } })
      : prisma.industry.findFirst({ where: { OR: [{ slug: slugify(sector) }, { name: sector }] } }),
    config.selectedCategoryIds.length
      ? prisma.industryCategory.findMany({ where: { id: { in: config.selectedCategoryIds }, isActive: true } })
      : prisma.industryCategory.findMany({
          where: config.selectedIndustryId ? { industryId: config.selectedIndustryId, isActive: true } : { isActive: true },
          take: 50,
        }),
    config.selectedIntentIds.length
      ? prisma.searchIntent.findMany({ where: { id: { in: config.selectedIntentIds }, isActive: true } })
      : prisma.searchIntent.findMany({ where: { isActive: true }, take: 20 }),
    prisma.questionPattern.findMany({ where: { isActive: true }, take: 8, select: { id: true } }),
  ]);

  const industryName = industry?.name || sector;
  const geoNodes = await resolveGeoNodes(config);

  return {
    industryName,
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    intents: intents.map((i) => ({ id: i.id, name: i.name })),
    faqPatternIds: faqPatterns.map((p) => p.id),
    geoNodes,
    counts: {
      provinces: config.selectedProvinceIds.length || geoNodes.filter((g) => g.level === "province").length || (config.selectedGeoLevels.includes("province") ? await prisma.geoProvince.count({ where: { isActive: true } }) : 0),
      districts: config.selectedDistrictIds.length || geoNodes.filter((g) => g.level === "district").length || 0,
      neighborhoods: config.selectedNeighborhoodIds.length || geoNodes.filter((g) => g.level === "neighborhood").length || 0,
      villages: config.selectedVillageIds.length || geoNodes.filter((g) => g.level === "village").length || 0,
      categories: categories.length,
      intents: intents.length,
      faqPatterns: faqPatterns.length,
      geoNodes: geoNodes.length,
    },
  };
}

async function resolveGeoNodes(config: UniverseConfig): Promise<GeoNode[]> {
  const levels = config.selectedGeoLevels.length ? config.selectedGeoLevels : (["district"] as UniverseGeoLevel[]);
  const deepest = levels[levels.length - 1];
  const nodes: GeoNode[] = [];

  if (deepest === "province") {
    const provinces = await prisma.geoProvince.findMany({
      where: {
        isActive: true,
        ...(config.selectedProvinceIds.length ? { id: { in: config.selectedProvinceIds } } : {}),
      },
      orderBy: { plateCode: "asc" },
      take: 500,
    });
    for (const p of provinces) {
      nodes.push({ id: p.id, level: "province", name: p.name, path: p.name, hierarchyLevel: 1 });
    }
    return nodes;
  }

  if (deepest === "district") {
    const districts = await prisma.geoDistrict.findMany({
      where: {
        isActive: true,
        ...(config.selectedDistrictIds.length ? { id: { in: config.selectedDistrictIds } } : {}),
        ...(config.selectedProvinceIds.length ? { provinceId: { in: config.selectedProvinceIds } } : {}),
      },
      include: { province: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 2000,
    });
    for (const d of districts) {
      nodes.push({
        id: d.id,
        level: "district",
        name: d.name,
        path: `${d.province.name} > ${d.name}`,
        hierarchyLevel: 2,
      });
    }
    return nodes;
  }

  if (deepest === "neighborhood") {
    const neighborhoods = await prisma.geoNeighborhood.findMany({
      where: {
        isActive: true,
        ...(config.selectedNeighborhoodIds.length ? { id: { in: config.selectedNeighborhoodIds } } : {}),
        ...(config.selectedDistrictIds.length ? { districtId: { in: config.selectedDistrictIds } } : {}),
      },
      include: { district: { include: { province: { select: { name: true } } } } },
      orderBy: { name: "asc" },
      take: 3000,
    });
    for (const n of neighborhoods) {
      nodes.push({
        id: n.id,
        level: "neighborhood",
        name: n.name,
        path: `${n.district.province.name} > ${n.district.name} > ${n.name}`,
        hierarchyLevel: 3,
      });
    }
    return nodes;
  }

  const villages = await prisma.geoVillage.findMany({
    where: {
      isActive: true,
      ...(config.selectedVillageIds.length ? { id: { in: config.selectedVillageIds } } : {}),
      ...(config.selectedDistrictIds.length ? { districtId: { in: config.selectedDistrictIds } } : {}),
    },
    include: { district: { include: { province: { select: { name: true } } } } },
    orderBy: { name: "asc" },
    take: 3000,
  });
  for (const v of villages) {
    nodes.push({
      id: v.id,
      level: "village",
      name: v.name,
      path: `${v.district.province.name} > ${v.district.name} > ${v.name}`,
      hierarchyLevel: 4,
    });
  }
  return nodes;
}

function buildTitle(geoPath: string, categoryName: string, intentName: string, industryName: string, pageType: string): string {
  const leaf = geoPath.split(" > ").pop() || geoPath;
  if (pageType === "faq") return `${leaf} ${categoryName} SSS — ${intentName}`;
  if (pageType === "local_modifier") return `${geoPath} ${categoryName} ${intentName} (Yerel)`;
  return `${geoPath} ${categoryName} ${intentName}`.replace(`${industryName} `, "").trim() || `${leaf} ${categoryName} ${intentName}`;
}

function pageTypesForConfig(config: UniverseConfig): string[] {
  const types = ["geo_landing"];
  if (config.includeFaq) types.push("faq");
  if (config.includeLocalModifiers) types.push("local_modifier");
  return types;
}

function hierarchyForPageType(base: number, pageType: string): number {
  if (pageType === "faq") return base + 1;
  if (pageType === "local_modifier") return base;
  return base;
}

function* generateCombinations(
  refs: ResolvedRefs,
  config: UniverseConfig,
  limit: number
): Generator<BlueprintUniverseDraft> {
  const pageTypes = pageTypesForConfig(config);
  const usedSlugs = new Set<string>();
  let count = 0;

  for (const geo of refs.geoNodes) {
    for (const cat of refs.categories) {
      for (const intent of refs.intents) {
        for (const pageType of pageTypes) {
          if (count >= limit) return;
          const industryPath = `${refs.industryName} > ${cat.name}`;
          const title = buildTitle(geo.path, cat.name, intent.name, refs.industryName, pageType);
          let slug = slugify(title);
          let suffix = 0;
          while (usedSlugs.has(slug)) {
            suffix += 1;
            slug = `${slugify(title)}-${suffix}`;
          }
          usedSlugs.add(slug);

          const targetKeyword = `${geo.path.split(" > ").pop()} ${cat.name} ${intent.name}`.toLowerCase();
          const secondaryKeywords = [cat.name, intent.name, refs.industryName, geo.name].filter(Boolean);

          yield {
            title,
            slug,
            pageType,
            hierarchyLevel: hierarchyForPageType(geo.hierarchyLevel, pageType),
            geoPath: geo.path,
            industryPath,
            intent: intent.name,
            targetKeyword,
            secondaryKeywords,
            faqPatternIds: pageType === "faq" ? refs.faqPatternIds : [],
            internalLinkHints: [geo.path, industryPath, intent.name],
            clusterPath: `${geo.path} > ${industryPath} > ${intent.name}`,
            metadata: {
              slug,
              geoPath: geo.path,
              industryPath,
              intent: intent.name,
              targetKeyword,
              secondaryKeywords,
              faqPatternIds: pageType === "faq" ? refs.faqPatternIds : [],
              internalLinkHints: [geo.path, industryPath],
              generationSource: "BLUEPRINT_UNIVERSE_V2",
              contentStatus: "NOT_GENERATED",
              categoryId: cat.id,
              intentId: intent.id,
              geoNodeId: geo.id,
              geoLevel: geo.level,
              status: "planned",
            },
          };
          count += 1;
        }
      }
    }
  }
}

export async function runBlueprintUniverseEngine(
  projectId: string,
  sector: string,
  config: UniverseConfig,
  previewLimit?: number
): Promise<UniverseEngineResult> {
  const refs = await resolveRefs(projectId, sector, config);
  const estimate = buildUniverseEstimate(config, refs.counts);
  const previewCap = previewLimit ?? config.maxPreview;
  const previewBlueprints = [...generateCombinations(refs, config, previewCap)];

  return {
    estimatedTotal: estimate.estimatedTotal,
    previewBlueprints,
    warnings: estimate.warnings,
    limits: estimate.limits,
    generationPlan: estimate.generationPlan,
    estimate,
  };
}

export async function generateBlueprintBatch(
  projectId: string,
  sector: string,
  config: UniverseConfig,
  existingSlugs: Set<string>
): Promise<{ blueprints: BlueprintUniverseDraft[]; generated: number }> {
  const refs = await resolveRefs(projectId, sector, config);
  const estimate = buildUniverseEstimate(config, refs.counts);

  if (!estimate.canGenerate) {
    throw new Error("Bu ölçekte direkt generate engellendi — önce tahmin/plan oluşturun");
  }

  const cap = Math.min(config.maxGenerate, config.generationLimit, estimate.estimatedTotal);
  const drafts: BlueprintUniverseDraft[] = [];

  for (const draft of generateCombinations(refs, config, cap)) {
    let slug = draft.slug;
    let suffix = 0;
    while (existingSlugs.has(slug)) {
      suffix += 1;
      slug = `${draft.slug}-${suffix}`;
    }
    existingSlugs.add(slug);
    drafts.push({ ...draft, slug, metadata: { ...draft.metadata, slug } });
  }

  return { blueprints: drafts, generated: drafts.length };
}

export { resolveRefs, generateCombinations };
