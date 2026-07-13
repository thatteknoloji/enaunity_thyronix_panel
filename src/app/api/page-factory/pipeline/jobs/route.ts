import { NextResponse } from "next/server";
import { getPipelineJobs } from "@/lib/page-factory/pipeline/page-factory-pipeline-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

export async function GET(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") || "20", 10) || 20;

    const data = await getPipelineJobs({
      dealerId: isAdminRole(user.role) ? undefined : user.dealerId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Job listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
