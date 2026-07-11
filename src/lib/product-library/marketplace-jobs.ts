import { prisma } from "@/lib/db";
import { buildDealerPackageExport } from "./dealer-export";
import { readMarketplaceJobFile, saveMarketplaceJobFile } from "./marketplace-job-storage";

const MARKETPLACE_PANEL_URLS: Record<string, string> = {
  TRENDYOL: "https://partner.trendyol.com/products",
  HEPSIBURADA: "https://merchant.hepsiburada.com/product-management/products",
  N11: "https://partner.n11.com.tr/product",
  TEMU: "https://seller.temu.com/",
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function resolveMarketplacePanelUrl(platform: string) {
  return MARKETPLACE_PANEL_URLS[String(platform || "").toUpperCase()] || "";
}

export async function createMarketplaceUploadJob(params: {
  dealerId: string;
  userId?: string;
  packageId: string;
  recipeId?: string;
  connectionId?: string;
  format?: string;
}) {
  const prepared = await buildDealerPackageExport({
    dealerId: params.dealerId,
    packageId: params.packageId,
    recipeId: params.recipeId,
    format: params.format,
  });

  const connectionId = String(params.connectionId || prepared.recipe?.connectionId || "").trim();
  if (!connectionId) {
    throw new Error("Önce reçeteye bir mağaza bağlantısı seçmelisin");
  }

  const connection = await prisma.marketplaceConnection.findFirst({
    where: { id: connectionId, dealerId: params.dealerId, active: true },
    select: { id: true, platform: true, sellerId: true, storeId: true },
  });
  if (!connection) {
    throw new Error("Aktif mağaza bağlantısı bulunamadı");
  }

  const job = await prisma.productMarketplaceJob.create({
    data: {
      dealerId: params.dealerId,
      packageId: params.packageId,
      recipeId: prepared.recipe?.id || null,
      connectionId: connection.id,
      platform: connection.platform,
      storeName:
        prepared.storeName ||
        prepared.recipe?.storeName ||
        prepared.recipe?.connectionLabel ||
        connection.storeId ||
        connection.sellerId ||
        "Mağaza",
      format: prepared.format,
      targetUrl: resolveMarketplacePanelUrl(connection.platform),
      itemCount: prepared.itemCount,
      payloadJson: JSON.stringify({
        packageName: prepared.access.pkg.name,
        packageSlug: prepared.access.pkg.slug,
        recipeName: prepared.recipeName,
        exportFormats: prepared.template.exportFormats,
        createdByUserId: params.userId || "",
      }),
    },
    include: {
      package: { select: { name: true, slug: true } },
      recipe: { select: { id: true, name: true, storeName: true } },
      connection: { select: { platform: true, sellerId: true, storeId: true } },
    },
  });

  const stored = await saveMarketplaceJobFile({
    dealerId: params.dealerId,
    jobId: job.id,
    fileName: prepared.fileName,
    body: prepared.exported.body as Buffer | string,
  });

  const updated = await prisma.productMarketplaceJob.update({
    where: { id: job.id },
    data: {
      fileName: stored.fileName,
      filePath: stored.filePath,
      fileSize: stored.fileSize,
      checksum: stored.checksum,
    },
    include: {
      package: { select: { name: true, slug: true } },
      recipe: { select: { id: true, name: true, storeName: true } },
      connection: { select: { platform: true, sellerId: true, storeId: true } },
    },
  });

  return updated;
}

function includeConfig() {
  return {
    package: { select: { name: true, slug: true } },
    recipe: { select: { id: true, name: true, storeName: true } },
    connection: { select: { platform: true, sellerId: true, storeId: true } },
  } as const;
}

export async function listDealerMarketplaceJobs(dealerId: string, limit = 50) {
  return prisma.productMarketplaceJob.findMany({
    where: { dealerId },
    include: includeConfig(),
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listAdminMarketplaceJobs(limit = 200) {
  const jobs = await prisma.productMarketplaceJob.findMany({
    include: includeConfig(),
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const dealerIds = [...new Set(jobs.map((job) => job.dealerId).filter(Boolean))];
  const dealers = dealerIds.length
    ? await prisma.dealer.findMany({
        where: { id: { in: dealerIds } },
        select: { id: true, name: true, company: true, email: true },
      })
    : [];
  const dealerMap = new Map(dealers.map((dealer) => [dealer.id, dealer]));

  return jobs.map((job) => ({
    ...job,
    dealer: dealerMap.get(job.dealerId) || null,
  }));
}

export async function claimMarketplaceUploadJobs(params: {
  dealerId: string;
  connectionId: string;
  claimedBy: string;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(params.limit || 10, 50));
  const pending = await prisma.productMarketplaceJob.findMany({
    where: {
      dealerId: params.dealerId,
      connectionId: params.connectionId,
      status: "PENDING",
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const claimedIds: string[] = [];
  for (const row of pending) {
    const result = await prisma.productMarketplaceJob.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: {
        status: "PROCESSING",
        claimedBy: params.claimedBy,
        claimedAt: new Date(),
        errorMessage: "",
      },
    });
    if (result.count > 0) claimedIds.push(row.id);
  }

  if (!claimedIds.length) return [];
  return prisma.productMarketplaceJob.findMany({
    where: { id: { in: claimedIds } },
    include: includeConfig(),
    orderBy: { createdAt: "asc" },
  });
}

export async function completeMarketplaceUploadJob(params: {
  dealerId: string;
  jobId: string;
  success: boolean;
  result?: Record<string, unknown>;
  errorMessage?: string;
}) {
  const job = await prisma.productMarketplaceJob.findFirst({
    where: { id: params.jobId, dealerId: params.dealerId },
  });
  if (!job) {
    throw new Error("Yükleme işi bulunamadı");
  }

  return prisma.productMarketplaceJob.update({
    where: { id: params.jobId },
    data: {
      status: params.success ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      resultJson: JSON.stringify(params.result || {}),
      errorMessage: params.success ? "" : String(params.errorMessage || "Connector yüklemeyi tamamlayamadı"),
    },
    include: includeConfig(),
  });
}

export async function loadMarketplaceJobFile(jobId: string, dealerId?: string) {
  const job = await prisma.productMarketplaceJob.findFirst({
    where: {
      id: jobId,
      ...(dealerId ? { dealerId } : {}),
    },
  });
  if (!job) {
    throw new Error("Dosya bulunamadı");
  }
  if (!job.filePath) {
    throw new Error("Dosya henüz hazır değil");
  }
  const file = await readMarketplaceJobFile(job.filePath);
  return { job, file };
}

export function serializeMarketplaceJob(job: any) {
  return {
    ...job,
    payload: parseJson(job.payloadJson, {}),
    result: parseJson(job.resultJson, {}),
  };
}
