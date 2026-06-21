import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listPayouts, updatePayoutStatus } from "@/lib/partners/affiliate";

export async function GET() {
  try {
    await requireAdmin();
    const data = await listPayouts(undefined, 200);
    return NextResponse.json({
      success: true,
      data: data.map((p) => ({
        id: p.id,
        partnerId: p.partnerId,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ödemeler alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      id?: string;
      status?: "REQUESTED" | "PROCESSING" | "PAID" | "CANCELLED";
      paymentNote?: string;
    };
    if (!body.id || !body.status) {
      return NextResponse.json({ success: false, error: "id ve status gerekli" }, { status: 400 });
    }
    const row = await updatePayoutStatus(body.id, body.status, body.paymentNote);
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncelleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
