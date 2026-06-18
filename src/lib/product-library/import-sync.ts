import { prisma } from "@/lib/db";
import type { CatalogItemInput } from "./types";
import { refreshCatalogStats } from "./catalog-stats";

export type ImportSyncReport = {
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  unchangedCount: number;
  sourceType: string;
  keys: { added: string[]; updated: string[]; removed: string[] };
};

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveCatalogItemKey(catalogId: string, item: CatalogItemInput) {
  if (item.barcode?.trim()) return `${catalogId}|barcode|${item.barcode.trim()}`;
  if (item.sku?.trim()) return `${catalogId}|sku|${item.sku.trim()}`;
  return `${catalogId}|name|${normalizeName(item.name)}`;
}

function itemData(item: CatalogItemInput, catalogId: string, supplierId: string | null) {
  return {
    catalogId,
    supplierId,
    barcode: item.barcode || "",
    sku: item.sku || "",
    name: item.name,
    brand: item.brand || "",
    category: item.category || "",
    price: item.price ?? 0,
    salePrice: item.salePrice ?? item.price ?? 0,
    stock: item.stock ?? 0,
    vatRate: item.vatRate ?? 20,
    imagesJson: item.imagesJson || "[]",
    attributesJson: item.attributesJson || "{}",
    status: "ACTIVE" as const,
  };
}

function hasChanges(
  existing: {
    barcode: string;
    sku: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    salePrice: number;
    stock: number;
    vatRate: number;
    imagesJson: string;
    attributesJson: string;
    status: string;
  },
  next: ReturnType<typeof itemData>
) {
  return (
    existing.barcode !== next.barcode ||
    existing.sku !== next.sku ||
    existing.name !== next.name ||
    existing.brand !== next.brand ||
    existing.category !== next.category ||
    existing.price !== next.price ||
    existing.salePrice !== next.salePrice ||
    existing.stock !== next.stock ||
    existing.vatRate !== next.vatRate ||
    existing.imagesJson !== next.imagesJson ||
    existing.attributesJson !== next.attributesJson ||
    existing.status !== "ACTIVE"
  );
}

export async function syncCatalogItems(params: {
  catalogId: string;
  supplierId: string | null;
  items: CatalogItemInput[];
  sourceType: string;
  deactivateMissing?: boolean;
}): Promise<ImportSyncReport> {
  const { catalogId, supplierId, items, sourceType } = params;
  const deactivateMissing = params.deactivateMissing !== false;

  const existingRows = await prisma.productCatalogItem.findMany({ where: { catalogId } });
  const existingByKey = new Map<string, (typeof existingRows)[0]>();
  for (const row of existingRows) {
    existingByKey.set(
      resolveCatalogItemKey(catalogId, { name: row.name, barcode: row.barcode, sku: row.sku }),
      row
    );
  }

  const incomingKeys = new Set<string>();
  let addedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  const added: string[] = [];
  const updated: string[] = [];

  for (const item of items) {
    const key = resolveCatalogItemKey(catalogId, item);
    incomingKeys.add(key);
    const data = itemData(item, catalogId, supplierId);
    const existing = existingByKey.get(key);

    if (!existing) {
      await prisma.productCatalogItem.create({ data });
      addedCount++;
      added.push(key);
      continue;
    }

    if (hasChanges(existing, data)) {
      await prisma.productCatalogItem.update({ where: { id: existing.id }, data });
      updatedCount++;
      updated.push(key);
    } else {
      unchangedCount++;
    }
  }

  const removed: string[] = [];
  let removedCount = 0;
  if (deactivateMissing) {
    for (const [key, row] of existingByKey) {
      if (!incomingKeys.has(key) && row.status === "ACTIVE") {
        await prisma.productCatalogItem.update({
          where: { id: row.id },
          data: { status: "INACTIVE" },
        });
        removedCount++;
        removed.push(key);
      }
    }
  }

  await refreshCatalogStats(catalogId);

  return {
    addedCount,
    updatedCount,
    removedCount,
    unchangedCount,
    sourceType,
    keys: { added, updated, removed },
  };
}

export async function saveImportJobReport(
  jobId: string,
  report: ImportSyncReport,
  productCount: number,
  durationMs: number
) {
  const reportJson = JSON.stringify(report);
  return prisma.productImportJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      productCount,
      addedCount: report.addedCount,
      updatedCount: report.updatedCount,
      removedCount: report.removedCount,
      unchangedCount: report.unchangedCount,
      reportJson,
      durationMs,
      completedAt: new Date(),
    },
  });
}
