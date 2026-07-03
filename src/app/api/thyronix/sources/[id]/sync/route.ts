import { NextResponse } from "next/server";
import {
  assertCanAccessSource,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";
import { syncThyronixSourceById } from "@/lib/thyronix/source-sync-runner";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessSource(user, id);
    const result = await syncThyronixSourceById(id);

    return NextResponse.json({
      success: true,
      data: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        errors: result.invalid || 0,
        feeds: result.feeds || [],
        duration: result.duration,
      },
    });
  } catch (e: any) {
    return thyronixErrorResponse(e, e.message || "Sunucu hatası");
  }
}
