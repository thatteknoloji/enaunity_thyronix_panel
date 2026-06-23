import { NextResponse } from "next/server";
import { getUniverseJob } from "@/lib/page-factory/universe/universe-generator-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const job = await getUniverseJob(id, user.dealerId);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: job });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Universe job yüklenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
