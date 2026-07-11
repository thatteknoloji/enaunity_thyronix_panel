import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { getPageFactoryDashboard } from "@/lib/page-factory/project-service";
import { isAdminRole } from "@/lib/auth/admin-access";

export async function GET() {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const dealerScope = isAdminRole(user.role) ? null : user.dealerId || null;
    const data = await getPageFactoryDashboard(dealerScope);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Dashboard yüklenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
