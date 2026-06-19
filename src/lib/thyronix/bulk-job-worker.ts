import { prisma } from "@/lib/db";
import type { User } from "@/types";
import { buildThyronixProductWhere, type ThyronixProductFilters } from "./product-query";

export const BULK_INLINE_LIMIT = 500;
export const BULK_BATCH_SIZE = 100;

export type BulkScope = "ids" | "filter" | "catalog";

export type BulkParams = {
  action: string;
  value?: string;
  type?: string;
  mode?: string;
  category?: string;
  brand?: string;
};

async function applyBulkToIds(ids: string[], params: BulkParams): Promise<number> {
  const { action, value, type, mode, category, brand } = params;
  let updated = 0;

  switch (action) {
    case "price": {
      const val = parseFloat(value || "");
      if (isNaN(val)) throw new Error("Geçerli bir değer girin");
      if (mode === "replace") {
        const r = await prisma.thyronixProduct.updateMany({
          where: { id: { in: ids } },
          data: { price: Math.max(0, val) },
        });
        return r.count;
      }
      for (const id of ids) {
        const product = await prisma.thyronixProduct.findUnique({ where: { id } });
        if (!product) continue;
        let newPrice: number;
        if (type === "percentage") {
          newPrice = mode === "increase" ? product.price * (1 + val / 100) : product.price * (1 - val / 100);
        } else {
          newPrice = mode === "increase" ? product.price + val : Math.max(0, product.price - val);
        }
        await prisma.thyronixProduct.update({
          where: { id },
          data: { price: Math.max(0, parseFloat(newPrice.toFixed(2))) },
        });
        updated++;
      }
      return updated;
    }
    case "stock": {
      const val = parseInt(value || "");
      if (isNaN(val)) throw new Error("Geçerli bir stok değeri girin");
      if (mode === "replace") {
        const r = await prisma.thyronixProduct.updateMany({ where: { id: { in: ids } }, data: { stock: val } });
        return r.count;
      }
      for (const id of ids) {
        const product = await prisma.thyronixProduct.findUnique({ where: { id } });
        if (!product) continue;
        const newStock = mode === "increase" ? product.stock + val : Math.max(0, product.stock - val);
        await prisma.thyronixProduct.update({ where: { id }, data: { stock: newStock } });
        updated++;
      }
      return updated;
    }
    case "category": {
      if (!category) throw new Error("Kategori adı girin");
      const r = await prisma.thyronixProduct.updateMany({ where: { id: { in: ids } }, data: { category } });
      return r.count;
    }
    case "brand": {
      if (!brand) throw new Error("Marka adı girin");
      const r = await prisma.thyronixProduct.updateMany({ where: { id: { in: ids } }, data: { brand } });
      return r.count;
    }
    case "delete": {
      const r = await prisma.thyronixProduct.deleteMany({ where: { id: { in: ids } } });
      return r.count;
    }
    default:
      throw new Error("Geçersiz işlem: " + action);
  }
}

export async function resolveBulkProductIds(
  user: User,
  scope: BulkScope,
  ids: string[] | undefined,
  filters: ThyronixProductFilters,
): Promise<string[]> {
  if (scope === "ids") {
    if (!ids?.length) throw new Error("Ürün ID listesi gerekli");
    const allowed = await prisma.thyronixProduct.findMany({
      where: { ...(await buildThyronixProductWhere(user, {})), id: { in: ids } },
      select: { id: true },
    });
    return allowed.map((p) => p.id);
  }
  const where = scope === "catalog"
    ? await buildThyronixProductWhere(user, {})
    : await buildThyronixProductWhere(user, filters);
  const rows = await prisma.thyronixProduct.findMany({ where, select: { id: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => r.id);
}

export async function runThyronixBulkJob(jobId: string, maxBatches = 5) {
  const job = await prisma.thyronixBulkJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "completed" || job.status === "cancelled") {
    return job;
  }

  await prisma.thyronixBulkJob.update({ where: { id: jobId }, data: { status: "running" } });

  const allIds: string[] = JSON.parse(job.productIdsJson || "[]");
  const params: BulkParams = JSON.parse(job.paramsJson || "{}");
  let offset = job.processedCount;
  let failed = job.failedCount;

  try {
    for (let b = 0; b < maxBatches; b++) {
      const batch = allIds.slice(offset, offset + BULK_BATCH_SIZE);
      if (batch.length === 0) break;
      try {
        await applyBulkToIds(batch, params);
        offset += batch.length;
      } catch (e) {
        failed += batch.length;
        await prisma.thyronixBulkJob.update({
          where: { id: jobId },
          data: { lastError: e instanceof Error ? e.message : "Batch hatası", failedCount: failed },
        });
        offset += batch.length;
      }
      await prisma.thyronixBulkJob.update({
        where: { id: jobId },
        data: { processedCount: offset, updatedAt: new Date() },
      });
      if (offset >= allIds.length) break;
    }

    const done = offset >= allIds.length;
    return prisma.thyronixBulkJob.update({
      where: { id: jobId },
      data: {
        status: done ? "completed" : "running",
        processedCount: offset,
        failedCount: failed,
      },
    });
  } catch (e) {
    return prisma.thyronixBulkJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        lastError: e instanceof Error ? e.message : "Job hatası",
        processedCount: offset,
        failedCount: failed,
      },
    });
  }
}

export async function createThyronixBulkJob(input: {
  user: User;
  scope: BulkScope;
  ids?: string[];
  filters: ThyronixProductFilters;
  params: BulkParams;
}) {
  const productIds = await resolveBulkProductIds(input.user, input.scope, input.ids, input.filters);
  if (productIds.length === 0) throw new Error("Eşleşen ürün bulunamadı");

  if (productIds.length <= BULK_INLINE_LIMIT) {
    const updated = await applyBulkToIds(productIds, input.params);
    return {
      inline: true,
      updated,
      total: productIds.length,
      remaining: 0,
      jobId: null as string | null,
    };
  }

  const job = await prisma.thyronixBulkJob.create({
    data: {
      tenantDealerId: input.user.dealerId || "",
      userId: input.user.id || "",
      action: input.params.action,
      scope: input.scope,
      filtersJson: JSON.stringify(input.filters),
      paramsJson: JSON.stringify(input.params),
      productIdsJson: JSON.stringify(productIds),
      totalCount: productIds.length,
      status: "pending",
    },
  });

  await runThyronixBulkJob(job.id, 3);

  const refreshed = await prisma.thyronixBulkJob.findUnique({ where: { id: job.id } });
  return {
    inline: false,
    updated: refreshed?.processedCount || 0,
    total: productIds.length,
    remaining: productIds.length - (refreshed?.processedCount || 0),
    jobId: job.id,
    status: refreshed?.status,
    message: `${productIds.length} ürün kuyruğa alındı. İşlem arka planda devam ediyor.`,
  };
}

export { applyBulkToIds };
