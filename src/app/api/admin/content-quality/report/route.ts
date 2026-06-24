import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAuditReport } from "@/lib/content-quality/content-quality-service";

export async function GET() {
  try {
    await requireAdmin();
    const report = await getAuditReport();
    return NextResponse.json({ success: true, data: report });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
