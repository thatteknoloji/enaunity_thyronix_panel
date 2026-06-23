import { NextResponse } from "next/server";
import { publishDraftInternal } from "@/lib/page-factory/publish/page-publish-service";
import { assertDraftAccess } from "@/lib/page-factory/publish-gate/publish-gate-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    await assertDraftAccess(id, user);

    const data = await publishDraftInternal(id);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İç yayın başarısız";
    const status = msg.includes("READY_TO_PUBLISH") || msg.includes("BLOCKED") ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
