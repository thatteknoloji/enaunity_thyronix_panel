import { NextResponse } from "next/server";
import { listProductUniverseBlueprints } from "@/lib/product-universe/product-blueprint-bridge";
import { requireProductUniverseApiAccess } from "@/lib/product-universe/api-guard";

export async function GET(req: Request) {
  try {
    const guard = await requireProductUniverseApiAccess();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const data = await listProductUniverseBlueprints(
      searchParams,
      guard.isAdmin ? null : guard.dealerId
    );
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Blueprint listesi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
