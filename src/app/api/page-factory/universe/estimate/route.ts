import { NextResponse } from "next/server";
import { previewUniverseGeneration } from "@/lib/page-factory/universe/universe-generator-service";
import { parseUniverseFilters } from "@/lib/page-factory/universe/universe-api-parse";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const body = await req.json();
    const filters = parseUniverseFilters({ ...body, dryRun: true });
    if (!filters.projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const data = await previewUniverseGeneration(filters, {
      isAdmin: isAdminRole(user.role),
      dealerId: user.dealerId,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Universe estimate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
