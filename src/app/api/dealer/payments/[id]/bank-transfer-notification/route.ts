import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dealerId = req.headers.get("x-dealer-id") || "";
  const body = await req.json();
  const { senderName, bankName, amount, receiptUrl, note } = body;

  const payment = await prisma.modulePayment.findUnique({ where: { id } });
  if (!payment || payment.dealerId !== dealerId) return NextResponse.json({ error: "Ödeme bulunamadı" }, { status: 404 });

  await prisma.modulePayment.update({ where: { id }, data: { status: "MANUAL_REVIEW", invoiceUrl: receiptUrl || undefined } });
  await prisma.bankTransferNotification.create({
    data: { dealerId, modulePaymentId: id, senderName: senderName || "", bankName: bankName || "", amount: amount || payment.amount, receiptUrl: receiptUrl || "", note: note || "" },
  });

  return NextResponse.json({ success: true, message: "Dekont bildirimi alındı, admin onayı bekleniyor." });
}
