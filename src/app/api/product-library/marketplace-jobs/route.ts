import { NextResponse } from "next/server";
import { requireAdmin, requireDealer } from "@/lib/auth";
import {
  createMarketplaceUploadJob,
  listAdminMarketplaceJobs,
  listDealerMarketplaceJobs,
  serializeMarketplaceJob,
} from "@/lib/product-library/marketplace-jobs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope");
    const limit = Number(url.searchParams.get("limit") || 50);

    if (scope === "admin") {
      await requireAdmin();
      const jobs = await listAdminMarketplaceJobs(limit);
      return NextResponse.json({
        success: true,
        data: jobs.map(serializeMarketplaceJob),
      });
    }

    const user = await requireDealer();
    const jobs = await listDealerMarketplaceJobs(user.dealerId!, limit);
    return NextResponse.json({
      success: true,
      data: jobs.map(serializeMarketplaceJob),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yükleme işleri alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDealer();
    const body = await req.json();
    const packageId = String(body.packageId || "").trim();
    if (!packageId) {
      return NextResponse.json({ success: false, error: "Paket seçimi zorunlu" }, { status: 400 });
    }

    const job = await createMarketplaceUploadJob({
      dealerId: user.dealerId!,
      userId: user.id,
      packageId,
      recipeId: String(body.recipeId || "").trim() || undefined,
      connectionId: String(body.connectionId || "").trim() || undefined,
      format: String(body.format || "").trim() || undefined,
    });

    return NextResponse.json({ success: true, data: serializeMarketplaceJob(job) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yükleme işi oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
