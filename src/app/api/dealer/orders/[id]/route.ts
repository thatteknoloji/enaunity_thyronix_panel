import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { addDealerBalance } from "@/lib/dealer-pricing";
import { sendEmail } from "@/lib/notifications";
import { getOrderStockStatus } from "@/lib/orders/order-stock-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: { id, dealerId: user.dealerId! },
      include: {
        items: { include: { product: true, productCatalogItem: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }
    const warehouseStatus = await getOrderStockStatus(order.id);
    return NextResponse.json({ success: true, data: { ...order, warehouseStatus } });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: { id, dealerId: user.dealerId!, status: { in: ["pending", "pending_approval"] } },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "İptal edilebilir sipariş bulunamadı" }, { status: 400 });
    }
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "cancelled",
        statusHistory: {
          create: {
            status: "cancelled",
            note: "Bayi tarafından iptal edildi",
            changedBy: "dealer",
          },
        },
      },
      include: { items: true },
    });

    // Refund dealer balance
    await addDealerBalance(user.dealerId!, order.total);

    // Only return stock if it was deducted (approved/pending/shipped/delivered)
    if (order.status !== "pending_approval") {
      const stockItems = updated.items.filter((item) => item.productId);
      await Promise.all(
        stockItems.map((item) =>
          prisma.stockMovement.create({
            data: {
              productId: item.productId!,
              type: "return",
              quantity: item.quantity,
              note: `İptal #${id.slice(0, 8)}`,
              orderId: id,
            },
          })
        )
      );

      await Promise.all(
        stockItems.map((item) =>
          prisma.product.update({
            where: { id: item.productId! },
            data: { stock: { increment: item.quantity } },
          })
        )
      );
    }

    const dealer = await prisma.dealer.findUnique({ where: { id: user.dealerId! } });
    if (dealer) {
      sendEmail({
        to: dealer.email,
        subject: "Sipariş İptal Edildi",
        html: `<h2>Merhaba ${dealer.name},</h2><p>#${id.slice(0, 8)} nolu siparişiniz iptal edildi.</p>`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
