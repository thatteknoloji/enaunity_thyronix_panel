import { prisma } from "@/lib/db";
import type { ThyronixOwnerType, ThyronixTenantScope } from "./tenant-access";
import {
  buildMergedUpdate,
  snapshotThyronixProduct,
  type ThyronixProductSnapshot,
} from "./field-lock";

export type ThyronixIncomingRow = ThyronixProductSnapshot & {
  sourceId: string;
  metadataJson?: string;
};

export type SyncDiffSample = {
  id: string;
  name: string;
  externalId?: string;
  before?: number;
  after?: number;
};

export type MergeSourceProductsResult = {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  missingFromSource: number;
  createdExternalIds: string[];
  priceChanged: number;
  stockChanged: number;
  diff: {
    newSamples: SyncDiffSample[];
    missingSamples: SyncDiffSample[];
    priceSamples: SyncDiffSample[];
    stockSamples: SyncDiffSample[];
  };
};

type MergeContext = {
  dealerId?: string | null;
  tenantScope?: ThyronixTenantScope | string | null;
  ownerType?: ThyronixOwnerType | string | null;
};

function rowToIncoming(row: Record<string, unknown>): ThyronixIncomingRow {
  const snap = snapshotThyronixProduct(row);
  return {
    ...snap,
    sourceId: String(row.sourceId),
    metadataJson: row.metadataJson != null ? String(row.metadataJson) : "{}",
  };
}

function findExistingId(
  incoming: ThyronixIncomingRow,
  byExternalId: Map<string, string>,
  byBarcode: Map<string, string>,
  byStockCode: Map<string, string>,
  byModelCode: Map<string, string>,
): string | undefined {
  if (incoming.externalId && byExternalId.has(incoming.externalId)) {
    return byExternalId.get(incoming.externalId);
  }
  if (incoming.barcode && byBarcode.has(incoming.barcode)) {
    return byBarcode.get(incoming.barcode);
  }
  if (incoming.stockCode && byStockCode.has(incoming.stockCode)) {
    return byStockCode.get(incoming.stockCode);
  }
  if (incoming.modelCode && byModelCode.has(incoming.modelCode)) {
    return byModelCode.get(incoming.modelCode);
  }
  return undefined;
}

export async function mergeSourceProducts(
  sourceId: string,
  incomingRows: Record<string, unknown>[],
  ctx: MergeContext = {},
): Promise<MergeSourceProductsResult> {
  const existingProducts = await prisma.thyronixProduct.findMany({ where: { sourceId } });

  const byExternalId = new Map<string, string>();
  const byBarcode = new Map<string, string>();
  const byStockCode = new Map<string, string>();
  const byModelCode = new Map<string, string>();
  const existingById = new Map<string, (typeof existingProducts)[0]>();

  for (const p of existingProducts) {
    existingById.set(p.id, p);
    if (p.externalId) byExternalId.set(p.externalId, p.id);
    if (p.barcode) byBarcode.set(p.barcode, p.id);
    if (p.stockCode) byStockCode.set(p.stockCode, p.id);
    if (p.modelCode) byModelCode.set(p.modelCode, p.id);
  }

  const seenIds = new Set<string>();
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  const creates: Record<string, unknown>[] = [];
  const updates: { id: string; data: Record<string, unknown> }[] = [];
  const createdExternalIds: string[] = [];
  const newSamples: SyncDiffSample[] = [];
  let priceChanged = 0;
  let stockChanged = 0;
  const priceSamples: SyncDiffSample[] = [];
  const stockSamples: SyncDiffSample[] = [];

  for (const raw of incomingRows) {
    const incoming = rowToIncoming({ ...raw, sourceId });
    const existingId = findExistingId(incoming, byExternalId, byBarcode, byStockCode, byModelCode);

    if (!existingId) {
      creates.push({
        ...incoming,
        metadataJson: incoming.metadataJson ?? "{}",
        lockedFields: null,
        dealerId: ctx.dealerId ?? null,
        tenantScope: ctx.tenantScope ?? "GLOBAL",
        ownerType: ctx.ownerType ?? "ADMIN",
        status: incoming.status || "active",
      });
      if (incoming.externalId) createdExternalIds.push(incoming.externalId);
      if (newSamples.length < 8) {
        newSamples.push({
          id: "",
          name: incoming.name,
          externalId: incoming.externalId,
        });
      }
      created++;
      continue;
    }

    seenIds.add(existingId);
    const existing = existingById.get(existingId)!;
    const snap = snapshotThyronixProduct(existing as unknown as Record<string, unknown>);
    const { update, changed } = buildMergedUpdate(
      { ...snap, lockedFields: existing.lockedFields, status: existing.status },
      incoming,
    );

    if (!changed) {
      unchanged++;
      continue;
    }

    if (update.price != null && Number(update.price) !== Number(snap.price)) {
      priceChanged++;
      if (priceSamples.length < 8) {
        priceSamples.push({
          id: existingId,
          name: snap.name,
          before: Number(snap.price),
          after: Number(update.price),
        });
      }
    }
    if (update.stock != null && Number(update.stock) !== Number(snap.stock)) {
      stockChanged++;
      if (stockSamples.length < 8) {
        stockSamples.push({
          id: existingId,
          name: snap.name,
          before: Number(snap.stock),
          after: Number(update.stock),
        });
      }
    }

    updates.push({ id: existingId, data: update });
    updated++;
  }

  const BATCH = 500;
  for (let i = 0; i < creates.length; i += BATCH) {
    await prisma.thyronixProduct.createMany({ data: creates.slice(i, i + BATCH) as never });
  }
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map((u) => prisma.thyronixProduct.update({ where: { id: u.id }, data: u.data })));
  }

  let missingFromSource = 0;
  const missingSamples: SyncDiffSample[] = [];
  const missingUpdates: { id: string; data: Record<string, unknown> }[] = [];
  for (const p of existingProducts) {
    if (seenIds.has(p.id)) continue;
    if (p.status === "missing_from_source" && p.stock === 0) continue;
    missingUpdates.push({
      id: p.id,
      data: { stock: 0, status: "missing_from_source" },
    });
    missingFromSource++;
    if (missingSamples.length < 8) {
      missingSamples.push({ id: p.id, name: p.name, externalId: p.externalId });
    }
  }
  for (let i = 0; i < missingUpdates.length; i += BATCH) {
    const batch = missingUpdates.slice(i, i + BATCH);
    await Promise.all(batch.map((u) => prisma.thyronixProduct.update({ where: { id: u.id }, data: u.data })));
  }

  const total = incomingRows.length;
  return {
    total,
    created,
    updated,
    unchanged,
    missingFromSource,
    createdExternalIds,
    priceChanged,
    stockChanged,
    diff: { newSamples, missingSamples, priceSamples, stockSamples },
  };
}
