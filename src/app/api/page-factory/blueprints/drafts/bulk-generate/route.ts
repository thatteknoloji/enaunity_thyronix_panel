import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/admin-access";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { getProjectDetail } from "@/lib/page-factory/project-service";
import {
  generateBulkContentDrafts,
} from "@/lib/page-factory/content-draft/content-draft-service";
import type { ContentDraftBulkFilters } from "@/lib/page-factory/content-draft/draft-types";

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const body = await req.json();
    const projectId = body.projectId as string;
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId zorunlu" }, { status: 400 });
    }

    const project = await getProjectDetail(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Proje bulunamadı" }, { status: 404 });
    }
    if (!isAdminRole(user!.role) && project.dealerId && project.dealerId !== user!.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const filters: ContentDraftBulkFilters = {
      blueprintType: body.blueprintType,
      generationSource: body.generationSource,
      minAeoScore: body.minAeoScore,
      minQualityScore: body.minQualityScore,
      limit: body.limit,
      dryRun: body.dryRun,
      onlyWithoutDraft: body.onlyWithoutDraft,
    };

    const data = await generateBulkContentDrafts(projectId, filters, isAdminRole(user!.role));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Toplu draft başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
