import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const payments = await prisma.payment.findMany({
      include: {
        dealer: { select: { id: true, company: true, name: true } },
        order: { select: { id: true, total: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, data: payments });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { dealerId, orderId, amount, type, note } = await req.json();
    if (!dealerId || amount == null) {
      return NextResponse.json({ success: false, error: "Bayi ve tutar zorunlu" }, { status: 400 });
    }
    const payment = await prisma.payment.create({
      data: {
        dealerId,
        orderId: orderId || null,
        amount: parseFloat(amount),
        type: type || "payment",
        note: note || "",
      },
    });
    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
