import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/admin-access";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { getContentDraftById } from "@/lib/page-factory/content-draft/content-draft-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const draft = await getContentDraftById(id);
    if (!draft) {
      return NextResponse.json({ success: false, error: "Draft bulunamadı" }, { status: 404 });
    }

    if (
      !isAdminRole(user!.role) &&
      draft.dealerId &&
      draft.dealerId !== user!.dealerId
    ) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
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
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
