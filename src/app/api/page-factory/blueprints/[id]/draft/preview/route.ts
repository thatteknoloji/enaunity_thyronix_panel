import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { assertDraftAccess, previewContentDraftForBlueprint } from "@/lib/page-factory/content-draft/content-draft-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    await assertDraftAccess(id, user!);

    const payload = await previewContentDraftForBlueprint(id);
    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Draft önizleme başarısız";
    const status = msg.includes("bulunamadı") ? 404 : msg.includes("erişim") ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
