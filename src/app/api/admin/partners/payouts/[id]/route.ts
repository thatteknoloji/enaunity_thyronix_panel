import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { updatePartnerPayoutAdmin } from "@/lib/partners/payout-service";
import type { PayoutStatus } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as {
      status?: PayoutStatus;
      adminNote?: string;
    };

    if (!body.status && body.adminNote === undefined) {
      return NextResponse.json({ success: false, error: "status veya adminNote gerekli" }, { status: 400 });
    }

    const row = await updatePartnerPayoutAdmin({
      id,
      status: body.status,
      adminNote: body.adminNote,
    });

    await logAdminAction(
      admin.id,
      admin.name,
      "partner_payout_update",
      id,
      body.status || "note_update"
    );

    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncelleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
