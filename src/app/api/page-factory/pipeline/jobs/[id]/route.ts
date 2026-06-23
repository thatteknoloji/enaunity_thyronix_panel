import { NextResponse } from "next/server";
import { getPipelineJob } from "@/lib/page-factory/pipeline/page-factory-pipeline-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const job = await getPipelineJob(id, isAdminRole(user.role) ? null : user.dealerId);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job bulunamadı" }, { status: 404 });
    }

    let result = {};
    try {
      result = JSON.parse(job.resultJson || "{}");
    } catch {
      /* ignore */
    }

    return NextResponse.json({ success: true, data: { ...job, result } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Job alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
