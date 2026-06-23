import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";
import type { AeoBlueprintPayload, AeoBulkFilters } from "./aeo-types";
import { generateAnswerBlocks } from "./answer-block-engine";
import { generateCitationHints } from "./citation-hint-engine";
import { generateFaqBlocks } from "./faq-block-engine";
import { generateGeoHints } from "./geo-answer-engine";
import { generateSchemaHints } from "./schema-hint-engine";
import { calculateAeoQualityScore } from "./aeo-quality-score";
import {
  isSensitiveCategory,
  parseMetadata,
  resolveBlueprintKind,
  makeId,
  type AeoProductContext,
} from "./aeo-utils";

export type AeoGenerateResult = {
  blueprintId: string;
  dryRun: boolean;
  payload: AeoBlueprintPayload;
  written: boolean;
};

export type AeoBulkResult = {
  processed: number;
  written: number;
  skipped: number;
  dryRun: boolean;
  results: Array<{ blueprintId: string; aeoQualityScore: number; written: boolean }>;
  errors: Array<{ blueprintId: string; message: string }>;
};

async function loadBlueprintBase(blueprintId: string) {
  const blueprint = await prisma.pageFactoryBlueprint.findUnique({
    where: { id: blueprintId },
    include: { project: true },
  });
  if (!blueprint) throw new Error("Blueprint bulunamadı");
  const metadata = parseMetadata(blueprint.metadataJson);
  return { blueprint, metadata, project: blueprint.project };
}

async function loadBlueprintContext(blueprintId: string) {
  const { blueprint, metadata, project } = await loadBlueprintBase(blueprintId);
  const productId = metadata.productId as string | undefined;
  if (!productId) throw new Error("Blueprint productId içermiyor — Product Universe blueprinti değil");

  const product = await prisma.productUniverse.findUnique({
    where: { id: productId },
    include: {
      entities: true,
      attributes: true,
      images: true,
      contentDNA: true,
    },
  });
  if (!product) throw new Error("Ürün bulunamadı");

  return { blueprint, metadata, product, project };
}

function buildProductContext(product: Awaited<ReturnType<typeof loadBlueprintContext>>["product"]): AeoProductContext {
  return {
    product,
    entities: product.entities,
    attributes: product.attributes,
    images: product.images,
    contentDNA: product.contentDNA,
  };
}

function parseInternalLinks(metadata: Record<string, unknown>) {
  const raw = metadata.internalLinkHints;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      anchor: String(x.anchor || ""),
      targetType: String(x.targetType || ""),
      targetKeyword: String(x.targetKeyword || ""),
      priority: Number(x.priority) || 0,
    }))
    .filter((x) => x.anchor);
}

export function buildAeoPayload(
  ctx: AeoProductContext,
  blueprint: { id: string; pageType: string; title: string },
  metadata: Record<string, unknown>,
  projectCountry?: string | null
): AeoBlueprintPayload {
  const blueprintKind = resolveBlueprintKind(metadata, blueprint.pageType);
  const citationHints = generateCitationHints(ctx, metadata);
  const faqBlocks = generateFaqBlocks(ctx, blueprintKind, metadata, citationHints);
  const geoHints = generateGeoHints(ctx, blueprintKind, metadata, projectCountry);
  const hasLocation = !!(geoHints.province || geoHints.district);
  const schemaHints = generateSchemaHints(blueprintKind, ctx, metadata, hasLocation);
  const answerBlocks = generateAnswerBlocks(ctx, blueprintKind, metadata, faqBlocks, geoHints.geoAnswerBlocks);

  const noindexRecommended = metadata.noindexRecommended === true;
  const aeoQualityScore = calculateAeoQualityScore({
    answerBlocks,
    faqBlocks,
    schemaHints,
    citationHints,
    entityCount: ctx.entities.length,
    hasImage: ctx.images.length > 0,
    hasDescriptionClean: !!ctx.product.descriptionClean?.trim(),
    noindexRecommended,
  });

  return {
    version: "AEO_LAYER_V1",
    productId: ctx.product.id,
    productName: ctx.product.normalizedName,
    blueprintType: blueprintKind,
    primaryIntent: (metadata.intent as string) || ctx.contentDNA?.intent || "commercial",
    targetQuery: (metadata.targetKeyword as string) || ctx.contentDNA?.targetKeyword || ctx.product.normalizedName.toLowerCase(),
    answerBlocks,
    faqBlocks,
    schemaHints,
    geoHints,
    citationHints,
    internalLinkHints: parseInternalLinks(metadata),
    aeoQualityScore,
    noindexRecommended,
    sensitiveCategoryWarning: isSensitiveCategory(ctx.product.categoryPath),
    generatedAt: new Date().toISOString(),
  };
}

export function buildGeoBlueprintAeoPayload(
  blueprint: { id: string; pageType: string; title: string },
  metadata: Record<string, unknown>,
  projectCountry?: string | null
): AeoBlueprintPayload {
  const blueprintKind = resolveBlueprintKind(metadata, blueprint.pageType);
  const title = blueprint.title || String(metadata.title || "Sayfa");
  const geoPath = String(metadata.geoPath || "");
  const targetQuery = String(metadata.targetKeyword || metadata.intent || title).toLowerCase();
  const geoParts = geoPath.split(/[>]/).map((p) => p.trim()).filter(Boolean);
  const province = geoParts[0] || null;
  const district = geoParts[1] || null;

  const faqAnswer = `${title} — ${province ? `${province} bölgesi` : "hedef bölge"} için hazırlanan bilgilendirici içeriktir.`;
  const faqBlocks = [
    {
      id: makeId("geo-faq", 0),
      question: `${title} nedir?`,
      answer: faqAnswer,
      shortAnswer: faqAnswer.slice(0, 140),
      category: "geo",
      confidenceScore: 0.7,
      sourceHints: [],
    },
  ];

  const quickAnswer = `${title} hakkında ${province || "bölgesel"} odaklı rehber ve bilgi içeriği.`;
  const answerBlocks = [
    {
      id: makeId("geo-a", 0),
      type: "QUICK_ANSWER" as const,
      title,
      question: targetQuery,
      answer: quickAnswer,
      shortAnswer: quickAnswer.slice(0, 160),
      entities: [title, province].filter(Boolean) as string[],
      intents: ["local", "geo"],
      confidenceScore: province ? 0.75 : 0.5,
      sourceHints: [],
      schemaType: "WebPage",
      metadata: { province, district },
    },
  ];

  const geoHints = {
    country: projectCountry === "TR" ? "Türkiye" : projectCountry || null,
    province,
    district,
    locationIntent: province ? `${province} odaklı yerel arama` : null,
    localQueryVariants: province ? [`${title} ${province}`] : [title],
    geoAnswerBlocks: answerBlocks,
  };

  const schemaHints = [
    {
      type: "WebPage",
      priority: 1,
      requiredFields: ["name"],
      availableFields: ["name", "description"],
      missingFields: [],
      jsonLdDraft: { "@type": "WebPage", name: title },
    },
  ];
  const aeoQualityScore = Math.min(
    85,
    45 + (title.length > 5 ? 10 : 0) + (geoPath ? 15 : 0) + faqBlocks.length * 5 + answerBlocks.length * 5
  );

  return {
    version: "AEO_LAYER_V1",
    productId: "",
    productName: title,
    blueprintType: blueprintKind,
    primaryIntent: String(metadata.intent || "informational"),
    targetQuery,
    answerBlocks,
    faqBlocks,
    schemaHints,
    geoHints,
    citationHints: [],
    internalLinkHints: parseInternalLinks(metadata),
    aeoQualityScore,
    noindexRecommended: metadata.noindexRecommended === true,
    sensitiveCategoryWarning: false,
    generatedAt: new Date().toISOString(),
  };
}

export async function previewAeoForBlueprint(blueprintId: string): Promise<AeoBlueprintPayload> {
  const { blueprint, metadata, project } = await loadBlueprintBase(blueprintId);
  const productId = metadata.productId as string | undefined;
  if (productId) {
    const product = await prisma.productUniverse.findUnique({
      where: { id: productId },
      include: { entities: true, attributes: true, images: true, contentDNA: true },
    });
    if (!product) throw new Error("Ürün bulunamadı");
    return buildAeoPayload(buildProductContext(product), blueprint, metadata, project.country);
  }
  return buildGeoBlueprintAeoPayload(blueprint, metadata, project.country);
}

export async function generateAeoForBlueprint(blueprintId: string, dryRun = false): Promise<AeoGenerateResult> {
  const { blueprint, metadata, project } = await loadBlueprintBase(blueprintId);
  const productId = metadata.productId as string | undefined;

  let payload: AeoBlueprintPayload;
  if (productId) {
    const product = await prisma.productUniverse.findUnique({
      where: { id: productId },
      include: { entities: true, attributes: true, images: true, contentDNA: true },
    });
    if (!product) throw new Error("Ürün bulunamadı");
    payload = buildAeoPayload(buildProductContext(product), blueprint, metadata, project.country);
  } else {
    payload = buildGeoBlueprintAeoPayload(blueprint, metadata, project.country);
  }

  if (dryRun) {
    return { blueprintId, dryRun: true, payload, written: false };
  }

  const nextMetadata = {
    ...metadata,
    contentStatus: metadata.contentStatus === "NOT_GENERATED" || !metadata.contentStatus
      ? "AEO_READY"
      : metadata.contentStatus,
    aeo: payload,
  };

  await prisma.pageFactoryBlueprint.update({
    where: { id: blueprintId },
    data: { metadataJson: JSON.stringify(nextMetadata) },
  });

  return { blueprintId, dryRun: false, payload, written: true };
}

export async function getAeoForBlueprint(blueprintId: string): Promise<AeoBlueprintPayload | null> {
  const { metadata } = await loadBlueprintBase(blueprintId);
  const aeo = metadata.aeo as AeoBlueprintPayload | undefined;
  return aeo?.version === "AEO_LAYER_V1" ? aeo : null;
}

export async function assertBlueprintAccess(
  blueprintId: string,
  user: { role: string; dealerId?: string | null }
) {
  const ctx = await loadBlueprintContext(blueprintId);
  if (!isAdminRole(user.role) && ctx.project.dealerId && ctx.project.dealerId !== user.dealerId) {
    throw new Error("Bu blueprinte erişim yetkiniz yok");
  }
  return ctx;
}

function matchesAeoFilter(metadata: Record<string, unknown>, filters: AeoBulkFilters): boolean {
  const aeo = metadata.aeo as AeoBlueprintPayload | undefined;
  const hasAeo = aeo?.version === "AEO_LAYER_V1";

  if (filters.aeoStatus === "missing" && hasAeo) return false;
  if (filters.aeoStatus === "ready" && !hasAeo) return false;
  if (filters.aeoStatus === "low" && (!hasAeo || (aeo.aeoQualityScore ?? 0) >= 50)) return false;

  if (filters.minAeoScore != null && hasAeo && (aeo.aeoQualityScore ?? 0) < filters.minAeoScore) return false;

  return true;
}

export async function generateBulkAeoForBlueprints(
  projectId: string,
  filters: AeoBulkFilters = {}
): Promise<AeoBulkResult> {
  const limit = Math.min(filters.limit ?? 100, 500);
  const dryRun = filters.dryRun ?? false;

  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
  });

  const matched = all.filter((bp) => {
    const metadata = parseMetadata(bp.metadataJson);
    if (filters.generationSource && metadata.generationSource !== filters.generationSource) return false;
    if (filters.blueprintType && metadata.blueprintKind !== filters.blueprintType) return false;
    if (filters.minQualityScore != null) {
      const qs = Number(metadata.qualityScore ?? 0);
      if (qs < filters.minQualityScore) return false;
    }
    if (!matchesAeoFilter(metadata, filters)) return false;
    return true;
  }).slice(0, limit);

  const result: AeoBulkResult = {
    processed: 0,
    written: 0,
    skipped: 0,
    dryRun,
    results: [],
    errors: [],
  };

  for (const bp of matched) {
    result.processed++;
    try {
      const gen = await generateAeoForBlueprint(bp.id, dryRun);
      result.results.push({
        blueprintId: bp.id,
        aeoQualityScore: gen.payload.aeoQualityScore,
        written: gen.written,
      });
      if (gen.written) result.written++;
    } catch (e) {
      result.skipped++;
      result.errors.push({
        blueprintId: bp.id,
        message: e instanceof Error ? e.message : "Bilinmeyen hata",
      });
    }
  }

  return result;
}
