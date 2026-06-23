import { NextResponse } from "next/server";
import { publishDraftInternal } from "@/lib/page-factory/publish/page-publish-service";
import { setPublishedPageRobots } from "@/lib/page-factory/publish/page-index-service";
import { assertPublishedPageAccess } from "@/lib/page-factory/publish/page-publish-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    await assertPublishedPageAccess(id, user);

    if (action === "republish") {
      const page = await assertPublishedPageAccess(id, user);
      const result = await publishDraftInternal(page.draftId);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "set-robots") {
      const robots = body.robots === "noindex,follow" ? "noindex,follow" : "index,follow";
      const result = await setPublishedPageRobots(id, robots);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Geçersiz action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
