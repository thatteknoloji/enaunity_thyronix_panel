import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import {
  assertDraftAccess,
  getPublishGateForDraft,
  previewPublishGateForDraft,
} from "@/lib/page-factory/publish-gate/publish-gate-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    await assertDraftAccess(id, user!);

    const { searchParams } = new URL(req.url);
    if (searchParams.get("preview") === "true") {
      const data = await previewPublishGateForDraft(id);
      return NextResponse.json({ success: true, data });
    }

    const gate = await getPublishGateForDraft(id);
    if (!gate) return NextResponse.json({ success: true, data: null });

    return NextResponse.json({
      success: true,
      data: {
        ...gate,
        checks: JSON.parse(gate.checksJson || "[]"),
        blockers: JSON.parse(gate.blockersJson || "[]"),
        warnings: JSON.parse(gate.warningsJson || "[]"),
        suggestions: JSON.parse(gate.suggestionsJson || "[]"),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gate alınamadı";
    const status = msg.includes("bulunamadı") ? 404 : msg.includes("erişim") ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
