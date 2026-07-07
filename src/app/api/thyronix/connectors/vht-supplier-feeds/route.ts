import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import { canAccessBezosConnector } from "@/lib/thyronix/connectors/bezos-bayi-access";
import {
  getVhtFeedStatus,
  seedErsaGuduPackage,
  seedVhtSupplierFeeds,
} from "@/lib/thyronix/connectors/vht-seed-service";
import type { VhtFeedBundle } from "@/lib/thyronix/connectors/vht-supplier-feeds";

function parseBundle(value: unknown): VhtFeedBundle | undefined {
  if (value === "ersa" || value === "all") return value;
  return undefined;
}

export async function GET(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    if (!canAccessBezosConnector(user)) {
      return NextResponse.json({ success: false, error: "Bu entegrasyon yalnızca yetkili bayi için açıktır" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const bundle = parseBundle(searchParams.get("bundle"));
    const status = getVhtFeedStatus({ bundle });
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
    const bundle = parseBundle(body.bundle);

    if (action === "seed" || action === "seed-sync") {
      const data = await seedVhtSupplierFeeds({
        sync: action === "seed-sync",
        codes,
        bundle,
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === "seed-ersa" || action === "seed-ersa-sync") {
      const data = await seedErsaGuduPackage({ sync: action === "seed-ersa-sync" });
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Geçersiz action" }, { status: 400 });
  } catch (e) {
    return thyronixErrorResponse(e, e instanceof Error ? e.message : "Seed hatası");
  }
}
