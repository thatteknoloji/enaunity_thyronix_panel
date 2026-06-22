import { prisma } from "@/lib/db";
import { isAdminRole, ELEVATED_ROLES } from "@/lib/auth/admin-access";
import { parseMetadata, resolveBlueprintKind } from "@/lib/aeo/aeo-utils";
import type { PageFactoryContentDraftStatus, PageFactoryPublishGateStatus } from "@prisma/client";
import type { PublishGateBulkFilters, PublishGateResult, GateDraftContext } from "./gate-types";
import { runSeoGate, seoGatePassed } from "./seo-gate";
import { runAeoGate, aeoGatePassed } from "./aeo-gate";
import { runGeoGate, geoGatePassed } from "./geo-gate";
import { runDuplicateGate, duplicateGatePassed } from "./duplicate-gate";
import { runSchemaGate, schemaGatePassed } from "./schema-gate";
import { runPolicyGate, policyGatePassed } from "./policy-gate";

export const BULK_WARN_THRESHOLD = 10_000;
export const DEFAULT_BULK_LIMIT = 100;
export const ADMIN_MAX_BULK = 500;
export const DEALER_MAX_BULK = 100;
export const SIBLING_COMPARE_LIMIT = 200;

async function loadGateContext(draftId: string): Promise<GateDraftContext> {
  const draft = await prisma.pageFactoryContentDraft.findUnique({
    where: { id: draftId },
    include: { blueprint: { include: { project: true } } },
  });
  if (!draft) throw new Error("Draft bulunamadı");

  const blueprintMetadata = parseMetadata(draft.blueprint.metadataJson);
  const aeoRaw = blueprintMetadata.aeo as Record<string, unknown> | undefined;
  const aeo = aeoRaw?.version === "AEO_LAYER_V1" ? aeoRaw : null;

  let sections: GateDraftContext["sections"] = [];
  let faq: GateDraftContext["faq"] = [];
  let schemaDraft: Record<string, unknown> = {};
  let internalLinks: GateDraftContext["internalLinks"] = [];

  try {
    sections = JSON.parse(draft.bodyJson || "[]");
  } catch {
    /* skip */
  }
  try {
    faq = JSON.parse(draft.faqJson || "[]");
  } catch {
    /* skip */
  }
  try {
    schemaDraft = JSON.parse(draft.schemaJson || "{}");
  } catch {
    /* skip */
  }
  try {
    internalLinks = JSON.parse(draft.internalLinksJson || "[]");
  } catch {
    /* skip */
  }

  const siblingDrafts = draft.projectId
    ? await prisma.pageFactoryContentDraft.findMany({
        where: { projectId: draft.projectId },
        select: { id: true, slug: true, h1: true, metaTitle: true, intro: true, bodyJson: true },
        take: SIBLING_COMPARE_LIMIT,
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return {
    draft,
    sections,
    faq,
    schemaDraft,
    internalLinks,
    blueprintMetadata,
    blueprintKind: resolveBlueprintKind(blueprintMetadata, draft.blueprint.pageType),
    aeo,
    projectCountry: draft.blueprint.project.country || "TR",
    siblingDrafts,
  };
}

function buildSuggestions(result: PublishGateResult): string[] {
  const suggestions: string[] = [];
  if (!result.passed.seo) suggestions.push("Meta title/description ve section sayısını iyileştirin.");
  if (!result.passed.aeo) suggestions.push("AEO katmanını oluşturun veya quick answer ekleyin.");
  if (!result.passed.duplicate) suggestions.push("Slug/H1/meta title benzersizliğini kontrol edin.");
  if (!result.passed.schema) suggestions.push("Schema JSON-LD alanlarını tamamlayın.");
  if (!result.passed.policy) suggestions.push("Abartılı iddiaları içerikten kaldırın.");
  if (result.warnings.length) suggestions.push("Warning maddelerini inceleyin.");
  return suggestions;
}

export function evaluatePublishGate(ctx: GateDraftContext): PublishGateResult {
  const seoChecks = runSeoGate(ctx);
  const aeoChecks = runAeoGate(ctx);
  const geoChecks = runGeoGate(ctx);
  const duplicateChecks = runDuplicateGate(ctx);
  const schemaChecks = runSchemaGate(ctx);
  const policyChecks = runPolicyGate(ctx);

  const checks = [...seoChecks, ...aeoChecks, ...geoChecks, ...duplicateChecks, ...schemaChecks, ...policyChecks];
  const blockers = checks.filter((c) => c.status === "FAIL" && c.severity === "blocker");
  const warnings = checks.filter((c) => c.status === "WARN" || (c.status === "FAIL" && c.severity === "warning"));

  const score =
    checks.length > 0
      ? Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length)
      : 0;

  let status: PublishGateResult["status"];
  if (blockers.length > 0) status = "BLOCKED";
  else if (warnings.length > 0) status = "WARNING";
  else if (score >= 80) status = "PASSED";
  else if (score >= 50) status = "NEEDS_REVIEW";
  else status = "BLOCKED";

  const result: PublishGateResult = {
    draftId: ctx.draft.id,
    blueprintId: ctx.draft.blueprintId,
    status,
    score,
    checks,
    blockers,
    warnings,
    suggestions: [],
    passed: {
      seo: seoGatePassed(seoChecks),
      aeo: aeoGatePassed(aeoChecks),
      geo: geoGatePassed(geoChecks),
      duplicate: duplicateGatePassed(duplicateChecks),
      schema: schemaGatePassed(schemaChecks),
      policy: policyGatePassed(policyChecks),
    },
  };
  result.suggestions = buildSuggestions(result);
  return result;
}

function resolveDraftStatusFromGate(
  gate: PublishGateResult,
  publishScore: number
): PageFactoryContentDraftStatus {
  if (gate.blockers.length > 0) {
    return publishScore < 50 ? "REJECTED" : "NEEDS_REVIEW";
  }
  if (gate.status === "WARNING" || gate.status === "NEEDS_REVIEW") return "NEEDS_REVIEW";
  if (gate.status === "PASSED" && gate.score >= 80 && publishScore >= 80 && !gate.blockers.length) {
    return "READY_TO_PUBLISH";
  }
  if (publishScore >= 80 && gate.score >= 80 && gate.blockers.length === 0) return "READY_TO_PUBLISH";
  if (publishScore >= 50 || gate.score >= 50) return "NEEDS_REVIEW";
  return "REJECTED";
}

function mapGateStatus(result: PublishGateResult): PageFactoryPublishGateStatus {
  if (result.status === "PASSED") return "PASSED";
  if (result.status === "WARNING") return "WARNING";
  if (result.status === "BLOCKED") return "BLOCKED";
  return "NEEDS_REVIEW";
}

export async function previewPublishGateForDraft(draftId: string): Promise<PublishGateResult> {
  const ctx = await loadGateContext(draftId);
  return evaluatePublishGate(ctx);
}

export async function runPublishGateForDraft(draftId: string, dryRun = false): Promise<PublishGateResult & { written: boolean }> {
  const ctx = await loadGateContext(draftId);
  const result = evaluatePublishGate(ctx);

  if (dryRun) return { ...result, written: false };

  const draftStatus = resolveDraftStatusFromGate(result, ctx.draft.publishScore);

  await prisma.pageFactoryPublishGate.upsert({
    where: { draftId },
    create: {
      draftId,
      blueprintId: ctx.draft.blueprintId,
      projectId: ctx.draft.projectId,
      dealerId: ctx.draft.dealerId,
      status: mapGateStatus(result),
      score: result.score,
      seoPassed: result.passed.seo,
      aeoPassed: result.passed.aeo,
      geoPassed: result.passed.geo,
      duplicatePassed: result.passed.duplicate,
      schemaPassed: result.passed.schema,
      policyPassed: result.passed.policy,
      checksJson: JSON.stringify(result.checks),
      blockersJson: JSON.stringify(result.blockers),
      warningsJson: JSON.stringify(result.warnings),
      suggestionsJson: JSON.stringify(result.suggestions),
    },
    update: {
      status: mapGateStatus(result),
      score: result.score,
      seoPassed: result.passed.seo,
      aeoPassed: result.passed.aeo,
      geoPassed: result.passed.geo,
      duplicatePassed: result.passed.duplicate,
      schemaPassed: result.passed.schema,
      policyPassed: result.passed.policy,
      checksJson: JSON.stringify(result.checks),
      blockersJson: JSON.stringify(result.blockers),
      warningsJson: JSON.stringify(result.warnings),
      suggestionsJson: JSON.stringify(result.suggestions),
    },
  });

  await prisma.pageFactoryContentDraft.update({
    where: { id: draftId },
    data: { status: draftStatus },
  });

  const bpMeta = ctx.blueprintMetadata;
  await prisma.pageFactoryBlueprint.update({
    where: { id: ctx.draft.blueprintId },
    data: {
      metadataJson: JSON.stringify({
        ...bpMeta,
        contentStatus: draftStatus,
        publishGate: {
          status: mapGateStatus(result),
          score: result.score,
          evaluatedAt: new Date().toISOString(),
        },
      }),
    },
  });

  return { ...result, written: true };
}

export async function getPublishGateForDraft(draftId: string) {
  return prisma.pageFactoryPublishGate.findUnique({ where: { draftId } });
}

export async function assertDraftAccess(
  draftId: string,
  user: { role: string; dealerId?: string | null }
) {
  const draft = await prisma.pageFactoryContentDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("Draft bulunamadı");
  if (!isAdminRole(user.role) && draft.dealerId && draft.dealerId !== user.dealerId) {
    throw new Error("Bu drafta erişim yetkiniz yok");
  }
  return draft;
}

export async function bulkRunPublishGate(
  filters: PublishGateBulkFilters,
  isAdmin = true
): Promise<{
  processed: number;
  written: number;
  skipped: number;
  dryRun: boolean;
  planWarning?: string;
  results: Array<{ draftId: string; status: string; score: number; written: boolean }>;
  errors: Array<{ draftId: string; message: string }>;
}> {
  const maxLimit = isAdmin ? ADMIN_MAX_BULK : DEALER_MAX_BULK;
  const limit = Math.min(filters.limit ?? DEFAULT_BULK_LIMIT, maxLimit);

  const where: Record<string, unknown> = {};
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.status) where.status = filters.status;
  if (filters.minPublishScore != null) where.publishScore = { gte: filters.minPublishScore };

  const totalDrafts = await prisma.pageFactoryContentDraft.count({ where });
  const planWarning =
    totalDrafts > BULK_WARN_THRESHOLD
      ? `${totalDrafts.toLocaleString("tr-TR")} draft — bulk gate dikkatli kullanın`
      : undefined;

  let draftIds: string[] = [];
  if (filters.onlyWithoutGate) {
    const drafts = await prisma.pageFactoryContentDraft.findMany({
      where,
      select: { id: true, publishGate: { select: { id: true } } },
      take: limit * 3,
      orderBy: { updatedAt: "desc" },
    });
    draftIds = drafts.filter((d) => !d.publishGate).map((d) => d.id).slice(0, limit);
  } else {
    const drafts = await prisma.pageFactoryContentDraft.findMany({
      where,
      select: { id: true },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
    draftIds = drafts.map((d) => d.id);
  }

  const out = {
    processed: 0,
    written: 0,
    skipped: 0,
    dryRun: filters.dryRun ?? false,
    planWarning,
    results: [] as Array<{ draftId: string; status: string; score: number; written: boolean }>,
    errors: [] as Array<{ draftId: string; message: string }>,
  };

  for (const id of draftIds) {
    out.processed++;
    try {
      const r = await runPublishGateForDraft(id, filters.dryRun ?? false);
      out.results.push({ draftId: id, status: r.status, score: r.score, written: r.written });
      if (r.written) out.written++;
    } catch (e) {
      out.skipped++;
      out.errors.push({ draftId: id, message: e instanceof Error ? e.message : "Hata" });
    }
  }

  return out;
}

export async function listPublishGateQueue(opts: {
  projectId?: string;
  dealerId?: string | null;
  isAdmin: boolean;
  status?: string;
  limit?: number;
  page?: number;
}) {
  const limit = Math.min(opts.limit ?? 30, 100);
  const page = Math.max(1, opts.page ?? 1);
  const where: Record<string, unknown> = {};
  if (opts.projectId) where.projectId = opts.projectId;
  if (!opts.isAdmin && opts.dealerId) where.dealerId = opts.dealerId;
  if (opts.status) where.status = opts.status;

  const [items, total] = await Promise.all([
    prisma.pageFactoryPublishGate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        draft: {
          select: {
            title: true,
            publishScore: true,
            status: true,
            blueprintId: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.pageFactoryPublishGate.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getPublishGateStats(projectId?: string) {
  const where = projectId ? { projectId } : {};
  const gates = await prisma.pageFactoryPublishGate.groupBy({
    by: ["status"],
    where,
    _count: true,
  });
  const totalDrafts = await prisma.pageFactoryContentDraft.count({ where });
  const draftStatuses = await prisma.pageFactoryContentDraft.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  return {
    totalDrafts,
    gatePassed: gates.find((g) => g.status === "PASSED")?._count ?? 0,
    gateWarning: gates.find((g) => g.status === "WARNING")?._count ?? 0,
    gateBlocked: gates.find((g) => g.status === "BLOCKED")?._count ?? 0,
    gateNeedsReview: gates.find((g) => g.status === "NEEDS_REVIEW")?._count ?? 0,
    readyToPublish: draftStatuses.find((d) => d.status === "READY_TO_PUBLISH")?._count ?? 0,
    rejected: draftStatuses.find((d) => d.status === "REJECTED")?._count ?? 0,
    needsReview: draftStatuses.find((d) => d.status === "NEEDS_REVIEW")?._count ?? 0,
    withoutGate: totalDrafts - (gates.reduce((s, g) => s + g._count, 0)),
  };
}

export async function reviewPublishGate(
  gateId: string,
  action: "approve" | "reject" | "needs_review",
  note: string,
  reviewerId: string,
  userRole: string
) {
  if (!isAdminRole(userRole)) {
    throw new Error("Review action sadece admin içindir");
  }

  const gate = await prisma.pageFactoryPublishGate.findUnique({
    where: { id: gateId },
    include: { draft: true },
  });
  if (!gate) throw new Error("Gate kaydı bulunamadı");

  let draftStatus: PageFactoryContentDraftStatus;
  let gateStatus: PageFactoryPublishGateStatus;

  switch (action) {
    case "approve":
      draftStatus = "READY_TO_PUBLISH";
      gateStatus = "PASSED";
      break;
    case "reject":
      draftStatus = "REJECTED";
      gateStatus = "BLOCKED";
      break;
    case "needs_review":
    default:
      draftStatus = "NEEDS_REVIEW";
      gateStatus = "NEEDS_REVIEW";
      break;
  }

  await prisma.pageFactoryPublishGate.update({
    where: { id: gateId },
    data: {
      status: gateStatus,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  });

  await prisma.pageFactoryContentDraft.update({
    where: { id: gate.draftId },
    data: { status: draftStatus },
  });

  const bp = await prisma.pageFactoryBlueprint.findUnique({ where: { id: gate.blueprintId } });
  if (bp) {
    const meta = parseMetadata(bp.metadataJson);
    await prisma.pageFactoryBlueprint.update({
      where: { id: gate.blueprintId },
      data: {
        metadataJson: JSON.stringify({
          ...meta,
          contentStatus: draftStatus,
          publishGate: { status: gateStatus, reviewedAt: new Date().toISOString(), reviewNote: note },
        }),
      },
    });
  }

  return { gateId, draftId: gate.draftId, draftStatus, gateStatus };
}

export function canReviewPublishGate(role: string): boolean {
  return isAdminRole(role) || ELEVATED_ROLES.includes(role as typeof ELEVATED_ROLES[number]);
}
