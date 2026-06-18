import { NextResponse } from "next/server";
import { approvePayment, rejectPayment } from "@/lib/payments/payment-service";
import { logAdminActivity } from "@/lib/auth/admin-access";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action, adminNote } = body;
  const adminUserId = req.headers.get("x-user-id") || "system";

  if (action === "approve") {
    const result = await approvePayment(id);
    await logAdminActivity({ adminUserId, action: "payment_approve", targetType: "ModulePayment", targetId: id, metadataJson: JSON.stringify({ adminNote }) });
    return NextResponse.json(result);
  }
  if (action === "reject") {
    const result = await rejectPayment(id);
    await logAdminActivity({ adminUserId, action: "payment_reject", targetType: "ModulePayment", targetId: id, metadataJson: JSON.stringify({ adminNote }) });
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
}
