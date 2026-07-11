import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireDealer();
    const shipments = await prisma.dealerShipment.findMany({
      where: { order: { dealerId: user.dealerId! } },
      include: {
        order: {
          select: { orderNumber: true, customerName: true, status: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, data: shipments });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
