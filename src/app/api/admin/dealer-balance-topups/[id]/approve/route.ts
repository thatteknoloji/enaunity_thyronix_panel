import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { approveBankTransferTopUp } from "@/lib/payments/balance-topup-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const topUp = await approveBankTransferTopUp(id, admin.id);
    return NextResponse.json({ success: true, data: topUp });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onay başarısız";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
