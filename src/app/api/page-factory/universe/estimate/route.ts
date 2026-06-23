import { NextResponse } from "next/server";
import { previewUniverseGeneration } from "@/lib/page-factory/universe/universe-generator-service";
import type { UniverseGenerationMode, UniverseSourceType } from "@/lib/page-factory/universe/universe-types";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

function parseFilters(body: Record<string, unknown>) {
  const mode = body.mode as UniverseGenerationMode | undefined;
  return {
    projectId: String(body.projectId || ""),
    sourceType: (body.sourceType ? String(body.sourceType) : "ALL") as UniverseSourceType,
    productIds: Array.isArray(body.productIds) ? body.productIds.map(String) : undefined,
    minQualityScore: body.minQualityScore != null ? Number(body.minQualityScore) : 0,
    limit: body.limit != null ? Number(body.limit) : undefined,
    includeGeo: body.includeGeo !== false,
    mode: mode && ["full", "geo_only", "faq_only", "selected"].includes(mode) ? mode : "full",
    dryRun: true,
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

    const data = await previewUniverseGeneration(filters, {
      isAdmin: isAdminRole(user.role),
      dealerId: user.dealerId,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Universe estimate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
