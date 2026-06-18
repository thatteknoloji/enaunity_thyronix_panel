import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notifyTracking } from "@/lib/notifications";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { trackingNumber, carrier } = await req.json();

    const order = await prisma.order.update({
      where: { id },
      data: { trackingNumber, carrier },
      include: { dealer: true, user: true },
    });

    if (trackingNumber) {
      const label = carrier ? `${carrier} (${trackingNumber})` : trackingNumber;
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.status,
          note: `Kargo takip numarası eklendi: ${label}`,
          changedBy: "admin",
        },
      });

      if (order.dealer) {
        await notifyTracking(
          order.dealer.id, id, carrier || "Kargo", trackingNumber,
          order.dealer.email, order.dealer.name, order.dealer.phone
        );
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
