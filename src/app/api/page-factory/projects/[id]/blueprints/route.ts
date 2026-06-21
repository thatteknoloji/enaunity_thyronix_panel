import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { getProjectDetail } from "@/lib/page-factory/project-service";
import { clearProjectBlueprints, listProjectBlueprints } from "@/lib/page-factory/universe-service";
import { isAdminRole } from "@/lib/auth/admin-access";

type Params = { params: Promise<{ id: string }> };

async function assertProjectAccess(projectId: string, user: { role: string; dealerId?: string | null }) {
  const project = await getProjectDetail(projectId);
  if (!project) return { error: NextResponse.json({ success: false, error: "Proje bulunamadı" }, { status: 404 }), project: null };
  if (!isAdminRole(user.role) && project.dealerId && project.dealerId !== user.dealerId) {
    return { error: NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 }), project: null };
  }
  return { error: null, project };
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const { error: accessErr } = await assertProjectAccess(id, user);
    if (accessErr) return accessErr;

    const { searchParams } = new URL(req.url);
    const data = await listProjectBlueprints(id, searchParams);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Blueprint listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const { error: accessErr } = await assertProjectAccess(id, user);
    if (accessErr) return accessErr;

    const data = await clearProjectBlueprints(id);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Blueprintler silinemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
