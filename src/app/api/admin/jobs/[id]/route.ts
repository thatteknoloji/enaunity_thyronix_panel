import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getJob } from "@/lib/job-center/job-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ success: false, error: "Görev bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: job });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Detay alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
