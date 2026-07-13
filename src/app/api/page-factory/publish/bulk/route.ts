import { NextResponse } from "next/server";
import { bulkPublishDrafts } from "@/lib/page-factory/publish/page-publish-service";
import type { PublishBulkFilters } from "@/lib/page-factory/publish/publish-types";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

function parseFilters(body: Record<string, unknown>): PublishBulkFilters {
  return {
    projectId: body.projectId ? String(body.projectId) : undefined,
    generationSource: body.generationSource ? String(body.generationSource) : undefined,
    blueprintType: body.blueprintType ? String(body.blueprintType) : undefined,
    minPublishScore: body.minPublishScore != null ? Number(body.minPublishScore) : undefined,
    limit: body.limit != null ? Number(body.limit) : undefined,
    stopOnError: body.stopOnError === true,
  };
}

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const body = await req.json();
    const filters = parseFilters(body);

    const data = await bulkPublishDrafts(filters, {
      isAdmin: isAdminRole(user.role),
      dealerId: user.dealerId,
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Toplu yayın başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
