import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addDealerBalance } from "@/lib/dealer-pricing";
import { createNotification, sendEmail, notifyOrderStatus } from "@/lib/notifications";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { status } = await req.json();

    if (!["pending", "approved", "shipped", "delivered", "cancelled"].includes(status)) {
      return NextResponse.json({ success: false, error: "Geçersiz durum" }, { status: 400 });
    }

    const statusLabels: Record<string, string> = {
      pending_approval: "Onay Bekliyor",
      approved: "Onaylandı",
      pending: "Beklemede",
      shipped: "Kargoda",
      delivered: "Teslim Edildi",
      cancelled: "İptal",
    };

    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!currentOrder) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    // Stock deduction on approve
    if (status === "approved" && currentOrder.status === "pending_approval") {
      const stockItems = currentOrder.items.filter((item) => item.productId);
      await Promise.all(
        stockItems.map((item) =>
          prisma.stockMovement.create({
            data: {
              productId: item.productId!,
              type: "exit",
              quantity: item.quantity,
              note: `Sipariş #${id.slice(0, 8)} onaylandı`,
              orderId: id,
            },
          })
        )
      );
      await Promise.all(
        stockItems.map((item) =>
          prisma.product.update({
            where: { id: item.productId! },
            data: { stock: { decrement: item.quantity } },
          })
        )
      );
    }

    // Stock return on cancel if stock was deducted
    if (status === "cancelled" && currentOrder.status !== "pending_approval" && currentOrder.status !== "cancelled") {
      const stockItems = currentOrder.items.filter((item) => item.productId);
      await Promise.all(
        stockItems.map((item) =>
          prisma.stockMovement.create({
            data: {
              productId: item.productId!,
              type: "return",
              quantity: item.quantity,
              note: `Sipariş #${id.slice(0, 8)} iptal edildi`,
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

    // Refund dealer balance on cancel
    if (status === "cancelled" && currentOrder.dealerId && currentOrder.status !== "cancelled") {
      await addDealerBalance(currentOrder.dealerId, currentOrder.total);
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            note: `Admin tarafından "${statusLabels[status] || status}" olarak güncellendi`,
            changedBy: "admin",
          },
        },
      },
      include: { dealer: true, user: true },
    });

    const { onOrderStatusChanged } = await import("@/lib/invoices/order-invoice-bridge");
    await onOrderStatusChanged(id, status);

    if (order.dealer) {
      await notifyOrderStatus(
        order.dealer.id, id, status,
        statusLabels[status] || status,
        order.dealer.email, order.dealer.name, order.dealer.phone
      );
    }

    if (status === "delivered" || status === "shipped") {
      const { processOrderCommission } = await import("@/lib/partners/commission-service");
      await processOrderCommission(id).catch(() => {});
    }

    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
