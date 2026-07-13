import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/admin-access";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { bulkRunPublishGate } from "@/lib/page-factory/publish-gate/publish-gate-service";
import type { PublishGateBulkFilters } from "@/lib/page-factory/publish-gate/gate-types";

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const body = await req.json();
    const filters: PublishGateBulkFilters = {
      projectId: body.projectId,
      status: body.status,
      minPublishScore: body.minPublishScore,
      onlyWithoutGate: body.onlyWithoutGate,
      limit: body.limit,
      dryRun: body.dryRun,
    };

    const data = await bulkRunPublishGate(filters, isAdminRole(user!.role));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Toplu gate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
