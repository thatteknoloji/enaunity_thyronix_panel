import { prisma } from "@/lib/db";
import type { User } from "@/types";
import { isThyronixAdmin } from "../access";
import { pickPriceBase } from "./apply";
import { buildRulesMapForSources, filterProductsForOutput } from "./output-filter";
import { applyPriceRules, profileToRulesBundle } from "./resolver";
import {
  defaultRulesBundle,
  type ThyronixAiRules,
  type ThyronixGateRules,
  type ThyronixPriceRules,
  type ThyronixStockRules,
  type ThyronixRulesBundle,
} from "./types";

export type RulesProfileDto = {
  id: string;
  name: string;
  scope: string;
  dealerId: string | null;
  isDefault: boolean;
  outputFormat: string | null;
  price: ThyronixPriceRules;
  stock: ThyronixStockRules;
  gate: ThyronixGateRules;
  ai: ThyronixAiRules;
  createdAt: string;
  updatedAt: string;
  sourceCount?: number;
};

function toDto(
  profile: {
    id: string;
    name: string;
    scope: string;
    dealerId: string | null;
    isDefault: boolean;
    outputFormat: string | null;
    priceRulesJson: string;
    stockRulesJson: string;
    gateRulesJson: string;
    aiRulesJson: string;
    createdAt: Date;
    updatedAt: Date;
    _count?: { sources: number };
  },
): RulesProfileDto {
  const bundle = profileToRulesBundle(profile);
  return {
    id: profile.id,
    name: profile.name,
    scope: profile.scope,
    dealerId: profile.dealerId,
    isDefault: profile.isDefault,
    outputFormat: profile.outputFormat,
    price: bundle.price,
    stock: bundle.stock,
    gate: bundle.gate,
    ai: bundle.ai,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    sourceCount: profile._count?.sources,
  };
}

export async function resolveRulesDealerId(
  user: User,
  requestedDealerId?: string | null,
): Promise<string> {
  if (user.dealerId) {
    if (requestedDealerId && requestedDealerId !== user.dealerId) {
      throw new Error("Forbidden");
    }
    return user.dealerId;
  }
  if (isThyronixAdmin(user)) {
    const id = requestedDealerId?.trim();
    if (!id) throw new Error("dealerId gerekli");
    return id;
  }
  throw new Error("Forbidden");
}

export async function ensureDefaultGlobalProfile(dealerId: string) {
  const existing = await prisma.thyronixRulesProfile.findFirst({
    where: { dealerId, scope: "global", isDefault: true },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing;

  const defaults = defaultRulesBundle();
  return prisma.thyronixRulesProfile.create({
    data: {
      name: "Genel Kurallar",
      scope: "global",
      dealerId,
      tenantScope: "DEALER",
      ownerType: "DEALER",
      isDefault: true,
      priceRulesJson: JSON.stringify(defaults.price),
      stockRulesJson: JSON.stringify(defaults.stock),
      gateRulesJson: JSON.stringify(defaults.gate),
      aiRulesJson: JSON.stringify(defaults.ai),
    },
  });
}

export async function getGlobalRulesProfile(dealerId: string): Promise<RulesProfileDto> {
  const profile = await ensureDefaultGlobalProfile(dealerId);
  return toDto(profile);
}

export async function listRulesProfiles(dealerId: string): Promise<RulesProfileDto[]> {
  await ensureDefaultGlobalProfile(dealerId);
  const rows = await prisma.thyronixRulesProfile.findMany({
    where: { dealerId },
    orderBy: [{ isDefault: "desc" }, { scope: "asc" }, { name: "asc" }],
    include: { _count: { select: { sources: true } } },
  });
  return rows.map(toDto);
}

export async function getRulesProfileById(id: string, dealerId: string): Promise<RulesProfileDto | null> {
  const profile = await prisma.thyronixRulesProfile.findFirst({
    where: { id, dealerId },
    include: { _count: { select: { sources: true } } },
  });
  return profile ? toDto(profile) : null;
}

type ProfilePatch = Partial<{
  name: string;
  price: ThyronixPriceRules;
  stock: ThyronixStockRules;
  gate: ThyronixGateRules;
  ai: ThyronixAiRules;
  outputFormat: string | null;
}>;

export async function updateRulesProfile(
  id: string,
  dealerId: string,
  patch: ProfilePatch,
): Promise<RulesProfileDto> {
  const existing = await prisma.thyronixRulesProfile.findFirst({ where: { id, dealerId } });
  if (!existing) throw new Error("NotFound");

  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.price !== undefined) data.priceRulesJson = JSON.stringify(patch.price);
  if (patch.stock !== undefined) data.stockRulesJson = JSON.stringify(patch.stock);
  if (patch.gate !== undefined) data.gateRulesJson = JSON.stringify(patch.gate);
  if (patch.ai !== undefined) data.aiRulesJson = JSON.stringify(patch.ai);
  if (patch.outputFormat !== undefined) data.outputFormat = patch.outputFormat;

  const updated = await prisma.thyronixRulesProfile.update({
    where: { id },
    data,
    include: { _count: { select: { sources: true } } },
  });
  return toDto(updated);
}

export async function createSourceRulesProfile(
  dealerId: string,
  name: string,
  fromGlobal = true,
): Promise<RulesProfileDto> {
  const base = fromGlobal ? await ensureDefaultGlobalProfile(dealerId) : null;
  const defaults = base ? profileToRulesBundle(base) : defaultRulesBundle();
  const created = await prisma.thyronixRulesProfile.create({
    data: {
      name,
      scope: "source",
      dealerId,
      tenantScope: "DEALER",
      ownerType: "DEALER",
      isDefault: false,
      priceRulesJson: JSON.stringify(defaults.price),
      stockRulesJson: JSON.stringify(defaults.stock),
      gateRulesJson: JSON.stringify(defaults.gate),
      aiRulesJson: JSON.stringify(defaults.ai),
      outputFormat: defaults.outputFormat,
    },
    include: { _count: { select: { sources: true } } },
  });
  return toDto(created);
}

export async function deleteRulesProfile(id: string, dealerId: string): Promise<void> {
  const profile = await prisma.thyronixRulesProfile.findFirst({ where: { id, dealerId } });
  if (!profile) throw new Error("NotFound");
  if (profile.isDefault && profile.scope === "global") {
    throw new Error("Varsayılan genel profil silinemez");
  }
  await prisma.thyronixSource.updateMany({
    where: { rulesProfileId: id },
    data: { rulesProfileId: null, useCustomRules: false },
  });
  await prisma.thyronixRulesProfile.delete({ where: { id } });
}

export async function previewPriceRuleImpact(
  dealerId: string,
  priceRules: ThyronixPriceRules,
  sourceId?: string | null,
): Promise<{ total: number; wouldChange: number; sample: Array<{ id: string; name: string; before: number; after: number }> }> {
  const where: Record<string, unknown> = { dealerId };
  if (sourceId) where.sourceId = sourceId;

  const products = await prisma.thyronixProduct.findMany({
    where,
    select: { id: true, name: true, price: true, costPrice: true, discountedPrice: true, metadataJson: true },
    take: 50000,
  });

  let wouldChange = 0;
  const sample: Array<{ id: string; name: string; before: number; after: number }> = [];

  for (const p of products) {
    const row = {
      price: p.price,
      costPrice: p.costPrice,
      discountedPrice: p.discountedPrice,
      metadataJson: p.metadataJson,
    };
    let base = pickPriceBase(row, priceRules);
    try {
      const meta = JSON.parse(p.metadataJson || "{}") as Record<string, unknown>;
      if (priceRules.baseField === "price" && meta._feedPrice != null) {
        base = Number(meta._feedPrice) || base;
      }
      if (priceRules.baseField === "costPrice" && meta._feedCostPrice != null) {
        base = Number(meta._feedCostPrice) || base;
      }
    } catch {
      /* ignore */
    }
    const after = applyPriceRules(base, priceRules);
    const before = Number(p.price) || 0;
    if (Math.abs(before - after) >= 0.01) {
      wouldChange++;
      if (sample.length < 10) {
        sample.push({ id: p.id, name: p.name, before, after });
      }
    }
  }

  return { total: products.length, wouldChange, sample };
}

export async function previewOutputRulesImpact(
  dealerId: string,
  bundle: Pick<ThyronixRulesBundle, "stock" | "gate">,
  sourceId?: string | null,
) {
  const where: Record<string, unknown> = { dealerId };
  if (sourceId) where.sourceId = sourceId;

  const products = await prisma.thyronixProduct.findMany({
    where,
    select: {
      sourceId: true,
      name: true,
      stock: true,
      status: true,
      image: true,
      description: true,
      barcode: true,
      category: true,
    },
    take: 50000,
  });

  const sourceIds = [...new Set(products.map((p) => p.sourceId))];
  const rulesMap = await buildRulesMapForSources(sourceIds);
  for (const id of sourceIds) {
    const current = rulesMap.get(id) || defaultRulesBundle();
    rulesMap.set(id, { ...current, stock: bundle.stock, gate: bundle.gate });
  }

  const filtered = await filterProductsForOutput(
    products as unknown as Record<string, unknown>[],
    rulesMap,
  );

  return {
    total: filtered.stats.total,
    hiddenByStock: filtered.stats.hiddenByStock,
    hiddenByGate: filtered.stats.hiddenByGate,
    included: filtered.stats.included,
    excludedSample: filtered.excludedSample,
  };
}

export async function previewAllRulesImpact(
  dealerId: string,
  patch: { price?: ThyronixPriceRules; stock?: ThyronixStockRules; gate?: ThyronixGateRules },
  sourceId?: string | null,
) {
  const global = await ensureDefaultGlobalProfile(dealerId);
  const base = profileToRulesBundle(global);
  const price = patch.price ?? base.price;
  const stock = patch.stock ?? base.stock;
  const gate = patch.gate ?? base.gate;

  const [pricePreview, outputPreview] = await Promise.all([
    previewPriceRuleImpact(dealerId, price, sourceId),
    previewOutputRulesImpact(dealerId, { stock, gate }, sourceId),
  ]);

  return { price: pricePreview, output: outputPreview };
}
