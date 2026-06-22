import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { claimMarketplaceUploadJobs, serializeMarketplaceJob } from "@/lib/product-library/marketplace-jobs";

type ClaimBody = {
  connectionId?: string;
  limit?: number;
  clientName?: string;
};

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const body = (await req.json()) as ClaimBody;
    const connectionId = String(body.connectionId || "").trim();
    if (!connectionId) {
      return NextResponse.json({ success: false, error: "Bağlantı seçimi zorunlu" }, { status: 400 });
    }

    const jobs = await claimMarketplaceUploadJobs({
      dealerId: user.dealerId!,
      connectionId,
      claimedBy: String(body.clientName || req.headers.get("user-agent") || "connector").slice(0, 120),
      limit: Number(body.limit || 10),
    });

    return NextResponse.json({
      success: true,
      data: jobs.map((job) => ({
        ...serializeMarketplaceJob(job),
        fileUrl: `/api/product-library/marketplace-jobs/${job.id}/file`,
        completeUrl: `/api/product-library/marketplace-jobs/${job.id}/complete`,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connector kuyruğu alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
