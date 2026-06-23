import { prisma } from "@/lib/db";
import { runPipeline } from "@/lib/page-factory/pipeline/page-factory-pipeline-service";
import type { PipelineRunResult } from "@/lib/page-factory/pipeline/pipeline-types";
import { PIPELINE_LIMITS } from "@/lib/page-factory/pipeline/pipeline-types";
import {
  UNIVERSE_GENERATION_SOURCE,
  UNIVERSE_LEGACY_GENERATION_SOURCE,
  type UniverseAutoPipelineOptions,
} from "./universe-types";
import { getUniverseJob } from "./universe-generator-service";

export type UniversePipelineRunResult = PipelineRunResult & {
  triggeredByUniverseJobId: string;
  processedBlueprints: number;
  gatesGenerated: number;
};

export function resolveUniversePipelineLimit(limit: number | undefined, isAdmin?: boolean): number {
  const max = isAdmin ? PIPELINE_LIMITS.adminMax : PIPELINE_LIMITS.dealerMax;
  const requested = limit ?? PIPELINE_LIMITS.defaultLimit;
  return Math.min(Math.max(1, requested), max);
}

async function countBlueprintsForUniverseJob(projectId: string, universeJobId: string): Promise<number> {
  const all = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    select: { metadataJson: true },
  });
  let count = 0;
  for (const bp of all) {
    try {
      const m = JSON.parse(bp.metadataJson || "{}") as {
        universeJobId?: string;
        createdByUniverseJobId?: string;
      };
      if (m.universeJobId === universeJobId || m.createdByUniverseJobId === universeJobId) {
        count += 1;
      }
    } catch {
      /* skip */
    }
  }
  return count;
}

export async function runPipelineForUniverseJob(
  universeJobId: string,
  options: UniverseAutoPipelineOptions,
  opts: { isAdmin?: boolean; dealerId?: string | null }
): Promise<UniversePipelineRunResult> {
  const job = await getUniverseJob(universeJobId, opts.dealerId);
  if (!job) throw new Error("Universe job bulunamadı");
  if (!job.projectId) throw new Error("Universe job projectId içermiyor");

  const blueprintCount = await countBlueprintsForUniverseJob(job.projectId, universeJobId);
  if (blueprintCount === 0) {
    throw new Error("Bu universe job için blueprint bulunamadı");
  }

  const pipelineLimit = resolveUniversePipelineLimit(options.pipelineLimit, opts.isAdmin);
  const warnings: string[] = [];

  if (blueprintCount > pipelineLimit) {
    warnings.push(
      `${blueprintCount} blueprint var — pipeline limit ${pipelineLimit} ile işlenecek`
    );
  }
  if (blueprintCount > PIPELINE_LIMITS.planOnlyThreshold) {
    warnings.push("10K+ blueprint — plan-only uyarısı");
  }

  const pipelineResult = await runPipeline(
    {
      projectId: job.projectId,
      generationSource: UNIVERSE_GENERATION_SOURCE,
      universeJobId,
      blueprintType: options.blueprintTypes?.length === 1 ? options.blueprintTypes[0] : undefined,
      blueprintTypes: options.blueprintTypes,
      limit: pipelineLimit,
      stopOnError: options.stopOnError ?? false,
      mode: "full",
      autoPublish: options.autoPublishInternal === true,
      minPublishScore: options.minPublishScore ?? 70,
      triggeredByUniverseJobId: universeJobId,
    },
    opts
  );

  const gatesGenerated =
    pipelineResult.gatePassed + pipelineResult.gateWarning + pipelineResult.gateBlocked;

  if (!options.dryRun) {
    await prisma.pageFactoryUniverseJob.update({
      where: { id: universeJobId },
      data: {
        metadataJson: JSON.stringify({
          ...parseJobMeta(job.metadataJson),
          lastPipelineJobId: pipelineResult.jobId,
          lastPipelineAt: new Date().toISOString(),
          lastPipelineResult: {
            triggeredByUniverseJobId: universeJobId,
            generatedBlueprints: blueprintCount,
            processedBlueprints: pipelineResult.processed,
            draftsGenerated: pipelineResult.draftsGenerated,
            gatesGenerated,
            pagesPublished: pipelineResult.pagesPublished,
            pagesUpdated: pipelineResult.pagesUpdated,
            errorCount: pipelineResult.errorCount,
          },
        }),
      },
    });
  }

  return {
    ...pipelineResult,
    triggeredByUniverseJobId: universeJobId,
    processedBlueprints: pipelineResult.processed,
    gatesGenerated,
    warnings: [...warnings, ...pipelineResult.warnings],
  };
}

function parseJobMeta(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function getPublishedPagesForUniverseJob(universeJobId: string, projectId: string) {
  const blueprints = await prisma.pageFactoryBlueprint.findMany({
    where: { projectId },
    select: { id: true, metadataJson: true },
  });
  const blueprintIds = blueprints
    .filter((bp) => {
      try {
        const m = JSON.parse(bp.metadataJson || "{}") as {
          universeJobId?: string;
          createdByUniverseJobId?: string;
        };
        return m.universeJobId === universeJobId || m.createdByUniverseJobId === universeJobId;
      } catch {
        return false;
      }
    })
    .map((b) => b.id);

  if (!blueprintIds.length) return [];

  return prisma.pageFactoryPublishedPage.findMany({
    where: { blueprintId: { in: blueprintIds }, status: "PUBLISHED_INTERNAL" },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export function isUniverseBlueprintMetadata(metadata: Record<string, unknown>): boolean {
  const src = String(metadata.generationSource || "");
  return (
    src === UNIVERSE_GENERATION_SOURCE ||
    src === UNIVERSE_LEGACY_GENERATION_SOURCE ||
    metadata.autoPipelineEligible === true
  );
}
