import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/admin-access";
import { generateBulkAeoForBlueprints } from "@/lib/aeo/aeo-blueprint-service";
import type { AeoBulkFilters } from "@/lib/aeo/aeo-types";
import { requireAeoApiAccess } from "@/lib/aeo/aeo-api-guard";
import { getProjectDetail } from "@/lib/page-factory/project-service";

export async function POST(req: Request) {
  try {
    const access = await requireAeoApiAccess();
    if (access.error) return access.error;

    const body = await req.json();
    const projectId = body.projectId as string;
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId zorunlu" }, { status: 400 });
    }

    const project = await getProjectDetail(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Proje bulunamadı" }, { status: 404 });
    }
    if (!isAdminRole(access.user!.role) && project.dealerId && project.dealerId !== access.user!.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const filters: AeoBulkFilters = {
      generationSource: body.generationSource,
      blueprintType: body.blueprintType,
      minQualityScore: body.minQualityScore,
      minAeoScore: body.minAeoScore,
      aeoStatus: body.aeoStatus,
      limit: body.limit,
      dryRun: body.dryRun,
    };

    const data = await generateBulkAeoForBlueprints(projectId, filters);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Toplu AEO başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
