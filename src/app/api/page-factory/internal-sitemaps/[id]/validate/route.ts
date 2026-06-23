import { NextResponse } from "next/server";
import { validateInternalSitemap } from "@/lib/page-factory/publish/internal-sitemap-service";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: "Admin yetkisi gerekli" }, { status: 403 });
    }

    const { id } = await params;
    const result = await validateInternalSitemap(id);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Validate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
