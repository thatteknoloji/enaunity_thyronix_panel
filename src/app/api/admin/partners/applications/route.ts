import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { listPartnerApplications, reviewPartnerApplication } from "@/lib/partners/applications";
import { PARTNER_TYPE_LABELS, normalizePartnerType } from "@/lib/partners/types";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status") || undefined;
    const rows = await listPartnerApplications(status || undefined, 200);
    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        typeLabel: PARTNER_TYPE_LABELS[normalizePartnerType(r.requestedType)] || r.requestedType,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Başvurular alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await req.json()) as {
      id?: string;
      action?: "approve" | "reject";
      adminNote?: string;
      partnerType?: string;
    };
    if (!body.id || !body.action) {
      return NextResponse.json({ success: false, error: "id ve action gerekli" }, { status: 400 });
    }

    const row = await reviewPartnerApplication({
      id: body.id,
      action: body.action,
      adminName: admin.name,
      adminNote: body.adminNote,
      partnerType: body.partnerType,
    });

    await logAdminAction(admin.id, admin.name, "partner_application", body.id, body.action);
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
