import { NextResponse } from "next/server";
import { getPublishedPageById } from "@/lib/page-factory/publish/page-publish-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id } = await params;
    const page = await getPublishedPageById(id, isAdminRole(user.role) ? null : user.dealerId);
    if (!page) {
      return NextResponse.json({ success: false, error: "Sayfa bulunamadı" }, { status: 404 });
    }

    let metadata = {};
    let sections: unknown[] = [];
    let faq: unknown[] = [];
    let schema: Record<string, unknown> = {};
    let internalLinks: unknown[] = [];
    try { metadata = JSON.parse(page.metadataJson || "{}"); } catch { /* */ }
    try { sections = JSON.parse(page.bodyJson || "[]"); } catch { /* */ }
    try { faq = JSON.parse(page.faqJson || "[]"); } catch { /* */ }
    try { schema = JSON.parse(page.schemaJson || "{}"); } catch { /* */ }
    try { internalLinks = JSON.parse(page.internalLinksJson || "[]"); } catch { /* */ }

    return NextResponse.json({
      success: true,
      data: { ...page, metadata, sections, faq, schema, internalLinks },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sayfa alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
