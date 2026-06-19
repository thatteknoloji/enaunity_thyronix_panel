import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const body = await req.json();
    const { senderName, bankName, amount, receiptUrl, note, orderId } = body;

    if (!receiptUrl?.trim()) {
      return NextResponse.json({ success: false, error: "Dekont yüklemeniz zorunludur" }, { status: 400 });
    }

    const payment = await prisma.modulePayment.findUnique({ where: { id } });
    if (payment) {
      if (payment.dealerId !== user.dealerId) {
        return NextResponse.json({ success: false, error: "Ödeme bulunamadı" }, { status: 404 });
      }
      await prisma.modulePayment.update({
        where: { id },
        data: { status: "MANUAL_REVIEW", invoiceUrl: receiptUrl },
      });
      await prisma.bankTransferNotification.create({
        data: {
          dealerId: user.dealerId!,
          modulePaymentId: id,
          orderId: orderId || "",
          senderName: senderName || "",
          bankName: bankName || "",
          amount: amount || payment.amount,
          receiptUrl,
          note: note || "",
        },
      });
      return NextResponse.json({ success: true, message: "Dekont bildirimi alındı, admin onayı bekleniyor." });
    }

    const targetOrderId = orderId || id;
    const order = await prisma.order.findUnique({ where: { id: targetOrderId } });
    if (!order || order.dealerId !== user.dealerId) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    await prisma.bankTransferNotification.create({
      data: {
        dealerId: user.dealerId!,
        modulePaymentId: "",
        orderId: targetOrderId,
        senderName: senderName || "",
        bankName: bankName || "",
        amount: amount || order.total,
        receiptUrl,
        note: note || "",
      },
    });

    return NextResponse.json({ success: true, message: "Dekont bildirimi alındı, admin onayı bekleniyor." });
  } catch {
    return NextResponse.json({ success: false, error: "Bildirim gönderilemedi" }, { status: 500 });
  }
}
