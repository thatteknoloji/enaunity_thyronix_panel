import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth";
import { addDealerBalance } from "@/lib/dealer-pricing";
import { sendEmail } from "@/lib/notifications";
import { getOrderStockStatus } from "@/lib/orders/order-stock-service";
import { syncDigitalAccessGrants } from "@/lib/products/digital-access";

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
    const digitalDeliveries = await syncDigitalAccessGrants(order.id);
    return NextResponse.json({ success: true, data: { ...order, warehouseStatus, digitalDeliveries } });
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

    const updated = await prisma.$transaction(async (tx) => {
      if (order.status === "waiting_payment") {
        const payment = await tx.modulePayment.findFirst({
          where: {
            dealerId: user.dealerId!,
            moduleKey: "B2B_ORDER",
            planKey: id,
            status: { in: ["PENDING", "WAITING_PAYMENT", "MANUAL_REVIEW"] },
          },
        });

        if (payment) {
          await tx.modulePayment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          });
        }
      }

      if (order.status === "pending_approval") {
        await addDealerBalance(
          user.dealerId!,
          order.total,
          id,
          "REFUND",
          `Bayi iptal iadesi #${id.slice(0, 8)}`,
          tx
        );
      }

      const cancelledOrder = await tx.order.update({
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

      if (order.status !== "pending_approval" && order.status !== "waiting_payment") {
        const stockItems = cancelledOrder.items.filter((item) => item.productId);
        await Promise.all(
          stockItems.map((item) =>
            tx.stockMovement.create({
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
            tx.product.update({
              where: { id: item.productId! },
              data: { stock: { increment: item.quantity } },
            })
          )
        );
      }

      return cancelledOrder;
    });

    const dealer = await prisma.dealer.findUnique({ where: { id: user.dealerId! } });
    if (dealer) {
      sendEmail({
        to: dealer.email,
        subject: "Sipariş İptal Edildi",
        html: `<h2>Merhaba ${dealer.name},</h2><p>#${id.slice(0, 8)} nolu siparişiniz iptal edildi.</p>`,
      }).catch(() => {});
    }

    await syncDigitalAccessGrants(id).catch(() => {});

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
