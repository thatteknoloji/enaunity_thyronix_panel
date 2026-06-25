import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { addDealerBalance } from "@/lib/dealer-pricing";
import { sendEmail } from "@/lib/notifications";
import { getOrderStockStatus } from "@/lib/orders/order-stock-service";
import { rejectPayment } from "@/lib/payments/payment-service";

const EDITABLE_STATUSES = new Set(["pending", "pending_approval", "waiting_payment"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: { id, dealerId: user.dealerId! },
      include: {
        items: { include: { product: true, productCatalogItem: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        attachments: true,
        payments: { orderBy: { createdAt: "asc" } },
        invoices: { orderBy: { createdAt: "desc" } },
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
    const body = await _req.json().catch(() => ({}));
    const action = String(body?.action || "cancel");
    const order = await prisma.order.findFirst({
      where: { id, dealerId: user.dealerId! },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    if (!EDITABLE_STATUSES.has(order.status)) {
      return NextResponse.json({ success: false, error: "Bu sipariş artık düzenlenemez." }, { status: 400 });
    }

    if (action === "update") {
      const address = String(body?.address || "").trim();
      const notes = String(body?.notes || "").trim();
      if (!address && !notes) {
        return NextResponse.json({ success: false, error: "Güncellenecek alan yok" }, { status: 400 });
      }

      const updated = await prisma.order.update({
        where: { id },
        data: {
          ...(address ? { address } : {}),
          notes,
          statusHistory: {
            create: {
              status: order.status,
              note: "Bayi sipariş bilgilerini güncelledi",
              changedBy: "dealer",
            },
          },
        },
        include: { items: true },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (order.status === "waiting_payment") {
      const payment = await prisma.modulePayment.findFirst({
        where: {
          dealerId: user.dealerId!,
          moduleKey: "B2B_ORDER",
          planKey: id,
          status: { in: ["PENDING", "WAITING_PAYMENT", "MANUAL_REVIEW"] },
        },
      });

      if (payment) {
        await rejectPayment(payment.id);
      } else {
        await prisma.order.update({
          where: { id },
          data: { status: "cancelled" },
        });
      }
    } else {
      await prisma.order.update({
        where: { id },
        data: { status: "cancelled" },
      });
    }

    if (order.status === "pending_approval") {
      await addDealerBalance(user.dealerId!, order.total);
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

    const dealer = await prisma.dealer.findUnique({ where: { id: user.dealerId! } });
    if (dealer) {
      sendEmail({
        to: dealer.email,
        subject: "Sipariş İptal Edildi",
        html: `<h2>Merhaba ${dealer.name},</h2><p>#${id.slice(0, 8)} nolu siparişiniz iptal edildi.</p>`,
      }).catch(() => {});
    }

    // Only return stock if it was already deducted.
    if (order.status !== "pending_approval" && order.status !== "waiting_payment") {
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

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
