import { prisma } from "@/lib/db";
import { parseFieldLocks } from "../field-lock";
import { applyContentRulesToRow } from "./content-apply";
import { pickPriceBase } from "./apply";
import { applyPriceRules } from "./resolver";
import {
  previewAllRulesImpact,
  type RulesProfileDto,
  updateRulesProfile,
} from "./profile-service";
import type {
  ThyronixAiRules,
  ThyronixGateRules,
  ThyronixPriceRules,
  ThyronixRulesBundle,
  ThyronixStockRules,
} from "./types";
import { defaultRulesBundle } from "./types";

export type ProposedRulesBundle = {
  name?: string;
  price: ThyronixPriceRules;
  stock: ThyronixStockRules;
  gate: ThyronixGateRules;
  ai: ThyronixAiRules;
  outputFormat?: string | null;
};

export type PendingRulesChangeDto = {
  id: string;
  profileId: string;
  status: string;
  proposed: ProposedRulesBundle;
  preview: Awaited<ReturnType<typeof previewAllRulesImpact>> | null;
  createdAt: string;
};

function parseProposed(raw: string): ProposedRulesBundle {
  const parsed = JSON.parse(raw) as ProposedRulesBundle;
  const base = defaultRulesBundle();
  return {
    price: { ...base.price, ...parsed.price },
    stock: { ...base.stock, ...parsed.stock },
    gate: { ...base.gate, ...parsed.gate },
    ai: { ...base.ai, ...parsed.ai },
    name: parsed.name,
    outputFormat: parsed.outputFormat,
  };
}

export async function getAffectedSourceIds(profileId: string, dealerId: string): Promise<string[]> {
  const profile = await prisma.thyronixRulesProfile.findFirst({
    where: { id: profileId, dealerId },
  });
  if (!profile) return [];

  if (profile.scope === "source") {
    const rows = await prisma.thyronixSource.findMany({
      where: { rulesProfileId: profileId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  const rows = await prisma.thyronixSource.findMany({
    where: { dealerId, useCustomRules: false },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function getPendingRulesChange(
  profileId: string,
  dealerId: string,
): Promise<PendingRulesChangeDto | null> {
  const row = await prisma.thyronixRulesPendingChange.findFirst({
    where: { profileId, dealerId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;

  return {
    id: row.id,
    profileId: row.profileId,
    status: row.status,
    proposed: parseProposed(row.proposedJson),
    preview: row.previewJson ? JSON.parse(row.previewJson) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function proposeRulesChange(
  profileId: string,
  dealerId: string,
  proposed: ProposedRulesBundle,
): Promise<{ pending: PendingRulesChangeDto; preview: Awaited<ReturnType<typeof previewAllRulesImpact>> }> {
  const profile = await prisma.thyronixRulesProfile.findFirst({ where: { id: profileId, dealerId } });
  if (!profile) throw new Error("NotFound");

  const preview = await previewAllRulesImpact(dealerId, {
    price: proposed.price,
    stock: proposed.stock,
    gate: proposed.gate,
  });

  await prisma.thyronixRulesPendingChange.updateMany({
    where: { profileId, dealerId, status: "pending" },
    data: { status: "cancelled" },
  });

  const created = await prisma.thyronixRulesPendingChange.create({
    data: {
      profileId,
      dealerId,
      proposedJson: JSON.stringify(proposed),
      previewJson: JSON.stringify(preview),
      status: "pending",
    },
  });

  return {
    pending: {
      id: created.id,
      profileId,
      status: "pending",
      proposed,
      preview,
      createdAt: created.createdAt.toISOString(),
    },
    preview,
  };
}

function repriceFromStoredProduct(
  product: {
    price: number;
    costPrice: number | null;
    discountedPrice: number | null;
    metadataJson: string | null;
  },
  priceRules: ThyronixPriceRules,
): number {
  const row = {
    price: product.price,
    costPrice: product.costPrice,
    discountedPrice: product.discountedPrice,
    metadataJson: product.metadataJson,
  };
  let base = pickPriceBase(row, priceRules);
  try {
    const meta = JSON.parse(product.metadataJson || "{}") as Record<string, unknown>;
    if (priceRules.baseField === "price" && meta._feedPrice != null) {
      base = Number(meta._feedPrice) || base;
    }
    if (priceRules.baseField === "costPrice" && meta._feedCostPrice != null) {
      base = Number(meta._feedCostPrice) || base;
    }
    if (priceRules.baseField === "discountedPrice" && meta._feedDiscountedPrice != null) {
      base = Number(meta._feedDiscountedPrice) || base;
    }
  } catch {
    /* ignore */
  }
  return applyPriceRules(base, priceRules);
}

export async function applyRulesToExistingProducts(
  dealerId: string,
  bundle: ThyronixRulesBundle,
  sourceIds: string[],
): Promise<{ priceUpdated: number; contentUpdated: number; scanned: number }> {
  if (!sourceIds.length) return { priceUpdated: 0, contentUpdated: 0, scanned: 0 };

  let priceUpdated = 0;
  let contentUpdated = 0;
  let scanned = 0;
  const BATCH = 500;
  let cursor: string | undefined;

  while (true) {
    const chunk = await prisma.thyronixProduct.findMany({
      where: {
        dealerId,
        sourceId: { in: sourceIds },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        brand: true,
        price: true,
        costPrice: true,
        discountedPrice: true,
        metadataJson: true,
        lockedFields: true,
      },
      orderBy: { id: "asc" },
      take: BATCH,
    });
    if (!chunk.length) break;

    for (const p of chunk) {
      scanned++;
      const locks = parseFieldLocks(p.lockedFields);
      const data: Record<string, unknown> = {};

      if (!locks.price) {
        const nextPrice = repriceFromStoredProduct(p, bundle.price);
        if (Math.abs(nextPrice - Number(p.price)) >= 0.01) {
          data.price = nextPrice;
        }
      }

      if (!locks.name || !locks.description) {
        const row = applyContentRulesToRow(
          { name: p.name, description: p.description, brand: p.brand },
          bundle.ai,
          locks,
        );
        if (!locks.name && row.name !== p.name) data.name = row.name;
        if (!locks.description && row.description !== p.description) {
          data.description = row.description;
        }
      }

      if (Object.keys(data).length) {
        await prisma.thyronixProduct.update({ where: { id: p.id }, data });
        if (data.price != null) priceUpdated++;
        if (data.name != null || data.description != null) contentUpdated++;
      }
    }

    cursor = chunk[chunk.length - 1].id;
  }

  return { priceUpdated, contentUpdated, scanned };
}

export async function approveRulesChange(
  profileId: string,
  dealerId: string,
  changeId?: string,
): Promise<{
  profile: RulesProfileDto;
  applyResult: { priceUpdated: number; contentUpdated: number; scanned: number };
}> {
  const pending = await prisma.thyronixRulesPendingChange.findFirst({
    where: {
      profileId,
      dealerId,
      status: "pending",
      ...(changeId ? { id: changeId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!pending) throw new Error("Onay bekleyen kural değişikliği yok");

  const proposed = parseProposed(pending.proposedJson);
  const profile = await updateRulesProfile(profileId, dealerId, {
    name: proposed.name,
    price: proposed.price,
    stock: proposed.stock,
    gate: proposed.gate,
    ai: proposed.ai,
    outputFormat: proposed.outputFormat,
  });

  const bundle: ThyronixRulesBundle = {
    price: proposed.price,
    stock: proposed.stock,
    gate: proposed.gate,
    ai: proposed.ai,
    outputFormat: proposed.outputFormat ?? null,
  };

  const sourceIds = await getAffectedSourceIds(profileId, dealerId);
  const applyResult = await applyRulesToExistingProducts(dealerId, bundle, sourceIds);

  await prisma.thyronixRulesPendingChange.update({
    where: { id: pending.id },
    data: { status: "applied", appliedAt: new Date() },
  });

  await prisma.thyronixSyncLog.create({
    data: {
      type: "rules-approval",
      referenceId: profile.name,
      status: "success",
      message: `Kural onayı: ${applyResult.priceUpdated} fiyat, ${applyResult.contentUpdated} içerik güncellendi (${applyResult.scanned} tarandı)`,
      productCount: applyResult.priceUpdated + applyResult.contentUpdated,
    },
  }).catch(() => null);

  return { profile, applyResult };
}

export async function cancelRulesChange(profileId: string, dealerId: string): Promise<void> {
  await prisma.thyronixRulesPendingChange.updateMany({
    where: { profileId, dealerId, status: "pending" },
    data: { status: "cancelled" },
  });
}
