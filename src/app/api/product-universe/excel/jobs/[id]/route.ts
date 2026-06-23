import { NextResponse } from "next/server";
import { getImportJob } from "@/lib/product-universe/import-service";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { id } = await params;
    const job = await getImportJob(id, guard.isAdmin ? undefined : guard.dealerId);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: job });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Job detayı alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
