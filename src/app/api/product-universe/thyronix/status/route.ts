import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getThyronixBridgeStatus } from "@/lib/product-universe/thyronix-bridge";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getThyronixBridgeStatus();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Durum alınamadı";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
