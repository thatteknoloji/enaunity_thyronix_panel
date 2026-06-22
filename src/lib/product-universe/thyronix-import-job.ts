import type { ProductUniverseSourceType } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ThyronixBridgeJobMetadata = {
  bridgeType: "THYRONIX_BRIDGE_V1";
  sourceIds: string[];
  dryRun: boolean;
  minStock: number;
  onlyActiveSources: boolean;
  analyze: boolean;
  limit: number;
  sampleErrors?: string[];
  sourceSummary?: Array<{ sourceId: string; sourceName: string; processed: number }>;
  cursor?: string | null;
  hasMore?: boolean;
};

export async function createThyronixBridgeJob(opts: {
  sourceIds: string[];
  sourceNames?: string[];
  dryRun: boolean;
  minStock: number;
  onlyActiveSources: boolean;
  analyze: boolean;
  limit: number;
  totalRows: number;
  dealerId?: string | null;
}) {
  const sourceLabel =
    opts.sourceNames?.length === 1
      ? `THYRONIX:${opts.sourceNames[0]}`
      : opts.sourceNames?.length
        ? `THYRONIX:${opts.sourceNames.length}_sources`
        : opts.sourceIds.length === 1
          ? `THYRONIX:${opts.sourceIds[0]}`
          : `THYRONIX:${opts.sourceIds.length}_sources`;

  const metadata: ThyronixBridgeJobMetadata = {
    bridgeType: "THYRONIX_BRIDGE_V1",
    sourceIds: opts.sourceIds,
    dryRun: opts.dryRun,
    minStock: opts.minStock,
    onlyActiveSources: opts.onlyActiveSources,
    analyze: opts.analyze,
    limit: opts.limit,
    sampleErrors: [],
    sourceSummary: [],
  };

  return prisma.productUniverseImportJob.create({
    data: {
      dealerId: opts.dealerId || null,
      sourceType: "XML" as ProductUniverseSourceType,
      status: "RUNNING",
      fileName: sourceLabel,
      totalRows: opts.totalRows,
      metadataJson: JSON.stringify(metadata),
    },
  });
}

export async function completeThyronixBridgeJob(
  jobId: string,
  counts: {
    insertedRows: number;
    updatedRows: number;
    skippedRows: number;
    errorRows: number;
    metadata: ThyronixBridgeJobMetadata;
  },
) {
  return prisma.productUniverseImportJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      insertedRows: counts.insertedRows,
      updatedRows: counts.updatedRows,
      skippedRows: counts.skippedRows,
      errorRows: counts.errorRows,
      completedAt: new Date(),
      metadataJson: JSON.stringify(counts.metadata),
    },
  });
}

export async function failThyronixBridgeJob(jobId: string, error: string, metadata?: ThyronixBridgeJobMetadata) {
  return prisma.productUniverseImportJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      metadataJson: JSON.stringify({
        ...(metadata || {}),
        error,
      }),
    },
  });
}

export async function getLatestThyronixBridgeJob() {
  const jobs = await prisma.productUniverseImportJob.findMany({
    where: {
      metadataJson: { contains: '"bridgeType":"THYRONIX_BRIDGE_V1"' },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  return jobs[0] || null;
}
