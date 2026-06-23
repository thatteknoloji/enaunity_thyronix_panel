import { NextResponse } from "next/server";
import { previewPipeline } from "@/lib/page-factory/pipeline/page-factory-pipeline-service";
import type { PipelineFilters, PipelineMode } from "@/lib/page-factory/pipeline/pipeline-types";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

function parseFilters(body: Record<string, unknown>): PipelineFilters {
  const mode = body.mode as PipelineMode | undefined;
  return {
    projectId: body.projectId ? String(body.projectId) : undefined,
    generationSource: body.generationSource ? String(body.generationSource) : "ALL",
    blueprintType: body.blueprintType ? String(body.blueprintType) : undefined,
    minQualityScore: body.minQualityScore != null ? Number(body.minQualityScore) : undefined,
    minAeoScore: body.minAeoScore != null ? Number(body.minAeoScore) : undefined,
    onlyWithoutAeo: body.onlyWithoutAeo === true,
    onlyWithoutDraft: body.onlyWithoutDraft === true,
    onlyWithoutGate: body.onlyWithoutGate === true,
    limit: body.limit != null ? Number(body.limit) : undefined,
    dryRun: true,
    stopOnError: body.stopOnError === true,
    mode: mode && ["full", "aeo_only", "draft_only", "gate_only"].includes(mode) ? mode : "full",
  };
}

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const body = await req.json();
    const filters = parseFilters(body);
    if (!filters.projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const data = await previewPipeline(filters, {
      isAdmin: isAdminRole(user.role),
      dealerId: user.dealerId,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Pipeline preview başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
