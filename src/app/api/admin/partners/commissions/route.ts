import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listCommissions, updateCommissionStatus } from "@/lib/partners/affiliate";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const data = await listCommissions({ status: status || undefined }, 200);
    return NextResponse.json({
      success: true,
      data: data.map((c) => ({
        id: c.id,
        partnerId: c.partnerId,
        orderId: c.orderId,
        commissionType: c.commissionType,
        amount: c.amount,
        baseAmount: c.baseAmount,
        rate: c.rate,
        status: c.status,
        createdAt: c.createdAt,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Komisyonlar alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as { id?: string; status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID" };
    if (!body.id || !body.status) {
      return NextResponse.json({ success: false, error: "id ve status gerekli" }, { status: 400 });
    }
    const row = await updateCommissionStatus(body.id, body.status);
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncelleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
