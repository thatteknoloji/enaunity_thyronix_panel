import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getOperationsDashboard } from "@/lib/content-operations/content-pipeline-service";

export async function GET() {
  try {
    await requireAdmin();
    const dashboard = await getOperationsDashboard();
    return NextResponse.json({ success: true, data: dashboard });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
