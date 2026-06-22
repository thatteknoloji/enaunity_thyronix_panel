import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import { canAccessBezosConnector } from "@/lib/thyronix/connectors/bezos-bayi-access";
import {
  getVhtFeedStatus,
  seedVhtSupplierFeeds,
} from "@/lib/thyronix/connectors/vht-seed-service";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    if (!canAccessBezosConnector(user)) {
      return NextResponse.json({ success: false, error: "Bu entegrasyon yalnızca yetkili bayi için açıktır" }, { status: 403 });
    }

    const status = getVhtFeedStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    if (!canAccessBezosConnector(user)) {
      return NextResponse.json({ success: false, error: "Bu entegrasyon yalnızca yetkili bayi için açıktır" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "seed";
    const codes = Array.isArray(body.codes) ? body.codes.map(String) : undefined;

    if (action === "seed" || action === "seed-sync") {
      const data = await seedVhtSupplierFeeds({
        sync: action === "seed-sync",
        codes,
      });
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Geçersiz action" }, { status: 400 });
  } catch (e) {
    return thyronixErrorResponse(e, e instanceof Error ? e.message : "Seed hatası");
  }
}
