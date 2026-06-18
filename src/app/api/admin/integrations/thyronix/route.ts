import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getThyronixIntegrationStats } from "@/lib/thyronix/integration";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getThyronixIntegrationStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sunucu hatası";
    const status = message.includes("Yetkisiz") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
