import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { completeMarketplaceUploadJob, serializeMarketplaceJob } from "@/lib/product-library/marketplace-jobs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const body = await req.json();
    const success = body.success !== false && String(body.status || "").toUpperCase() !== "FAILED";
    const job = await completeMarketplaceUploadJob({
      dealerId: user.dealerId!,
      jobId: id,
      success,
      result: typeof body.result === "object" && body.result ? body.result : {},
      errorMessage: body.errorMessage,
    });
    return NextResponse.json({ success: true, data: serializeMarketplaceJob(job) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yükleme sonucu kaydedilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
