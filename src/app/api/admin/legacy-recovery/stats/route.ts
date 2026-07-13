import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getLegacyRecoveryStats } from "@/lib/legacy-recovery/legacy-recovery-service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const stats = await getLegacyRecoveryStats(projectId || null);
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
