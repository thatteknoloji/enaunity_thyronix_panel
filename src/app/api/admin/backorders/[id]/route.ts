import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function checkAdmin(user: any, perm: string): boolean {
  const raw = user?.adminRole?.permissions;
  if (!raw) return false;
  try { return hasPermission(JSON.parse(raw as string), perm as any); } catch { return false; }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmalısınız" }, { status: 401 });
    }
    if (!checkAdmin(user, "orders_approve")) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 403 });
    }

    const { id } = await params;
    const { itemId, action } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Sipariş bulunamadı" }, { status: 404 });
    }

    // Fulfill a specific backordered item
    if (action === "fulfill" && itemId) {
      const item = order.items.find(i => i.id === itemId);
      if (!item || !item.product || !item.productId) {
        return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
      }

      const product = item.product;
      const remaining = product.stock;
      const backorderQty = item.quantity - Math.min(item.quantity, product.stock);

      if (remaining <= 0) {
        return NextResponse.json({ success: false, error: "Stokta yeterli ürün yok" }, { status: 400 });
      }

      const fulfillQty = Math.min(backorderQty, remaining);

      await prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: "exit",
          quantity: fulfillQty,
          note: `Ön sipariş karşılama - Sipariş #${order.id.slice(0, 8)}`,
          orderId: order.id,
        },
      });

      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: fulfillQty } },
      });

      // Check if all backordered items are fulfilled
      const updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      const hasRemainingBackorder = updatedOrder?.items.some(i =>
        i.product && i.productId && i.product.backorderable && i.product.stock < i.quantity
      );

      if (!hasRemainingBackorder) {
        await prisma.order.update({
          where: { id },
          data: { hasBackorder: false },
        });
      }

      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.status,
          note: `${fulfillQty} adet ön sipariş karşılandı (${product.name})`,
          changedBy: "admin",
        },
      });

      return NextResponse.json({ success: true, data: { fulfilled: fulfillQty } });
    }

    return NextResponse.json({ success: false, error: "Geçersiz aksiyon" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
