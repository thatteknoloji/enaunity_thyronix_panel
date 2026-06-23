import { prisma } from "@/lib/db";
import type { AeoBlueprintPayload } from "@/lib/aeo/aeo-types";
import { generateAeoForBlueprint } from "@/lib/aeo/aeo-blueprint-service";
import { parseMetadata } from "@/lib/aeo/aeo-utils";
import {
  generateContentDraftForBlueprint,
  getContentDraftForBlueprint,
} from "@/lib/page-factory/content-draft/content-draft-service";
import {
  getPublishGateForDraft,
  previewPublishGateForDraft,
  runPublishGateForDraft,
} from "@/lib/page-factory/publish-gate/publish-gate-service";
import { publishDraftInternal } from "@/lib/page-factory/publish/page-publish-service";
import {
  isBlueprintPipelineEligible,
  matchesGenerationSource,
  resolveGenerationSourceFilter,
} from "./pipeline-source-filter";
import {
  PIPELINE_LIMITS,
  PIPELINE_VERSION,
  type PipelineFilters,
  type PipelineMode,
  type PipelinePreviewResult,
  type PipelineRunResult,
  resolvePipelineLimit,
} from "./pipeline-types";

type BlueprintRow = {
  id: string;
  metadataJson: string;
  projectId: string;
  pageType: string;
};

function hasAeo(metadata: Record<string, unknown>): boolean {
  const aeo = metadata.aeo as AeoBlueprintPayload | undefined;
  return aeo?.version === "AEO_LAYER_V1";
}

function matchesBlueprintFilters(
  bp: BlueprintRow,
  metadata: Record<string, unknown>,
  sourceFilter: ReturnType<typeof resolveGenerationSourceFilter>,
  filters: PipelineFilters,
  draftIds: Set<string>,
  gateBlueprintIds: Set<string>
): boolean {
  if (!isBlueprintPipelineEligible(metadata)) return false;

  if (!matchesGenerationSource(sourceFilter, metadata, bp.pageType)) return false;

  if (filters.blueprintType) {
    const kind = metadata.blueprintKind || metadata.blueprintType;
    if (kind !== filters.blueprintType) return false;
  }
  if (filters.minQualityScore != null && filters.minQualityScore > 0) {
    const qs = Number(metadata.qualityScore ?? 0);
    if (qs < filters.minQualityScore) return false;
  }
  if (filters.minAeoScore != null && filters.minAeoScore > 0) {
    const aeo = metadata.aeo as AeoBlueprintPayload | undefined;
    if ((aeo?.aeoQualityScore ?? 0) < filters.minAeoScore) return false;
  }
  if (filters.onlyWithoutAeo && hasAeo(metadata)) return false;
  if (filters.onlyWithoutDraft && draftIds.has(bp.id)) return false;
  if (filters.onlyWithoutGate && gateBlueprintIds.has(bp.id)) return false;

  return true;
}

async function loadBlueprintBatch(
  filters: PipelineFilters,
  opts: { isAdmin?: boolean; dealerId?: string | null }
): Promise<{ blueprints: BlueprintRow[]; totalCandidates: number; warnings: string[] }> {
  const warnings: string[] = [];
  if (!filters.projectId) {
    throw new Error("projectId gerekli");
  }

  const project = await prisma.pageFactoryProject.findUnique({ where: { id: filters.projectId } });
  if (!project) throw new Error("Proje bulunamadı");
  if (!opts.isAdmin && opts.dealerId && project.dealerId && project.dealerId !== opts.dealerId) {
    throw new Error("Bu projeye erişim yetkiniz yok");
  }

  const sourceFilter = resolveGenerationSourceFilter(filters.generationSource);
  const totalCandidates = await prisma.pageFactoryBlueprint.count({
    where: { projectId: filters.projectId },
  });

  if (totalCandidates > PIPELINE_LIMITS.planOnlyThreshold) {
    warnings.push(`${totalCandidates.toLocaleString("tr-TR")}+ blueprint — plan-only uyarısı`);
  }

  const limit = resolvePipelineLimit(filters.limit, opts.isAdmin);
  const fetchTake =
    sourceFilter === "ALL"
      ? Math.min(totalCandidates, Math.max(limit, 500))
      : Math.min(totalCandidates, limit * 4);

  const [all, drafts, gates] = await Promise.all([
    prisma.pageFactoryBlueprint.findMany({
      where: { projectId: filters.projectId },
      select: { id: true, metadataJson: true, projectId: true, pageType: true },
      orderBy: { createdAt: "asc" },
      take: fetchTake,
    }),
    prisma.pageFactoryContentDraft.findMany({
      where: { projectId: filters.projectId },
      select: { blueprintId: true, id: true },
    }),
    prisma.pageFactoryPublishGate.findMany({
      where: { projectId: filters.projectId },
      select: { draft: { select: { blueprintId: true } } },
    }),
  ]);

  const draftIds = new Set(drafts.map((d) => d.blueprintId));
  const gateBlueprintIds = new Set(gates.map((g) => g.draft.blueprintId));

  let matched = all
    .filter((bp) =>
      matchesBlueprintFilters(bp, parseMetadata(bp.metadataJson), sourceFilter, filters, draftIds, gateBlueprintIds)
    )
    .slice(0, limit);

  if (matched.length === 0 && totalCandidates > 0 && sourceFilter !== "ALL") {
    warnings.push(
      `Kaynak filtresi (${sourceFilter}) eşleşmedi — projectId içindeki blueprintlere fallback (${limit})`
    );
    matched = all
      .filter((bp) => isBlueprintPipelineEligible(parseMetadata(bp.metadataJson)))
      .slice(0, limit);
  }

  if (matched.length === 0 && totalCandidates > 0) {
    warnings.push("Filtre sonucu 0 — proje blueprint fallback (kalite/kaynak filtresi atlandı)");
    matched = all
      .filter((bp) => isBlueprintPipelineEligible(parseMetadata(bp.metadataJson)))
      .slice(0, limit);
  }

  if (matched.length === 0 && totalCandidates > 0) {
    const extra = await prisma.pageFactoryBlueprint.findMany({
      where: { projectId: filters.projectId },
      select: { id: true, metadataJson: true, projectId: true, pageType: true },
      orderBy: { createdAt: "asc" },
      skip: fetchTake,
      take: limit,
    });
    if (extra.length > 0) {
      warnings.push(`İlk ${fetchTake} kayıt dışında ${extra.length} blueprint fallback`);
      matched = extra;
    }
  }

  return { blueprints: matched, totalCandidates, warnings };
}

function resolveMode(filters: PipelineFilters): PipelineMode {
  return filters.mode || "full";
}

function shouldRunAeo(mode: PipelineMode, metadata: Record<string, unknown>, filters: PipelineFilters): boolean {
  if (mode === "draft_only" || mode === "gate_only") return false;
  if (filters.onlyWithoutAeo && hasAeo(metadata)) return false;
  return true;
}

function shouldRunDraft(mode: PipelineMode, filters: PipelineFilters, hasDraft: boolean): boolean {
  if (mode === "aeo_only" || mode === "gate_only") return false;
  if (filters.onlyWithoutDraft && hasDraft) return false;
  return true;
}

function shouldAutoPublish(mode: PipelineMode, filters: PipelineFilters): boolean {
  if (mode !== "full") return false;
  return filters.autoPublish !== false;
}

function shouldRunGate(mode: PipelineMode, filters: PipelineFilters, hasGate: boolean): boolean {
  if (mode === "aeo_only" || mode === "draft_only") return false;
  if (mode === "gate_only") return true;
  if (filters.onlyWithoutGate && hasGate) return false;
  return true;
}

export async function previewPipeline(
  filters: PipelineFilters,
  opts: { isAdmin?: boolean; dealerId?: string | null }
): Promise<PipelinePreviewResult> {
  const { blueprints, totalCandidates, warnings } = await loadBlueprintBatch(filters, opts);
  const mode = resolveMode(filters);
  const sourceFilter = resolveGenerationSourceFilter(filters.generationSource);

  let needsAeo = 0;
  let needsDraft = 0;
  let needsGate = 0;
  let gatePassedEstimate = 0;
  let gateWarningEstimate = 0;
  let gateBlockedEstimate = 0;
  let readyToPublishEstimate = 0;
  let publishEstimate = 0;

  const draftMap = new Map<string, string>();
  const drafts = await prisma.pageFactoryContentDraft.findMany({
    where: { projectId: filters.projectId, blueprintId: { in: blueprints.map((b) => b.id) } },
    select: { id: true, blueprintId: true },
  });
  for (const d of drafts) draftMap.set(d.blueprintId, d.id);

  const gateSet = new Set<string>();
  const gates = await prisma.pageFactoryPublishGate.findMany({
    where: { projectId: filters.projectId },
    select: { draft: { select: { blueprintId: true } } },
  });
  for (const g of gates) gateSet.add(g.draft.blueprintId);

  for (const bp of blueprints) {
    const metadata = parseMetadata(bp.metadataJson);
    const hasDraft = draftMap.has(bp.id);
    const hasGate = gateSet.has(bp.id);

    if (shouldRunAeo(mode, metadata, filters)) needsAeo++;
    if (shouldRunDraft(mode, filters, hasDraft)) needsDraft++;
    if (shouldRunGate(mode, filters, hasGate)) needsGate++;

    const draftId = draftMap.get(bp.id);
    if (draftId) {
      try {
        const gatePreview = await previewPublishGateForDraft(draftId);
        if (gatePreview.status === "PASSED") gatePassedEstimate++;
        else if (gatePreview.status === "WARNING" || gatePreview.status === "NEEDS_REVIEW") gateWarningEstimate++;
        else if (gatePreview.status === "BLOCKED") gateBlockedEstimate++;
        if (
          (gatePreview.status === "PASSED" || gatePreview.status === "WARNING") &&
          gatePreview.score >= 60
        ) {
          publishEstimate++;
        }
        if (gatePreview.status === "PASSED" && gatePreview.score >= 80) readyToPublishEstimate++;
      } catch {
        /* skip */
      }
    }
  }

  return {
    totalBlueprints: blueprints.length,
    totalCandidates,
    needsAeo,
    needsDraft,
    needsGate,
    readyToPublishEstimate,
    gatePassedEstimate,
    gateWarningEstimate,
    gateBlockedEstimate,
    publishEstimate,
    sampleBlueprintIds: blueprints.slice(0, 20).map((b) => b.id),
    warnings,
    planOnly: totalCandidates > PIPELINE_LIMITS.planOnlyThreshold,
    generationSource: sourceFilter,
  };
}

export async function runPipeline(
  filters: PipelineFilters,
  opts: { isAdmin?: boolean; dealerId?: string | null }
): Promise<PipelineRunResult> {
  const dryRun = filters.dryRun ?? false;
  const stopOnError = filters.stopOnError ?? false;
  const mode = resolveMode(filters);
  const { blueprints, warnings } = await loadBlueprintBatch(filters, opts);

  let jobId = "dry-run";
  if (!dryRun) {
    const job = await prisma.pageFactoryPipelineJob.create({
      data: {
        dealerId: opts.dealerId || null,
        projectId: filters.projectId || null,
        status: "RUNNING",
        filtersJson: JSON.stringify({ ...filters, version: PIPELINE_VERSION }),
        totalBlueprints: blueprints.length,
      },
    });
    jobId = job.id;
  }

  let processed = 0;
  let skipped = 0;
  let aeoGenerated = 0;
  let draftsGenerated = 0;
  let gatePassed = 0;
  let gateWarning = 0;
  let gateBlocked = 0;
  let pagesPublished = 0;
  let pagesUpdated = 0;
  let publishSkipped = 0;
  let errorCount = 0;
  const errors: Array<{ blueprintId: string; message: string }> = [];

  for (const bp of blueprints) {
    processed++;
    try {
      let metadata = parseMetadata(bp.metadataJson);
      const draftExisting = await getContentDraftForBlueprint(bp.id);
      const gateExisting = draftExisting ? await getPublishGateForDraft(draftExisting.id) : null;

      if (shouldRunAeo(mode, metadata, filters)) {
        const aeo = await generateAeoForBlueprint(bp.id, dryRun);
        if (!dryRun && aeo.written) aeoGenerated++;
        else if (dryRun && aeo.payload) aeoGenerated++;
        if (!dryRun) {
          const refreshed = await prisma.pageFactoryBlueprint.findUnique({
            where: { id: bp.id },
            select: { metadataJson: true },
          });
          metadata = parseMetadata(refreshed?.metadataJson || bp.metadataJson);
        }
      }

      let draftId = draftExisting?.id;
      if (shouldRunDraft(mode, filters, !!draftExisting)) {
        const draft = await generateContentDraftForBlueprint(bp.id, dryRun);
        if (!dryRun && draft.written) draftsGenerated++;
        else if (dryRun && draft.payload) draftsGenerated++;
        draftId = draft.draftId || draftExisting?.id;
      }

      if (shouldRunGate(mode, filters, !!gateExisting) && draftId) {
        const gate = await runPublishGateForDraft(draftId, dryRun);
        if (!dryRun || gate.checks?.length) {
          if (gate.status === "PASSED") gatePassed++;
          else if (gate.status === "WARNING" || gate.status === "NEEDS_REVIEW") gateWarning++;
          else if (gate.status === "BLOCKED") gateBlocked++;
        }
      }

      if (shouldAutoPublish(mode, filters) && draftId && !dryRun) {
        const draft = await prisma.pageFactoryContentDraft.findUnique({
          where: { id: draftId },
          include: { publishGate: true },
        });
        if (draft?.publishGate) {
          const gs = draft.publishGate.status;
          if (gs === "PASSED" || gs === "WARNING") {
            if (draft.status !== "READY_TO_PUBLISH" && draft.publishScore >= 70) {
              await prisma.pageFactoryContentDraft.update({
                where: { id: draftId },
                data: { status: "READY_TO_PUBLISH" },
              });
            }
            if (draft.publishScore >= 70) {
              try {
                const pub = await publishDraftInternal(draftId);
                if (pub.created) pagesPublished++;
                else if (pub.updated) pagesUpdated++;
              } catch {
                publishSkipped++;
              }
            } else {
              publishSkipped++;
            }
          } else {
            publishSkipped++;
          }
        } else {
          publishSkipped++;
        }
      }
    } catch (e) {
      errorCount++;
      errors.push({
        blueprintId: bp.id,
        message: e instanceof Error ? e.message : "Pipeline hatası",
      });
      if (stopOnError) break;
    }
  }

  skipped = Math.max(0, blueprints.length - processed + errorCount);

  const resultPayload = {
    version: PIPELINE_VERSION,
    mode,
    dryRun,
    processed,
    skipped,
    aeoGenerated,
    draftsGenerated,
    gatePassed,
    gateWarning,
    gateBlocked,
    pagesPublished,
    pagesUpdated,
    publishSkipped,
    errorCount,
    warnings,
    errors,
  };

  if (!dryRun && jobId !== "dry-run") {
    await prisma.pageFactoryPipelineJob.update({
      where: { id: jobId },
      data: {
        status: errorCount > 0 && processed === errorCount ? "FAILED" : "COMPLETED",
        aeoGenerated,
        draftsGenerated,
        gatePassed,
        gateWarning,
        gateBlocked,
        pagesPublished,
        errorCount,
        resultJson: JSON.stringify(resultPayload),
      },
    });
  }

  return {
    jobId,
    totalBlueprints: blueprints.length,
    processed,
    skipped,
    aeoGenerated,
    draftsGenerated,
    gatePassed,
    gateWarning,
    gateBlocked,
    pagesPublished,
    pagesUpdated,
    publishSkipped,
    errorCount,
    dryRun,
    warnings,
    errors,
  };
}

export async function getPipelineJobs(opts: {
  dealerId?: string | null;
  page?: number;
  limit?: number;
}) {
  const page = opts.page || 1;
  const limit = Math.min(50, opts.limit || 20);
  const where = opts.dealerId ? { dealerId: opts.dealerId } : {};

  const [items, total] = await Promise.all([
    prisma.pageFactoryPipelineJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pageFactoryPipelineJob.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPipelineJob(id: string, dealerId?: string | null) {
  const job = await prisma.pageFactoryPipelineJob.findUnique({ where: { id } });
  if (!job) return null;
  if (dealerId && job.dealerId && job.dealerId !== dealerId) return null;
  return job;
}
