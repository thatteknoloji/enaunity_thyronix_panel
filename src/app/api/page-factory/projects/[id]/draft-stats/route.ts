import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/admin-access";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { getProjectDraftStats } from "@/lib/page-factory/content-draft/content-draft-service";
import { getProjectDetail } from "@/lib/page-factory/project-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const project = await getProjectDetail(id);
    if (!project) {
      return NextResponse.json({ success: false, error: "Proje bulunamadı" }, { status: 404 });
    }
    if (!isAdminRole(user!.role) && project.dealerId && project.dealerId !== user!.dealerId) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const stats = await getProjectDraftStats(id);
    return NextResponse.json({ success: true, data: stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İstatistik alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
