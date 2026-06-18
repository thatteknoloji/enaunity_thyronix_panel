import { NextResponse } from "next/server";
import { requireHiveView } from "@/lib/admin/permission-guard";
import { getHiveLicenses } from "@/lib/hive/admin";

export async function GET() {
  try {
    await requireHiveView();
    const data = await getHiveLicenses();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
