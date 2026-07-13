import { NextResponse } from "next/server";
import { listImportJobs } from "@/lib/product-universe/import-service";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

/** @deprecated Backward-compatible — canonical: /api/product-universe/excel/jobs */
export async function GET(req: Request) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") || "20", 10) || 20;

    const data = await listImportJobs({
      dealerId: guard.isAdmin ? undefined : guard.dealerId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Job listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
