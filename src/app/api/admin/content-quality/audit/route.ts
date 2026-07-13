import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  auditAll,
  auditBlog,
  auditPage,
  auditProduct,
  auditRecoveryPage,
  recalculateScores,
} from "@/lib/content-quality/content-quality-service";
import type { ContentQualityContentType } from "@/lib/content-quality/types";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "auditAll");

    if (action === "recalculate") {
      const data = await recalculateScores({
        contentType: body.contentType as ContentQualityContentType | undefined,
      });
      return NextResponse.json({ success: true, data });
    }

    if (body.contentType && body.contentId) {
      const type = body.contentType as ContentQualityContentType;
      let data;
      switch (type) {
        case "BLOG":
          data = await auditBlog(String(body.contentId));
          break;
        case "PAGE":
          data = await auditPage(String(body.contentId));
          break;
        case "PRODUCT":
          data = await auditProduct(String(body.contentId));
          break;
        case "RECOVERY_PAGE":
          data = await auditRecoveryPage(String(body.contentId));
          break;
        default:
          return NextResponse.json({ success: false, error: "Geçersiz contentType" }, { status: 400 });
      }
      return NextResponse.json({ success: true, data });
    }

    const data = await auditAll({ limit: body.limit ? Number(body.limit) : 500 });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Denetim başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
