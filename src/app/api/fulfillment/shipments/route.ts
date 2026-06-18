import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyTracking } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const dealerId = searchParams.get("dealerId") || undefined;
    const shipments = await prisma.dealerShipment.findMany({
      where: dealerId ? { order: { dealerId } } : {},
      include: {
        order: {
          select: {
            orderNumber: true,
            dealerId: true,
            customerName: true,
            status: true,
            dealer: { select: { name: true, company: true } },
          },
        },
        coreOrder: {
          select: {
            id: true,
            orderNumber: true,
            dealerId: true,
            trackingNumber: true,
            carrier: true,
            dealer: { select: { name: true, company: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ success: true, data: shipments });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, trackingNumber, cargoCompany, status } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Shipment ID zorunlu" }, { status: 400 });
    }

    const shipment = await prisma.dealerShipment.update({
      where: { id },
      data: {
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        ...(cargoCompany !== undefined ? { cargoCompany } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
      include: {
        coreOrder: { include: { dealer: true } },
      },
    });

    if (shipment.coreOrderId && (trackingNumber || cargoCompany)) {
      await prisma.order.update({
        where: { id: shipment.coreOrderId },
        data: {
          ...(trackingNumber !== undefined ? { trackingNumber } : {}),
          ...(cargoCompany !== undefined ? { carrier: cargoCompany } : {}),
        },
      });

      if (trackingNumber && shipment.coreOrder?.dealer) {
        await notifyTracking(
          shipment.coreOrder.dealer.id,
          shipment.coreOrderId,
          cargoCompany || shipment.cargoCompany || "Kargo",
          trackingNumber,
          shipment.coreOrder.dealer.email,
          shipment.coreOrder.dealer.name,
          shipment.coreOrder.dealer.phone
        );
      }
    }

    return NextResponse.json({ success: true, data: shipment });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncelleme hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
