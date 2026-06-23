import { NextResponse } from "next/server";
import { getBlueprintBatchJob } from "@/lib/product-universe/blueprint-batch-engine";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { id } = await params;
    const job = await getBlueprintBatchJob(id, guard.isAdmin ? null : guard.dealerId);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job bulunamadı" }, { status: 404 });
    }

    let result = {};
    try {
      result = JSON.parse(job.resultJson || "{}");
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      success: true,
      data: { ...job, result },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Job alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
