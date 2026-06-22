import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import {
  assertDraftAccess,
  getContentDraftForBlueprint,
  previewContentDraftForBlueprint,
} from "@/lib/page-factory/content-draft/content-draft-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    await assertDraftAccess(id, user!);

    const { searchParams } = new URL(req.url);
    if (searchParams.get("preview") === "true") {
      const payload = await previewContentDraftForBlueprint(id);
      return NextResponse.json({ success: true, data: { payload, stored: false } });
    }

    const draft = await getContentDraftForBlueprint(id);
    if (!draft) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...draft,
        sections: JSON.parse(draft.bodyJson || "[]"),
        faq: JSON.parse(draft.faqJson || "[]"),
        schemaDraft: JSON.parse(draft.schemaJson || "{}"),
        internalLinks: JSON.parse(draft.internalLinksJson || "[]"),
        source: JSON.parse(draft.sourceJson || "{}"),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Draft alınamadı";
    const status = msg.includes("bulunamadı") ? 404 : msg.includes("erişim") ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
