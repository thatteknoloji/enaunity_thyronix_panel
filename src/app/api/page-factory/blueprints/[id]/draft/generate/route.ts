import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import {
  assertDraftAccess,
  generateContentDraftForBlueprint,
} from "@/lib/page-factory/content-draft/content-draft-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    await assertDraftAccess(id, user!);

    const body = await req.json().catch(() => ({}));
    const result = await generateContentDraftForBlueprint(id, body.dryRun === true);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Draft oluşturma başarısız";
    const status = msg.includes("bulunamadı") ? 404 : msg.includes("erişim") ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
