import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/admin-access";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { listContentDrafts } from "@/lib/page-factory/content-draft/content-draft-service";

export async function GET(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const isAdmin = isAdminRole(user!.role);

    const data = await listContentDrafts({
      projectId: searchParams.get("projectId") || undefined,
      dealerId: isAdmin ? null : user!.dealerId,
      isAdmin,
      status: searchParams.get("status") || undefined,
      limit: Number(searchParams.get("limit") || 30),
      page: Number(searchParams.get("page") || 1),
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Draft listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
