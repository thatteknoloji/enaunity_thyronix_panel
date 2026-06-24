import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { rejectBankTransferTopUp } from "@/lib/payments/balance-topup-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const note = String(body.note || "Havale doğrulanamadı");
    const topUp = await rejectBankTransferTopUp(id, admin.id, note);
    return NextResponse.json({ success: true, data: topUp });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Red başarısız";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
