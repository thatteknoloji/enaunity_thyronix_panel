import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncDigitalAccessGrants } from "@/lib/products/digital-access";
import { getOrderStockStatus } from "@/lib/orders/order-stock-service";

type Params = { params: Promise<{ id: string }> };

function canEditOrder(status: string) {
  return ["pending", "pending_approval", "waiting_payment"].includes(status);
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, dealerId: user.dealerId! },
      include: {
        items: { include: { product: true, productCatalogItem: true } },
        statusHistory: { orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    const [digitalDeliveries, warehouseStatus] = await Promise.all([
      syncDigitalAccessGrants(order.id).catch(() => []),
      getOrderStockStatus(order.id).catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        digitalDeliveries,
        warehouseStatus,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const body = await req.json();
    const action = String(body.action || "");

    const order = await prisma.order.findFirst({
      where: { id, dealerId: user.dealerId! },
      select: { id: true, status: true, address: true, notes: true },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    if (action === "update") {
      if (!canEditOrder(order.status)) {
        return NextResponse.json({ success: false, error: "Bu sipariş artık düzenlenemez" }, { status: 400 });
      }
      const address = String(body.address || "").trim();
      const notes = String(body.notes || "");
      if (!address) {
        return NextResponse.json({ success: false, error: "Adres zorunlu" }, { status: 400 });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { address, notes },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: "Bayi sipariş notu / adres güncellendi",
          changedBy: "dealer",
        },
      }).catch(() => {});

      return NextResponse.json({ success: true });
    }

    if (action === "cancel") {
      if (!canEditOrder(order.status)) {
        return NextResponse.json({ success: false, error: "Bu sipariş artık iptal edilemez" }, { status: 400 });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "cancelled", fulfillmentStatus: "CANCELLED" },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "cancelled",
          note: "Bayi tarafından iptal edildi",
          changedBy: "dealer",
        },
      }).catch(() => {});

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
