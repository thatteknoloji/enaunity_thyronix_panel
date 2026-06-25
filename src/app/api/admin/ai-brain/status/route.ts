import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAiBrainStatus } from "@/lib/ai-brain/ai-brain-service";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ success: true, data: getAiBrainStatus() });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
